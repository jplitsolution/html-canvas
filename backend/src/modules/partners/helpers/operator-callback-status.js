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

export const shouldFireVendorPostback = (status) =>
  VENDOR_FIRE_OPERATOR_STATUSES.has(String(status || '').toLowerCase());
