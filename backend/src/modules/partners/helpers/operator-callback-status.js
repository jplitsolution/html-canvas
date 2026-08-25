/** Statuses that count as a billable conversion and fire the vendor CPA postback. */
export const VENDOR_FIRE_OPERATOR_STATUSES = new Set([
  '',
  'active',
  'success',
  'ok',
  'subscribed',
  '1',
  'true',
]);

export const parseOperatorStatus = (query = {}) => {
  const raw = query.status ?? query.result;
  if (raw == null || String(raw).trim() === '') return 'active';
  return String(raw).trim().toLowerCase().slice(0, 64);
};

export const parseAllowedStatuses = (config) => {
  if (!config) return null;
  if (Array.isArray(config)) {
    const list = config.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
    return list.length ? new Set(list) : null;
  }
  if (typeof config === 'string') {
    const list = config
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return list.length ? new Set(list) : null;
  }
  return null;
};

export const shouldFireVendorPostback = (status, customAllowedConfig = null) => {
  const normalized = String(status || '').toLowerCase();
  const customSet = parseAllowedStatuses(customAllowedConfig);
  if (customSet) {
    return customSet.has(normalized);
  }
  return VENDOR_FIRE_OPERATOR_STATUSES.has(normalized);
};

