import { Injectable, Logger } from '@nestjs/common';
import { CampaignPageType } from '../campaigns/entities/campaign-page.entity';

export type VerificationMode = 'MSISDN_ONLY' | 'OTP_ONLY' | 'BOTH';

export const VERIFICATION_MODES: VerificationMode[] = [
  'MSISDN_ONLY',
  'OTP_ONLY',
  'BOTH',
];

export type FlowEdgeCondition =
  | 'DEFAULT'
  | 'MSISDN_RESOLVED'
  | 'MSISDN_UNRESOLVED'
  | 'OTP_VERIFIED'
  | 'SUBSCRIBED'
  | 'BLOCKED'
  | 'ERROR';

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
    return (VERIFICATION_MODES as string[]).includes(upper)
      ? (upper as VerificationMode)
      : null;
  }

  /**
   * Build a sensible default graph for a given verification mode. Used for new
   * campaigns and as a fallback so the builder always opens with a valid flow.
   */
  getDefaultFlowConfig(mode: VerificationMode = 'BOTH'): FlowConfig {
    const node = (
      pageType: CampaignPageType,
      x: number,
      y: number,
    ): FlowNode => ({ id: pageType, pageType, position: { x, y } });

    const nodes: FlowNode[] = [
      node(CampaignPageType.HOME, 40, 160),
      node(CampaignPageType.OTP, 320, 60),
      node(CampaignPageType.CONFIRM, 600, 160),
      node(CampaignPageType.THANKYOU, 880, 100),
      node(CampaignPageType.BLOCKED, 880, 240),
      node(CampaignPageType.ERROR, 880, 380),
    ];

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

    const edges: FlowEdge[] = [];

    if (mode === 'MSISDN_ONLY') {
      edges.push(edge(CampaignPageType.HOME, CampaignPageType.CONFIRM, 'MSISDN_RESOLVED'));
      edges.push(edge(CampaignPageType.HOME, CampaignPageType.ERROR, 'MSISDN_UNRESOLVED'));
    } else if (mode === 'OTP_ONLY') {
      edges.push(edge(CampaignPageType.HOME, CampaignPageType.OTP, 'DEFAULT'));
      edges.push(edge(CampaignPageType.OTP, CampaignPageType.CONFIRM, 'OTP_VERIFIED'));
    } else {
      // BOTH: resolve to prefill but always require OTP.
      edges.push(edge(CampaignPageType.HOME, CampaignPageType.OTP, 'DEFAULT'));
      edges.push(edge(CampaignPageType.OTP, CampaignPageType.CONFIRM, 'OTP_VERIFIED'));
    }

    edges.push(edge(CampaignPageType.CONFIRM, CampaignPageType.THANKYOU, 'SUBSCRIBED'));
    edges.push(edge(CampaignPageType.CONFIRM, CampaignPageType.BLOCKED, 'BLOCKED'));
    edges.push(edge(CampaignPageType.CONFIRM, CampaignPageType.ERROR, 'ERROR'));

    return { version: 1, nodes, edges };
  }

  /**
   * Resolve the next page from the graph given the source page + runtime outcome.
   * Falls back to a DEFAULT edge when no condition-specific edge exists.
   * Returns null when the graph has no applicable edge (caller applies its own default).
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
      outgoing.find((e) => (e.condition || 'DEFAULT') === condition) ||
      outgoing.find((e) => (e.condition || 'DEFAULT') === 'DEFAULT');
    if (!match) return null;

    const targetNode = config.nodes.find((n) => n.id === match.target);
    return targetNode ? targetNode.pageType : null;
  }

  /**
   * Strip nodes (and their edges) that are not reachable from the HOME node.
   * Required nodes (HOME, CONFIRM, and OTP when mode requires it) are never
   * removed — if they are unreachable the validate() call that follows will
   * surface the real error.
   */
  stripUnreachableNodes(
    config: FlowConfig,
    mode: VerificationMode,
  ): FlowConfig {
    const homeNode = config.nodes.find(
      (n) => n.pageType === CampaignPageType.HOME,
    );
    if (!homeNode) return config; // no HOME → validate() will catch this

    // BFS / fixed-point to discover reachable node ids
    const reachable = new Set<string>([homeNode.id]);
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

    // Nodes that MUST stay even if orphaned (required by mode)
    const requiredPageTypes = new Set<CampaignPageType>([
      CampaignPageType.HOME,
      CampaignPageType.CONFIRM,
    ]);
    if (mode === 'OTP_ONLY' || mode === 'BOTH') {
      requiredPageTypes.add(CampaignPageType.OTP);
    }

    const keptNodeIds = new Set<string>();
    const filteredNodes = config.nodes.filter((n) => {
      if (reachable.has(n.id) || requiredPageTypes.has(n.pageType)) {
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

  /**
   * Validate a graph against a verification mode. Returns human-readable errors.
   */
  validate(
    config: FlowConfig,
    mode: VerificationMode,
  ): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    const pageTypes = new Set(config.nodes.map((n) => n.pageType));

    if (!pageTypes.has(CampaignPageType.HOME)) {
      errors.push('A HOME page node is required.');
    }
    if (!pageTypes.has(CampaignPageType.CONFIRM)) {
      errors.push('A CONFIRM page node is required.');
    }
    if (
      (mode === 'OTP_ONLY' || mode === 'BOTH') &&
      !pageTypes.has(CampaignPageType.OTP)
    ) {
      errors.push(`Verification mode ${mode} requires an OTP page node.`);
    }

    // Every non-HOME node should be reachable from HOME.
    const homeNode = config.nodes.find(
      (n) => n.pageType === CampaignPageType.HOME,
    );
    if (homeNode) {
      const reachable = new Set<string>([homeNode.id]);
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
      const unreachable = config.nodes.filter((n) => !reachable.has(n.id));
      if (unreachable.length > 0) {
        errors.push(
          `Unreachable page node(s): ${unreachable
            .map((n) => n.pageType)
            .join(', ')}.`,
        );
      }
    }

    return { ok: errors.length === 0, errors };
  }
}
