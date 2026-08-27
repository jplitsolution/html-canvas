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
  normalizeStartConfig,
  stripMetaFlowNodes,
  isMetaPageType,
} from './helpers/start-config.js';
import { resolveFlow, resolveFlowOrBoth } from './flows/index.js';

export const VERIFICATION_MODES = [
  'HEADER_INJECTION',
  'UNIVERSE_DCB',
  'OTP_ONLY',
  'BOTH',
  'NONE',
  'CG_HOME',
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

  const flowFlags = (mode) =>
    resolveFlow(normalizeMode(mode) || String(mode || '').toUpperCase());

  /** No HE/OTP — CG URL carries click_id. */
  const isNullIdentityMode = (mode) => Boolean(flowFlags(mode)?.isNullIdentity);

  /** Landing immediately leaves to CG (existing null flow). */
  const isLandingCgRedirectMode = (mode) => Boolean(flowFlags(mode)?.isLandingCg);

  /** Subscribe / pack CTA leaves to CG with click_id. */
  const isSubscribeCgRedirectMode = (mode) =>
    Boolean(flowFlags(mode)?.isSubscribeCg);

  /** OTP_ONLY campaign that exposes public send/verify APIs (no WAP funnel). */
  const isApiExposeFlow = (config) =>
    String(config?.entryPage || '').toUpperCase() === 'API_EXPOSE';

  /**
   * packs_on_home: identity → HOME (packs). Drop Confirm from the default graph.
   * Classic: keep Confirm; remap OTP_VERIFIED HOME → CONFIRM if needed.
   */
  const applyFunnelLayoutToFlowConfig = (config, funnelLayout, mode) => {
    if (!config || !Array.isArray(config.edges)) return config;
    const packs =
      String(funnelLayout || '')
        .trim()
        .toLowerCase() === 'packs_on_home';

    const remapOtp = (targetFrom, targetTo) =>
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
      return { ...config, edges: remapOtp('HOME', CampaignPageType.CONFIRM) };
    }

    const hasHome = (config.nodes || []).some(
      (n) => n.pageType === CampaignPageType.HOME || n.id === 'HOME',
    );
    let nodes = hasHome
      ? [...(config.nodes || [])]
      : [
          {
            id: CampaignPageType.HOME,
            pageType: CampaignPageType.HOME,
            position: { x: 40, y: 160 },
          },
          ...(config.nodes || []),
        ];

    let edges = remapOtp('CONFIRM', CampaignPageType.HOME).map((e) => {
      const cond = String(e.condition || '').toUpperCase();
      const target = String(e.target || '').toUpperCase();
      if (cond === 'HEADER_RESOLVED' && target === 'CONFIRM') {
        return {
          ...e,
          target: CampaignPageType.HOME,
          id: `${e.source}-HEADER_RESOLVED-HOME`,
        };
      }
      if (String(e.source || '').toUpperCase() === 'CONFIRM') {
        return {
          ...e,
          source: CampaignPageType.HOME,
          id: `HOME-${e.condition}-${e.target}`,
        };
      }
      return e;
    });

    edges = edges.filter((e) => {
      const src = String(e.source || '').toUpperCase();
      const tgt = String(e.target || '').toUpperCase();
      if (src === 'CONFIRM' || tgt === 'CONFIRM') return false;
      if (src === tgt) return false;
      return true;
    });

    nodes = nodes.filter(
      (n) => n.pageType !== CampaignPageType.CONFIRM && n.id !== 'CONFIRM',
    );

    const seen = new Set();
    edges = edges.filter((e) => {
      const key = `${e.source}|${e.condition}|${e.target}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const entryPage =
      String(mode || '').toUpperCase() === 'OTP_ONLY'
        ? CampaignPageType.OTP
        : config.entryPage || CampaignPageType.HOME;

    return { ...config, nodes, edges, entryPage };
  };

  const getDefaultFlowConfig = (mode = 'BOTH', options = {}) => {
    const flow = resolveFlowOrBoth(mode);
    return flow.getDefaultFlowConfig(
      { applyFunnelLayoutToFlowConfig },
      options,
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
      if (mode && !resolveFlowOrBoth(mode).allowsApiExpose) {
        return {
          ok: false,
          errors: [
            'API expose entry requires verification mode OTP_ONLY or UNIVERSE_DCB.',
          ],
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

    const flow = resolveFlow(mode);
    if (flow?.requiresOtpNode && !pageTypes.has(CampaignPageType.OTP)) {
      errors.push(`Verification mode ${mode} requires an OTP page node.`);
    }

    if (flow?.skipReachableValidate) {
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
    isNullIdentityMode,
    isLandingCgRedirectMode,
    isSubscribeCgRedirectMode,
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
