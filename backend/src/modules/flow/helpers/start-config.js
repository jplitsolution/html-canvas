/**
 * Shared startConfig helpers for detect-msisdn (Layer A).
 * Mirrors frontend/src/components/flow/startConfig.js defaults.
 */

export function defaultStartConfig(mode) {
  const m = String(mode || 'BOTH').toUpperCase();
  if (m === 'UNIVERSE_DCB') {
    return {
      runHe: true,
      runBlocklist: true,
      runChecksub: true,
    };
  }
  if (m === 'OTP_ONLY' || m === 'NONE' || m === 'CG_HOME') {
    return {
      runHe: false,
      runBlocklist: m === 'OTP_ONLY',
      runChecksub: m === 'OTP_ONLY',
    };
  }
  return {
    runHe: true,
    runBlocklist: true,
    runChecksub: true,
  };
}

export function normalizeStartConfig(raw, mode) {
  const fallback = defaultStartConfig(mode);
  if (!raw || typeof raw !== 'object') return { ...fallback };
  return {
    runHe: typeof raw.runHe === 'boolean' ? raw.runHe : fallback.runHe,
    runBlocklist:
      typeof raw.runBlocklist === 'boolean'
        ? raw.runBlocklist
        : fallback.runBlocklist,
    runChecksub:
      typeof raw.runChecksub === 'boolean'
        ? raw.runChecksub
        : fallback.runChecksub,
  };
}

export function getStartConfigFromFlow(flowConfig, verificationMode) {
  return normalizeStartConfig(flowConfig?.startConfig, verificationMode);
}

/** Meta nodes are visual-only; never use as funnel pages. */
export function isMetaPageType(pageType) {
  const t = String(pageType || '').toUpperCase();
  return t === 'START' || t === 'END';
}

export function stripMetaFlowNodes(config) {
  if (!config) return config;
  const nodes = (config.nodes || []).filter((n) => !isMetaPageType(n.pageType));
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (config.edges || []).filter(
    (e) => ids.has(e.source) && ids.has(e.target),
  );
  return { ...config, nodes, edges };
}
