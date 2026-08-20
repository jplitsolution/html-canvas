const DEFAULT_PURCHASE_TYPE_MAPPINGS = [
  { packKey: 'daily', label: 'Daily', purchaseTypeId: '2' },
  { packKey: 'weekly', label: 'Weekly', purchaseTypeId: '3' },
  { packKey: 'monthly', label: 'Monthly', purchaseTypeId: '4' },
]

const DEFAULT_DCB_CONFIG = {
  baseUrl: 'https://bilunipal.tickhighs.com',
  merchantId: '169',
  serviceId: '581',
  operatorCode: 'WM',
  purchaseTypeMappings: DEFAULT_PURCHASE_TYPE_MAPPINGS,
  pollIntervalMs: 2000,
  pollTimeoutMs: 60000,
  responsePaths: {
    envelope: 'data',
    items: 'data.items',
    status: 'status',
    entitlementActive: 'entitlementActive',
    current: 'current',
    serviceId: 'serviceId',
  },
}

function cloneDefaults() {
  return {
    ...DEFAULT_DCB_CONFIG,
    purchaseTypeMappings: DEFAULT_PURCHASE_TYPE_MAPPINGS.map((item) => ({ ...item })),
    responsePaths: { ...DEFAULT_DCB_CONFIG.responsePaths },
  }
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
    responsePaths: Object.fromEntries(
      Object.entries(normalized.responsePaths).map(([key, value]) => [key, String(value || '').trim()])
    ),
  })
}

export { DEFAULT_DCB_CONFIG, parseDcbConfig, serializeDcbConfig }
