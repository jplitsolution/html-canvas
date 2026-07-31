import { CampaignPageType } from '../campaigns/entities/campaign-page.entity.js';

export const VERIFICATION_MODES = [
  'HEADER_INJECTION',
  'OTP_ONLY',
  'BOTH',
  'NONE',
];

const LEGACY_MODE_ALIASES = {
  MSISDN_ONLY: 'HEADER_INJECTION',
  NULL: 'NONE',
};

const CONDITION_ALIASES = {
  HEADER_RESOLVED: ['HEADER_RESOLVED', 'MSISDN_RESOLVED'],
  HEADER_UNRESOLVED: ['HEADER_UNRESOLVED', 'MSISDN_UNRESOLVED'],
  MSISDN_RESOLVED: ['HEADER_RESOLVED', 'MSISDN_RESOLVED'],
  MSISDN_UNRESOLVED: ['HEADER_UNRESOLVED', 'MSISDN_UNRESOLVED'],
};

export const createFlowEngineService = () => {
  const parseFlowConfig = (raw) => {
    if (!raw) return null;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        return null;
      }
      return parsed;
    } catch (err) {
      console.warn(`Invalid flowConfig JSON: ${err.message}`);
      return null;
    }
  };

  const normalizeMode = (mode) => {
    if (!mode) return null;
    const upper = mode.toUpperCase();
    if (LEGACY_MODE_ALIASES[upper]) {
      return LEGACY_MODE_ALIASES[upper];
    }
    return VERIFICATION_MODES.includes(upper) ? upper : null;
  };

  const getDefaultFlowConfig = (mode = 'BOTH') => {
    const node = (pageType, x, y) => ({
      id: pageType,
      pageType,
      position: { x, y },
    });

    const edge = (source, target, condition) => ({
      id: `${source}-${condition}-${target}`,
      source,
      target,
      condition,
    });

    if (mode === 'NONE') {
      return {
        version: 1,
        entryPage: CampaignPageType.HOME,
        nodes: [node(CampaignPageType.HOME, 40, 160)],
        edges: [],
      };
    }

    const nodes = [
      node(CampaignPageType.HOME, 40, 160),
      node(CampaignPageType.CONFIRM, 600, 160),
      node(CampaignPageType.THANKYOU, 880, 40),
      node(CampaignPageType.INPROGRESS, 880, 160),
      node(CampaignPageType.LOW_BALANCE, 880, 280),
      node(CampaignPageType.BLOCKED, 880, 400),
      node(CampaignPageType.ERROR, 880, 520),
    ];

    const edges = [];

    if (mode === 'HEADER_INJECTION') {
      edges.push(
        edge(CampaignPageType.HOME, CampaignPageType.CONFIRM, 'HEADER_RESOLVED'),
      );
      edges.push(
        edge(CampaignPageType.HOME, CampaignPageType.ERROR, 'HEADER_UNRESOLVED'),
      );
    } else if (mode === 'OTP_ONLY') {
      nodes.splice(1, 0, node(CampaignPageType.OTP, 320, 60));
      edges.push(edge(CampaignPageType.HOME, CampaignPageType.OTP, 'DEFAULT'));
      edges.push(
        edge(CampaignPageType.OTP, CampaignPageType.CONFIRM, 'OTP_VERIFIED'),
      );
    } else {
      nodes.splice(1, 0, node(CampaignPageType.OTP, 320, 60));
      edges.push(
        edge(CampaignPageType.HOME, CampaignPageType.CONFIRM, 'HEADER_RESOLVED'),
      );
      edges.push(
        edge(CampaignPageType.HOME, CampaignPageType.OTP, 'HEADER_UNRESOLVED'),
      );
      edges.push(
        edge(CampaignPageType.OTP, CampaignPageType.CONFIRM, 'OTP_VERIFIED'),
      );
    }

    edges.push(
      edge(CampaignPageType.CONFIRM, CampaignPageType.THANKYOU, 'SUBSCRIBED'),
    );
    edges.push(
      edge(CampaignPageType.CONFIRM, CampaignPageType.INPROGRESS, 'PENDING'),
    );
    edges.push(
      edge(CampaignPageType.CONFIRM, CampaignPageType.LOW_BALANCE, 'LOW_BALANCE'),
    );
    edges.push(
      edge(CampaignPageType.CONFIRM, CampaignPageType.BLOCKED, 'BLOCKED'),
    );
    edges.push(edge(CampaignPageType.CONFIRM, CampaignPageType.ERROR, 'ERROR'));

    return { version: 1, entryPage: CampaignPageType.HOME, nodes, edges };
  };

  const getEntryPage = (config) => {
    if (!config || config.nodes.length === 0) {
      return CampaignPageType.HOME;
    }
    if (config.nodes.some((n) => n.pageType === CampaignPageType.HOME)) {
      return CampaignPageType.HOME;
    }
    if (
      config.entryPage &&
      config.nodes.some((n) => n.pageType === config.entryPage)
    ) {
      return config.entryPage;
    }
    return config.nodes[0].pageType;
  };

  const reachableNodeIds = (config, startNodeId) => {
    const reachable = new Set([startNodeId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of config.edges) {
        if (reachable.has(e.source) && !reachable.has(e.target)) {
          reachable.add(e.target);
          changed = true;
        }
      }
    }
    return reachable;
  };

  const conditionMatches = (edgeCondition, wanted) => {
    const edge = edgeCondition || 'DEFAULT';
    if (edge === wanted) return true;
    const aliases = CONDITION_ALIASES[wanted];
    return aliases ? aliases.includes(edge) : false;
  };

  const nextPage = (config, fromPageType, condition) => {
    if (!config) return null;
    const sourceNode = config.nodes.find((n) => n.pageType === fromPageType);
    if (!sourceNode) return null;

    const outgoing = config.edges.filter((e) => e.source === sourceNode.id);
    const match =
      outgoing.find((e) => conditionMatches(e.condition, condition)) ||
      outgoing.find((e) => (e.condition || 'DEFAULT') === 'DEFAULT');
    if (!match) return null;

    const targetNode = config.nodes.find((n) => n.id === match.target);
    return targetNode ? targetNode.pageType : null;
  };

  const stripUnreachableNodes = (config, _mode) => {
    const entryPage = getEntryPage(config);
    const entryNode = config.nodes.find((n) => n.pageType === entryPage);
    if (!entryNode) return config;

    const reachable = reachableNodeIds(config, entryNode.id);

    const keptNodeIds = new Set();
    const filteredNodes = config.nodes.filter((n) => {
      if (reachable.has(n.id)) {
        keptNodeIds.add(n.id);
        return true;
      }
      return false;
    });

    const filteredEdges = config.edges.filter(
      (e) => keptNodeIds.has(e.source) && keptNodeIds.has(e.target),
    );

    return { ...config, nodes: filteredNodes, edges: filteredEdges };
  };

  const validate = (config, mode) => {
    const errors = [];
    const pageTypes = new Set(config.nodes.map((n) => n.pageType));
    const entryPage = getEntryPage(config);
    const entryNode = config.nodes.find((n) => n.pageType === entryPage);

    if (!entryNode) {
      errors.push(
        `Start page "${entryPage}" must exist as a node in the flow.`,
      );
    }

    if (
      (mode === 'OTP_ONLY' || mode === 'BOTH') &&
      !pageTypes.has(CampaignPageType.OTP)
    ) {
      errors.push(`Verification mode ${mode} requires an OTP page node.`);
    }

    if (mode === 'NONE') {
      return { ok: errors.length === 0, errors };
    }

    if (entryNode) {
      const reachable = reachableNodeIds(config, entryNode.id);
      const unreachable = config.nodes.filter((n) => !reachable.has(n.id));
      if (unreachable.length > 0) {
        errors.push(
          `Unreachable from start page (${entryPage}): ${unreachable
            .map((n) => n.pageType)
            .join(', ')}. Connect them from "${entryPage}" or set a different start page.`,
        );
      }
    }

    return { ok: errors.length === 0, errors };
  };

  return {
    parseFlowConfig,
    normalizeMode,
    getDefaultFlowConfig,
    getEntryPage,
    reachableNodeIds,
    conditionMatches,
    nextPage,
    stripUnreachableNodes,
    validate,
  };
};

export const flowEngineService = createFlowEngineService();
