/**
 * Flow graph helpers for campaign.flowConfig (nodes/edges) + verificationMode.
 *
 * WHY: Layer B of "what happens next" — used only when the user clicks a CTA that
 * posts to /transition with SUBSCRIBE / CONTINUE / CONFIRM. Canvas "Go to page" /
 * "Open URL" / Priority Chain do NOT call nextPage() here.
 *
 * In practice most campaigns use getDefaultFlowConfig(mode); the React Flow UI
 * mostly visualizes that default. Prefer changing verificationMode over hand-editing
 * edges unless you intentionally remapped conditions.
 */
import { CampaignPageType } from '../../database/entities/campaign-page.entity.js';
import {
  defaultStartConfig,
  normalizeStartConfig,
  stripMetaFlowNodes,
  isMetaPageType,
} from './helpers/start-config.js';

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
      if (
        !parsed ||
        !Array.isArray(parsed.nodes) ||
        !Array.isArray(parsed.edges)
      ) {
        return null;
      }
      // Drop accidental START/END page nodes; keep startConfig for detect.
      return stripMetaFlowNodes(parsed);
    } catch (err) {
      console.warn(`Invalid flowConfig JSON: ${err.message}`);
      return null;
    }
  };

  const getStartConfig = (config, mode = 'BOTH') =>
    normalizeStartConfig(config?.startConfig, normalizeMode(mode) || mode);

  const normalizeMode = (mode) => {
    if (!mode) return null;
    const upper = mode.toUpperCase();
    if (LEGACY_MODE_ALIASES[upper]) {
      return LEGACY_MODE_ALIASES[upper];
    }
    return VERIFICATION_MODES.includes(upper) ? upper : null;
  };

  /** OTP_ONLY campaign that exposes public send/verify APIs (no WAP funnel). */
  const isApiExposeFlow = (config) =>
    String(config?.entryPage || '').toUpperCase() === 'API_EXPOSE';

  /**
   * packs_on_home: OTP_VERIFIED → HOME (identity already ran). Keep CONFIRM
   * reachable so the optional confirm page is not stripped as unreachable.
   */
  const applyFunnelLayoutToFlowConfig = (config, funnelLayout) => {
    if (!config || !Array.isArray(config.edges)) return config;
    const packs =
      String(funnelLayout || '')
        .trim()
        .toLowerCase() === 'packs_on_home';

    const remap = (targetFrom, targetTo) =>
      config.edges.map((e) => {
        if (String(e.condition || '').toUpperCase() !== 'OTP_VERIFIED') {
          return e;
        }
        if (String(e.target || '').toUpperCase() !== targetFrom) return e;
        return {
          ...e,
          target: targetTo,
          id: `${e.source}-OTP_VERIFIED-${targetTo}`,
        };
      });

    if (!packs) {
      return { ...config, edges: remap('HOME', CampaignPageType.CONFIRM) };
    }

    const hasHome = (config.nodes || []).some(
      (n) => n.pageType === CampaignPageType.HOME || n.id === 'HOME',
    );
    const nodes = hasHome
      ? config.nodes
      : [
          {
            id: CampaignPageType.HOME,
            pageType: CampaignPageType.HOME,
            position: { x: 40, y: 160 },
          },
          ...(config.nodes || []),
        ];

    const edges = remap('CONFIRM', CampaignPageType.HOME);
    const hasConfirm = (config.nodes || []).some(
      (n) => n.pageType === CampaignPageType.CONFIRM || n.id === 'CONFIRM',
    );
    const confirmReachable = edges.some(
      (e) => String(e.target || '').toUpperCase() === 'CONFIRM',
    );
    if (hasConfirm && !confirmReachable) {
      edges.push({
        id: 'HOME-DEFAULT-CONFIRM',
        source: CampaignPageType.HOME,
        target: CampaignPageType.CONFIRM,
        condition: 'DEFAULT',
      });
    }
    return { ...config, nodes, edges };
  };

  const getDefaultFlowConfig = (mode = 'BOTH', options = {}) => {
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
        startConfig: defaultStartConfig('NONE'),
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
        edge(
          CampaignPageType.HOME,
          CampaignPageType.CONFIRM,
          'HEADER_RESOLVED',
        ),
      );
      edges.push(
        edge(
          CampaignPageType.HOME,
          CampaignPageType.ERROR,
          'HEADER_UNRESOLVED',
        ),
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
        edge(
          CampaignPageType.HOME,
          CampaignPageType.CONFIRM,
          'HEADER_RESOLVED',
        ),
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
      edge(
        CampaignPageType.CONFIRM,
        CampaignPageType.LOW_BALANCE,
        'LOW_BALANCE',
      ),
    );
    edges.push(
      edge(CampaignPageType.CONFIRM, CampaignPageType.BLOCKED, 'BLOCKED'),
    );
    edges.push(edge(CampaignPageType.CONFIRM, CampaignPageType.ERROR, 'ERROR'));

    return applyFunnelLayoutToFlowConfig(
      {
        version: 1,
        entryPage: CampaignPageType.HOME,
        startConfig: defaultStartConfig(mode),
        nodes,
        edges,
      },
      options.funnelLayout,
    );
  };

  const getEntryPage = (config) => {
    if (isApiExposeFlow(config)) {
      return 'API_EXPOSE';
    }
    if (!config || !config.nodes || config.nodes.length === 0) {
      return CampaignPageType.HOME;
    }
    // Prefer explicit entryPage when that node exists (OTP-first, etc.).
    if (
      config.entryPage &&
      config.nodes.some((n) => n.pageType === config.entryPage)
    ) {
      return config.entryPage;
    }
    if (config.nodes.some((n) => n.pageType === CampaignPageType.HOME)) {
      return CampaignPageType.HOME;
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
    if (isMetaPageType(fromPageType)) return null;
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

  const stripUnreachableNodes = (config, mode) => {
    if (isApiExposeFlow(config)) {
      return {
        version: config.version || 1,
        entryPage: 'API_EXPOSE',
        startConfig: normalizeStartConfig(
          config.startConfig,
          normalizeMode(mode) || 'OTP_ONLY',
        ),
        nodes: Array.isArray(config.nodes) ? config.nodes : [],
        edges: Array.isArray(config.edges) ? config.edges : [],
      };
    }
    const cleaned = stripMetaFlowNodes(config);
    const entryPage = getEntryPage(cleaned);
    const entryNode = cleaned.nodes.find((n) => n.pageType === entryPage);
    if (!entryNode) return cleaned;

    const reachable = reachableNodeIds(cleaned, entryNode.id);

    const keptNodeIds = new Set();
    const filteredNodes = cleaned.nodes.filter((n) => {
      if (reachable.has(n.id)) {
        keptNodeIds.add(n.id);
        return true;
      }
      return false;
    });

    const filteredEdges = cleaned.edges.filter(
      (e) => keptNodeIds.has(e.source) && keptNodeIds.has(e.target),
    );

    return {
      ...cleaned,
      startConfig: normalizeStartConfig(
        cleaned.startConfig,
        normalizeMode(mode) || 'BOTH',
      ),
      nodes: filteredNodes,
      edges: filteredEdges,
    };
  };

  const validate = (config, mode) => {
    if (isApiExposeFlow(config)) {
      if (mode && mode !== 'OTP_ONLY') {
        return {
          ok: false,
          errors: ['API expose entry requires verification mode OTP_ONLY.'],
        };
      }
      return { ok: true, errors: [] };
    }

    const cleaned = stripMetaFlowNodes(config);
    const errors = [];
    const pageTypes = new Set(cleaned.nodes.map((n) => n.pageType));
    const entryPage = getEntryPage(cleaned);
    const entryNode = cleaned.nodes.find((n) => n.pageType === entryPage);

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
      const reachable = reachableNodeIds(cleaned, entryNode.id);
      const unreachable = cleaned.nodes.filter((n) => !reachable.has(n.id));
      if (unreachable.length > 0) {
        errors.push(
          `Unreachable from start page (${entryPage}): ${unreachable
            .map((n) => n.pageType)
            .join(
              ', ',
            )}. Connect them from "${entryPage}" or set a different start page.`,
        );
      }
    }

    return { ok: errors.length === 0, errors };
  };

  return {
    parseFlowConfig,
    normalizeMode,
    isApiExposeFlow,
    getDefaultFlowConfig,
    applyFunnelLayoutToFlowConfig,
    getEntryPage,
    getStartConfig,
    reachableNodeIds,
    conditionMatches,
    nextPage,
    stripUnreachableNodes,
    validate,
  };
};

export const flowEngineService = createFlowEngineService();
