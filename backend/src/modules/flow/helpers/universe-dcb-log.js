const SENSITIVE_KEYS = new Set([
  'pin',
  'pincode',
  'pin_code',
  'otp',
  'onetimepassword',
]);

const REQUEST_ID_KEYS = new Set([
  'requestid',
  'request_id',
  'providerrequestid',
]);

const normalizedKey = (key) =>
  String(key || '')
    .replace(/[^a-z0-9_]/gi, '')
    .toLowerCase();

export const sanitizeUniverseDcbLogValue = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeUniverseDcbLogValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => {
      const normalized = normalizedKey(key);
      if (SENSITIVE_KEYS.has(normalized)) return [key, '****'];
      if (REQUEST_ID_KEYS.has(normalized)) return [key, '[REDACTED]'];
      return [key, sanitizeUniverseDcbLogValue(nested)];
    }),
  );
};

const serialize = (value) => {
  if (value === undefined || value === null) return null;
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const buildUniverseDcbLogRecord = ({
  ctx,
  callType,
  action,
  response,
  error,
  statusLabel,
}) => {
  const meta = response?.logMeta || error?.logMeta || {};
  const responseData =
    response?.data !== undefined ? response.data : error?.providerData;
  return {
    visitId: ctx.visitId,
    campaignId: ctx.campaign?.id,
    msisdn: ctx.msisdn,
    rcid: ctx.visit?.rcid || null,
    clickId: ctx.visit?.clickId || null,
    callType,
    requestUrl: meta.url || null,
    requestBody: serialize({
      action,
      source: ctx.source || action,
      endpoint: meta.endpointName || null,
      method: meta.method || null,
      latencyMs: meta.latencyMs ?? null,
      serverRequestId: meta.serverRequestId || null,
      serviceId: ctx.serviceId || null,
      purchaseTypeId: ctx.purchaseTypeId || null,
      transactionChannel: ctx.transactionChannel || null,
      payload: sanitizeUniverseDcbLogValue(meta.payload || {}),
    }),
    responseStatus:
      response?.status ?? error?.providerStatus ?? error?.response?.status ?? null,
    responseBody: serialize(sanitizeUniverseDcbLogValue(responseData)),
    success: !error,
    errorMessage: error ? error.message || 'Universe DCB request failed' : null,
    statusLabel: statusLabel || (error ? 'FAILED' : 'SUCCESS'),
  };
};
