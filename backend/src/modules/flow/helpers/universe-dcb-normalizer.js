export const DCB_OUTCOMES = Object.freeze({
  ENTITLED: 'ENTITLED',
  NEW: 'NEW',
  PENDING: 'PENDING',
  LOW_BALANCE: 'LOW_BALANCE',
  TERMINAL_FAILURE: 'TERMINAL_FAILURE',
  PARSE_ERROR: 'PARSE_ERROR',
});

export const UNIVERSE_DCB_NORMALIZER_DEFAULTS = Object.freeze({
  itemsPath: 'data.items',
  statusPath: 'status',
  entitlementActivePath: 'entitlementActive',
  currentPath: 'current',
  serviceIdPath: 'serviceId',
  entitledStatuses: ['ACTIVE', 'TRIAL_ACTIVE'],
  pendingStatuses: ['PENDING_PIN', 'PENDING_CONFIRMATION'],
  lowBalanceStatuses: ['PARKED_NO_BALANCE', 'SUSPENDED'],
  terminalStatuses: ['DEACTIVATED', 'EXPIRED', 'FAILED', 'CANCELLED'],
  newStatuses: ['NEW'],
});

const pathParts = (path) =>
  Array.isArray(path)
    ? path
    : String(path || '')
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .map((part) => part.trim())
        .filter(Boolean);

export const getNestedValue = (value, path) => {
  if (!path) return value;
  let current = value;
  for (const part of pathParts(path)) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
};

const normalizeStatuses = (configured, fallback) => {
  const source = Array.isArray(configured) ? configured : fallback;
  return new Set(
    source
      .map((status) =>
        String(status || '')
          .trim()
          .toUpperCase(),
      )
      .filter(Boolean),
  );
};

const normalizerConfig = (config = {}) => {
  const nested =
    config.normalizer && typeof config.normalizer === 'object'
      ? config.normalizer
      : config.response && typeof config.response === 'object'
        ? config.response
        : {};
  const paths =
    config.responsePaths && typeof config.responsePaths === 'object'
      ? config.responsePaths
      : config.paths && typeof config.paths === 'object'
        ? config.paths
        : {};
  return {
    ...UNIVERSE_DCB_NORMALIZER_DEFAULTS,
    ...nested,
    ...(paths.items ? { itemsPath: paths.items } : {}),
    ...(paths.status ? { statusPath: paths.status } : {}),
    ...(paths.entitlementActive
      ? { entitlementActivePath: paths.entitlementActive }
      : {}),
    ...(paths.current ? { currentPath: paths.current } : {}),
    ...(paths.serviceId ? { serviceIdPath: paths.serviceId } : {}),
  };
};

const parseError = (reason) => ({
  outcome: DCB_OUTCOMES.PARSE_ERROR,
  status: null,
  entitlementActive: false,
  current: false,
  reason,
});

/**
 * Convert Universe (or a path-compatible provider response) to a stable funnel
 * outcome. Selection is deterministic: requested service, then current record,
 * then provider order.
 */
export function normalizeUniverseDcbResponse(
  payload,
  config = {},
  context = {},
) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return parseError('MALFORMED_RESPONSE');
  }
  if (payload.success === false) return parseError('UPSTREAM_UNSUCCESSFUL');

  const cfg = normalizerConfig(config);
  const items = getNestedValue(payload, cfg.itemsPath);
  if (!Array.isArray(items)) return parseError('ITEMS_NOT_ARRAY');
  if (items.length === 0) {
    return {
      outcome: DCB_OUTCOMES.NEW,
      status: null,
      entitlementActive: false,
      current: false,
      reason: 'EMPTY_ITEMS',
    };
  }
  if (
    items.some(
      (item) => !item || typeof item !== 'object' || Array.isArray(item),
    )
  ) {
    return parseError('MALFORMED_ITEM');
  }

  const requestedServiceId = String(context.serviceId ?? '').trim();
  const serviceValue = (item) => {
    const configured = getNestedValue(item, cfg.serviceIdPath);
    if (configured !== undefined && configured !== null) return configured;
    return (
      getNestedValue(item, 'providerServiceId') ??
      getNestedValue(item, 'serviceId')
    );
  };
  let candidates = items;
  if (requestedServiceId) {
    const withServiceId = items.filter((item) => {
      const value = serviceValue(item);
      return (
        value !== undefined && value !== null && String(value).trim() !== ''
      );
    });
    if (withServiceId.length > 0) {
      candidates = withServiceId.filter(
        (item) => String(serviceValue(item)).trim() === requestedServiceId,
      );
      if (candidates.length === 0) {
        return {
          outcome: DCB_OUTCOMES.NEW,
          status: null,
          entitlementActive: false,
          current: false,
          reason: 'SERVICE_NOT_FOUND',
        };
      }
    }
  }

  const selected =
    candidates.find((item) => getNestedValue(item, cfg.currentPath) === true) ||
    candidates[0];
  const rawStatus = getNestedValue(selected, cfg.statusPath);
  const status =
    typeof rawStatus === 'string' || typeof rawStatus === 'number'
      ? String(rawStatus).trim().toUpperCase()
      : '';
  if (!status) return parseError('STATUS_MISSING');

  const entitlementActive =
    getNestedValue(selected, cfg.entitlementActivePath) === true;
  const current = getNestedValue(selected, cfg.currentPath) === true;
  const base = { status, entitlementActive, current };

  const entitledStatuses = normalizeStatuses(
    cfg.entitledStatuses,
    UNIVERSE_DCB_NORMALIZER_DEFAULTS.entitledStatuses,
  );
  if (entitledStatuses.has(status)) {
    return {
      ...base,
      outcome:
        entitlementActive && current ? DCB_OUTCOMES.ENTITLED : DCB_OUTCOMES.NEW,
      reason: entitlementActive && current ? null : 'ENTITLEMENT_NOT_CURRENT',
    };
  }
  if (
    normalizeStatuses(
      cfg.pendingStatuses,
      UNIVERSE_DCB_NORMALIZER_DEFAULTS.pendingStatuses,
    ).has(status)
  ) {
    return { ...base, outcome: DCB_OUTCOMES.PENDING, reason: null };
  }
  if (
    normalizeStatuses(
      cfg.lowBalanceStatuses,
      UNIVERSE_DCB_NORMALIZER_DEFAULTS.lowBalanceStatuses,
    ).has(status)
  ) {
    return { ...base, outcome: DCB_OUTCOMES.LOW_BALANCE, reason: null };
  }
  if (
    normalizeStatuses(
      cfg.terminalStatuses,
      UNIVERSE_DCB_NORMALIZER_DEFAULTS.terminalStatuses,
    ).has(status)
  ) {
    return { ...base, outcome: DCB_OUTCOMES.TERMINAL_FAILURE, reason: null };
  }
  if (
    normalizeStatuses(
      cfg.newStatuses,
      UNIVERSE_DCB_NORMALIZER_DEFAULTS.newStatuses,
    ).has(status)
  ) {
    return { ...base, outcome: DCB_OUTCOMES.NEW, reason: null };
  }
  return { ...parseError('UNKNOWN_STATUS'), status };
}
