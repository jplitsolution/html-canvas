import { Injectable, Logger } from '@nestjs/common';
import { CampaignPageType } from '../campaigns/entities/campaign-page.entity';

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

@Injectable()
export class FlowEngineService {
  logger = new Logger(FlowEngineService.name);

  parseFlowConfig(raw) {
    if (!raw) return null;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        return null;
      }
      return parsed;
    } catch (err) {
      this.logger.warn(`Invalid flowConfig JSON: ${err.message}`);
      return null;
    }
  }

  normalizeMode(mode) {
    if (!mode) return null;
    const upper = mode.toUpperCase();
    if (LEGACY_MODE_ALIASES[upper]) {
      return LEGACY_MODE_ALIASES[upper];
    }
    return VERIFICATION_MODES.includes(upper)
      ? upper
      : null;
  }

  getDefaultFlowConfig(mode = 'BOTH') {
    const node = (
      pageType,
      x,
      y,
    ) => ({ id: pageType, pageType, position: { x, y } });

    const edge = (
      source,
      target,
      condition,
    ) => ({
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
      node(CampaignPageType.THANKYOU, 880, 100),
      node(CampaignPageType.BLOCKED, 880, 240),
      node(CampaignPageType.ERROR, 880, 380),
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
      edge(CampaignPageType.CONFIRM, CampaignPageType.BLOCKED, 'BLOCKED'),
    );
    edges.push(edge(CampaignPageType.CONFIRM, CampaignPageType.ERROR, 'ERROR'));

    return { version: 1, entryPage: CampaignPageType.HOME, nodes, edges };
  }

  getEntryPage(config) {
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
  }

  reachableNodeIds(config, startNodeId) {
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
  }

  conditionMatches(
    edgeCondition,
    wanted,
  ) {
    const edge = edgeCondition || 'DEFAULT';
    if (edge === wanted) return true;
    const aliases = CONDITION_ALIASES[wanted];
    return aliases ? aliases.includes(edge) : false;
  }

  nextPage(
    config,
    fromPageType,
    condition,
  ) {
    if (!config) return null;
    const sourceNode = config.nodes.find((n) => n.pageType === fromPageType);
    if (!sourceNode) return null;

    const outgoing = config.edges.filter((e) => e.source === sourceNode.id);
    const match =
      outgoing.find((e) => this.conditionMatches(e.condition, condition)) ||
      outgoing.find((e) => (e.condition || 'DEFAULT') === 'DEFAULT');
    if (!match) return null;

    const targetNode = config.nodes.find((n) => n.id === match.target);
    return targetNode ? targetNode.pageType : null;
  }

  stripUnreachableNodes(
    config,
    _mode,
  ) {
    const entryPage = this.getEntryPage(config);
    const entryNode = config.nodes.find((n) => n.pageType === entryPage);
    if (!entryNode) return config;

    const reachable = this.reachableNodeIds(config, entryNode.id);

    const keptNodeIds = new Set();
    const filteredNodes = config.nodes.filter((n) => {
      if (reachable.has(n.id)) {
        keptNodeIds.add(n.id);
        return true;
      }
      this.logger.debug(
        `Stripping unreachable node: ${n.pageType} (id=${n.id})`,
      );
      return false;
    });

    const filteredEdges = config.edges.filter(
      (e) => keptNodeIds.has(e.source) && keptNodeIds.has(e.target),
    );

    return { ...config, nodes: filteredNodes, edges: filteredEdges };
  }

  validate(
    config,
    mode,
  ) {
    const errors = [];
    const pageTypes = new Set(config.nodes.map((n) => n.pageType));
    const entryPage = this.getEntryPage(config);
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
      const reachable = this.reachableNodeIds(config, entryNode.id);
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
  }
}
