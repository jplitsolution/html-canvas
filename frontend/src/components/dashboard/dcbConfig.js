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

function joinUrl(baseUrl, path) {
  const base = String(baseUrl || '').replace(/\/+$/, '')
  const p = String(path || '')
  if (/^https?:\/\//i.test(p)) return p
  if (!base) return p
  return `${base}${p.startsWith('/') ? p : `/${p}`}`
}

/**
 * Markdown API guide from live DCB UI config (endpoints + field names).
 * Change fields in Campaign API → download again to refresh the doc.
 */
function buildDcbApiGuide(config) {
  const current = parseDcbConfig(config)
  const f = current.request
  const ep = current.endpoints
  const pinUrl = joinUrl(current.baseUrl, ep.pincode)
  const confirmUrl = joinUrl(current.baseUrl, ep.confirm)
  const subUrl = joinUrl(current.baseUrl, ep.subscriptions)
  const publicUrl = joinUrl(current.baseUrl, ep.publicConfig)
  const pinBody = JSON.stringify(previewPincodePayload(current), null, 2)
  const confirmBody = JSON.stringify(previewConfirmPayload(current), null, 2)
  const packs = current.purchaseTypeMappings
    .map((m) => `- \`${m.packKey}\` (${m.label}) → purchaseTypeId \`${m.purchaseTypeId}\``)
    .join('\n')
  const pollSec = Math.round(Number(current.pollIntervalMs) / 1000) || 2
  const timeoutSec = Math.round(Number(current.pollTimeoutMs) / 1000) || 60

  return `# Universe Telecom DCB API guide

Generated from Campaign API settings. Edit endpoints / field names in the UI, then download again.

| Setting | Value |
|---|---|
| Base URL | \`${current.baseUrl}\` |
| Merchant ID | \`${current.merchantId}\` |
| Service ID | \`${current.serviceId}\` |
| Operator | \`${current.operatorCode}\` |
| Poll | every ${pollSec}s for up to ${timeoutSec}s |

### Purchase types

${packs || '_No pack mappings configured._'}

---

## 1. Public config (packs)

\`\`\`http
GET ${publicUrl}
\`\`\`

Returns packs / purchase types for the funnel.

---

## 2. Check subscriptions (entitlement)

\`\`\`http
GET ${subUrl}?${f.msisdnField}={msisdn}&${f.serviceIdField}=${current.serviceId}&${f.currentField}=true
\`\`\`

Use before PIN and while polling after confirm.

---

## 3. Request a subscription PIN

Starts the subscription process and asks Universe Telecom to send or generate a PIN.

\`\`\`http
POST ${ep.pincode}
Content-Type: application/json
\`\`\`

Full URL: \`${pinUrl}\`

### Request body

| Field | Config key | Required | Description |
|---|---|---:|---|
| \`${f.merchantIdField}\` | merchantId | Yes | Use \`${current.merchantId}\` |
| \`${f.serviceIdField}\` | serviceId | Yes | Use \`${current.serviceId}\` |
| \`${f.purchaseTypeIdField}\` | purchaseTypeId | Yes | Selected billing period |
| \`${f.msisdnField}\` | msisdn | Yes | Subscriber phone number |
| \`${f.transactionChannelField}\` | transactionChannel | Yes | \`Wifi\` or \`HE\` |
| \`${f.operatorField}\` | operator | Yes | Use \`${current.operatorCode}\` |
| \`${f.subscriptionField}\` | subscription | No | Existing provider subscription; otherwise empty string |

### Example request

\`\`\`bash
curl -X POST '${pinUrl}' \\
  -H 'Content-Type: application/json' \\
  -d @payload.json
\`\`\`

\`\`\`json
${pinBody}
\`\`\`

### Response handling

The provider response is returned in \`${current.responsePaths.envelope || 'data'}\`.  
Save the provider request ID at path \`${current.responsePaths.requestId || 'data.PinInfo.ID'}\` — required for PIN confirmation (sent as \`${f.requestIdField}\`).

---

## 4. Confirm the subscription PIN

Submits the subscriber's PIN to Universe Telecom.

\`\`\`http
POST ${ep.confirm}
Content-Type: application/json
\`\`\`

Full URL: \`${confirmUrl}\`

### Request body

| Field | Config key | Required | Description |
|---|---|---:|---|
| \`${f.requestIdField}\` | requestId | Yes | Provider request ID from the PIN API |
| \`${f.pinField}\` | pinCode | Yes | PIN entered by the subscriber |
| \`${f.msisdnField}\` | msisdn | Yes | Same phone used for the PIN request |
| \`${f.serviceIdField}\` | serviceId | Yes | Use \`${current.serviceId}\` |
| \`${f.purchaseTypeIdField}\` | purchaseTypeId | Yes | Same purchase type as PIN request |

### Example request

\`\`\`bash
curl -X POST '${confirmUrl}' \\
  -H 'Content-Type: application/json' \\
  -d @payload.json
\`\`\`

\`\`\`json
${confirmBody}
\`\`\`

### Important activation behavior

A successful confirmation HTTP response does **not** prove the subscriber was charged. Billing and entitlement are finalized asynchronously by the Universe Telecom callback.

After confirmation, poll the subscriptions endpoint every ${pollSec}–${pollSec + 1} seconds for up to ${timeoutSec} seconds:

\`\`\`http
GET ${subUrl}?${f.msisdnField}={msisdn}&${f.serviceIdField}=${current.serviceId}&${f.currentField}=true
\`\`\`

Complete the mobile flow only when the response reports an entitled state (\`${current.responsePaths.entitlementActive || 'entitlementActive'}\` / status paths configured in UI).

---

## Maintain from UI

- Endpoints, request field names, response paths, merchant/service/operator, and pack → purchaseTypeId map live under **Campaign → API → Universe Telecom DCB**.
- If the provider adds or renames fields, update them there and re-download this guide.
`
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
  buildDcbApiGuide,
  editorPackOptions,
  joinUrl,
  parseDcbConfig,
  previewConfirmPayload,
  previewPincodePayload,
  serializeDcbConfig,
}
