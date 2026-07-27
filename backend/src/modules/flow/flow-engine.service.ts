import { Injectable, Logger } from '@nestjs/common';
import { CampaignPageType } from '../campaigns/entities/campaign-page.entity';

/**
 * Verification modes (client picks per campaign):
 * - HEADER_INJECTION — carrier header / ISP resolve (legacy alias: MSISDN_ONLY)
 * - OTP_ONLY — always OTP after HOME CTA
 * - BOTH — header injection when available + OTP fallback
 * - NONE — no HE/OTP routing; HOME uses Priority Chain (API / page / external redirect)
 */
export type VerificationMode =
  | 'HEADER_INJECTION'
  | 'OTP_ONLY'
  | 'BOTH'
  | 'NONE';

export const VERIFICATION_MODES: VerificationMode[] = [
  'HEADER_INJECTION',
  'OTP_ONLY',
  'BOTH',
  'NONE',
];

/** @deprecated Use HEADER_INJECTION — kept for reading old DB values */
const LEGACY_MODE_ALIASES: Record<string, VerificationMode> = {
  MSISDN_ONLY: 'HEADER_INJECTION',
  NULL: 'NONE',
};

export type FlowEdgeCondition =
  | 'DEFAULT'
  | 'HEADER_RESOLVED'
  | 'HEADER_UNRESOLVED'
  /** @deprecated Prefer HEADER_RESOLVED */
  | 'MSISDN_RESOLVED'
  /** @deprecated Prefer HEADER_UNRESOLVED */
  | 'MSISDN_UNRESOLVED'
  | 'OTP_VERIFIED'
  | 'SUBSCRIBED'
  | 'BLOCKED'
  | 'ERROR';

const CONDITION_ALIASES: Record<string, string[]> = {
  HEADER_RESOLVED: ['HEADER_RESOLVED', 'MSISDN_RESOLVED'],
  HEADER_UNRESOLVED: ['HEADER_UNRESOLVED', 'MSISDN_UNRESOLVED'],
  MSISDN_RESOLVED: ['HEADER_RESOLVED', 'MSISDN_RESOLVED'],
  MSISDN_UNRESOLVED: ['HEADER_UNRESOLVED', 'MSISDN_UNRESOLVED'],
};

export interface FlowNode {
  id: string;
  pageType: CampaignPageType;
  position?: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  condition?: FlowEdgeCondition;
}

export interface FlowConfig {
  version: number;
  /** First page shown when a user opens the subscription URL */
  entryPage?: CampaignPageType;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

@Injectable()
export class FlowEngineService {
  private readonly logger = new Logger(FlowEngineService.name);

  parseFlowConfig(raw?: string | null): FlowConfig | null {
    if (!raw) return null;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        return null;
      }
      return parsed as FlowConfig;
    } catch (err) {
      this.logger.warn(`Invalid flowConfig JSON: ${(err as Error).message}`);
      return null;
    }
  }

  normalizeMode(mode?: string | null): VerificationMode | null {
    if (!mode) return null;
    const upper = mode.toUpperCase();
    if (LEGACY_MODE_ALIASES[upper]) {
      return LEGACY_MODE_ALIASES[upper];
    }
    return (VERIFICATION_MODES as string[]).includes(upper)
      ? (upper as VerificationMode)
      : null;
  }

  /**
   * Build a sensible default graph for a given verification mode. Used for new
   * campaigns and as a fallback so the builder always opens with a valid flow.
   * Trust-first: entry is always HOME.
   */
  getDefaultFlowConfig(mode: VerificationMode = 'BOTH'): FlowConfig {
    const node = (
      pageType: CampaignPageType,
      x: number,
      y: number,
    ): FlowNode => ({ id: pageType, pageType, position: { x, y } });

    const edge = (
      source: CampaignPageType,
      target: CampaignPageType,
      condition: FlowEdgeCondition,
    ): FlowEdge => ({
      id: `${source}-${condition}-${target}`,
      source,
      target,
      condition,
    });

    // Priority Chain only — HOME is enough; client wires external/API on the page.
    if (mode === 'NONE') {
      return {
        version: 1,
        entryPage: CampaignPageType.HOME,
        nodes: [node(CampaignPageType.HOME, 40, 160)],
        edges: [],
      };
    }

    const nodes: FlowNode[] = [
      node(CampaignPageType.HOME, 40, 160),
      node(CampaignPageType.CONFIRM, 600, 160),
      node(CampaignPageType.THANKYOU, 880, 100),
      node(CampaignPageType.BLOCKED, 880, 240),
      node(CampaignPageType.ERROR, 880, 380),
    ];

    const edges: FlowEdge[] = [];

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
      // BOTH: after HOME CTA — header resolved → CONFIRM, else → OTP
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

  /**
   * Resolve which page type opens the funnel. Trust-first: prefer HOME.
   */
  getEntryPage(config: FlowConfig | null): CampaignPageType {
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

  private reachableNodeIds(config: FlowConfig, startNodeId: string): Set<string> {
    const reachable = new Set<string>([startNodeId]);
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

  private conditionMatches(
    edgeCondition: string | undefined,
    wanted: FlowEdgeCondition,
  ): boolean {
    const edge = edgeCondition || 'DEFAULT';
    if (edge === wanted) return true;
    const aliases = CONDITION_ALIASES[wanted];
    return aliases ? aliases.includes(edge) : false;
  }

  /**
   * Resolve the next page from the graph given the source page + runtime outcome.
   * Falls back to a DEFAULT edge when no condition-specific edge exists.
   * HEADER_* and legacy MSISDN_* conditions are treated as aliases.
   */
  nextPage(
    config: FlowConfig | null,
    fromPageType: CampaignPageType,
    condition: FlowEdgeCondition,
  ): CampaignPageType | null {
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
    config: FlowConfig,
    _mode?: VerificationMode | null,
  ): FlowConfig {
    const entryPage = this.getEntryPage(config);
    const entryNode = config.nodes.find((n) => n.pageType === entryPage);
    if (!entryNode) return config;

    const reachable = this.reachableNodeIds(config, entryNode.id);

    const keptNodeIds = new Set<string>();
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
    config: FlowConfig,
    mode?: VerificationMode | null,
  ): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
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

    // NONE: only HOME is required; other pages may be reached via Priority Chain.
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
