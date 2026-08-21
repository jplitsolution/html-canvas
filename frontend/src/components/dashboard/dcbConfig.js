const DEFAULT_PURCHASE_TYPE_MAPPINGS = [
  { packKey: 'daily', label: 'Daily', purchaseTypeId: '2' },
  { packKey: 'weekly', label: 'Weekly', purchaseTypeId: '3' },
  { packKey: 'monthly', label: 'Monthly', purchaseTypeId: '4' },
  { packKey: 'yearly', label: 'Yearly', purchaseTypeId: '10' },
  {
    packKey: 'monthly-with-ads',
    label: 'Monthly with Ads',
    purchaseTypeId: '11',
  },
  {
    packKey: 'three-months',
    label: 'Three Months',
    purchaseTypeId: '12',
  },
]

const DEFAULT_DCB_ENDPOINTS = {
  publicConfig: '/api/dcb/config/public',
  subscriptions: '/api/dcb/subscriptions',
  pincode: '/api/dcb/pincode',
  confirm: '/api/dcb/confirm',
}

const DEFAULT_DCB_REQUEST_FIELDS = {
  merchantIdField: 'merchantId',
  serviceIdField: 'serviceId',
  purchaseTypeIdField: 'purchaseTypeId',
  msisdnField: 'msisdn',
  transactionChannelField: 'transactionChannel',
  operatorField: 'operator',
  subscriptionField: 'subscription',
  requestIdField: 'id',
  pinField: 'pinCode',
  currentField: 'current',
}

const DEFAULT_DCB_CONFIG = {
  baseUrl: 'https://bilunipal.tickhighs.com',
  merchantId: '169',
  serviceId: '581',
  operatorCode: 'WM',
  purchaseTypeMappings: DEFAULT_PURCHASE_TYPE_MAPPINGS,
  pollIntervalMs: 2000,
  pollTimeoutMs: 60000,
  endpoints: { ...DEFAULT_DCB_ENDPOINTS },
  request: { ...DEFAULT_DCB_REQUEST_FIELDS },
  responsePaths: {
    envelope: 'data',
    items: 'data.items',
    status: 'status',
    entitlementActive: 'entitlementActive',
    current: 'current',
    serviceId: 'providerServiceId',
    requestId: 'data.PinInfo.ID',
  },
}

function cloneDefaults() {
  return {
    ...DEFAULT_DCB_CONFIG,
    purchaseTypeMappings: DEFAULT_PURCHASE_TYPE_MAPPINGS.map((item) => ({ ...item })),
    endpoints: { ...DEFAULT_DCB_ENDPOINTS },
    request: { ...DEFAULT_DCB_REQUEST_FIELDS },
    responsePaths: { ...DEFAULT_DCB_CONFIG.responsePaths },
  }
}

function endpointPath(value, fallback) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object' && value.path) return String(value.path).trim()
  return fallback
}

function normalizeNamed(raw, fallback) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  return Object.fromEntries(
    Object.entries(fallback).map(([key, defaultValue]) => [key, String(source[key] ?? defaultValue ?? '').trim() || defaultValue])
  )
}

function normalizeEndpoints(raw, fallback) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  return Object.fromEntries(
    Object.entries(fallback).map(([key, defaultValue]) => [key, endpointPath(source[key], defaultValue)])
  )
}

function normalizeMappings(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item, index) => ({
      packKey: String(item?.packKey || item?.pack || `plan-${index + 1}`),
      label: String(item?.label || item?.name || item?.packKey || `Plan ${index + 1}`),
      purchaseTypeId: String(item?.purchaseTypeId ?? item?.id ?? ''),
    }))
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([packKey, value]) => ({
      packKey,
      label: String(value?.label || value?.name || packKey),
      purchaseTypeId: String(
        value && typeof value === 'object' ? (value.purchaseTypeId ?? value.id ?? '') : (value ?? '')
      ),
    }))
  }
  return DEFAULT_PURCHASE_TYPE_MAPPINGS.map((item) => ({ ...item }))
}

function parseDcbConfig(raw) {
  const fallback = cloneDefaults()
  if (!raw) return fallback
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') return fallback
    const responsePaths = parsed.responsePaths || parsed.paths || {}
    const pollIntervalMs = Number(parsed.pollIntervalMs)
    const pollTimeoutMs = Number(parsed.pollTimeoutMs)
    return {
      baseUrl: String(parsed.baseUrl || fallback.baseUrl),
      merchantId: String(parsed.merchantId ?? fallback.merchantId),
      serviceId: String(parsed.serviceId ?? fallback.serviceId),
      operatorCode: String(parsed.operatorCode || fallback.operatorCode),
      purchaseTypeMappings: normalizeMappings(
        parsed.purchaseTypeMappings || parsed.purchaseTypes || parsed.purchaseTypeMap
      ),
      pollIntervalMs: Number.isFinite(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : fallback.pollIntervalMs,
      pollTimeoutMs: Number.isFinite(pollTimeoutMs) && pollTimeoutMs > 0 ? pollTimeoutMs : fallback.pollTimeoutMs,
      endpoints: normalizeEndpoints(parsed.endpoints, fallback.endpoints),
      request: normalizeNamed(parsed.request || parsed.requestFields, fallback.request),
      responsePaths: {
        ...fallback.responsePaths,
        ...Object.fromEntries(Object.entries(responsePaths).map(([key, value]) => [key, String(value || '')])),
      },
    }
  } catch {
    return fallback
  }
}

function serializeDcbConfig(config) {
  const normalized = parseDcbConfig(config)
  return JSON.stringify({
    ...normalized,
    baseUrl: normalized.baseUrl.trim().replace(/\/+$/, ''),
    merchantId: normalized.merchantId.trim(),
    serviceId: normalized.serviceId.trim(),
    operatorCode: normalized.operatorCode.trim(),
    purchaseTypeMappings: normalized.purchaseTypeMappings
      .map((item) => ({
        packKey: String(item.packKey || '').trim(),
        label: String(item.label || '').trim(),
        purchaseTypeId: String(item.purchaseTypeId || '').trim(),
      }))
      .filter((item) => item.packKey && item.purchaseTypeId),
    endpoints: Object.fromEntries(
      Object.entries(normalized.endpoints).map(([key, value]) => [key, String(value || '').trim() || DEFAULT_DCB_ENDPOINTS[key]])
    ),
    request: Object.fromEntries(
      Object.entries(normalized.request).map(([key, value]) => [
        key,
        String(value || '').trim() || DEFAULT_DCB_REQUEST_FIELDS[key],
      ])
    ),
    responsePaths: Object.fromEntries(
      Object.entries(normalized.responsePaths).map(([key, value]) => [key, String(value || '').trim()])
    ),
  })
}

function previewPincodePayload(config) {
  const current = parseDcbConfig(config)
  const fields = current.request
  return {
    [fields.merchantIdField]: Number(current.merchantId) || current.merchantId,
    [fields.serviceIdField]: Number(current.serviceId) || current.serviceId,
    [fields.purchaseTypeIdField]: 3,
    [fields.msisdnField]: '566891023',
    [fields.transactionChannelField]: 'Wifi',
    [fields.operatorField]: current.operatorCode,
    [fields.subscriptionField]: '',
  }
}

function previewConfirmPayload(config) {
  const current = parseDcbConfig(config)
  const fields = current.request
  return {
    [fields.requestIdField]: 'REQUEST-ID-FROM-PIN-RESPONSE',
    [fields.pinField]: '1234',
    [fields.msisdnField]: '566891023',
    [fields.serviceIdField]: Number(current.serviceId) || current.serviceId,
    [fields.purchaseTypeIdField]: 3,
  }
}

const CLASSIC_PACK_OPTIONS = [
  { packKey: 'daily', label: 'Daily', purchaseTypeId: '' },
  { packKey: 'weekly', label: 'Weekly', purchaseTypeId: '' },
  { packKey: 'monthly', label: 'Monthly', purchaseTypeId: '' },
]

function editorPackOptions(raw, { universeDcb = false } = {}) {
  const mappings = parseDcbConfig(raw).purchaseTypeMappings
    .map((item) => ({
      packKey: String(item.packKey || '').trim(),
      label: String(item.label || item.packKey || '').trim(),
      purchaseTypeId: String(item.purchaseTypeId || '').trim(),
    }))
    .filter((item) => item.packKey)
  if ((raw || universeDcb) && mappings.length) return mappings
  return CLASSIC_PACK_OPTIONS
}

export {
  CLASSIC_PACK_OPTIONS,
  DEFAULT_DCB_CONFIG,
  DEFAULT_DCB_ENDPOINTS,
  DEFAULT_DCB_REQUEST_FIELDS,
  editorPackOptions,
  parseDcbConfig,
  previewConfirmPayload,
  previewPincodePayload,
  serializeDcbConfig,
}
