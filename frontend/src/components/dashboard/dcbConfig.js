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
  confirm: '/api/dcb/confirmation',
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
  confirmMethod: 'PUT',
  purchaseTypeMappings: DEFAULT_PURCHASE_TYPE_MAPPINGS,
  skipSinglePackPage: false,
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
    const rawConfirmMethod = String(
      parsed.confirmMethod || parsed.endpoints?.confirmMethod || fallback.confirmMethod || 'PUT',
    ).trim().toUpperCase()
    const confirmMethod = ['PUT', 'POST', 'GET'].includes(rawConfirmMethod) ? rawConfirmMethod : 'PUT'

    return {
      baseUrl: String(parsed.baseUrl || fallback.baseUrl),
      merchantId: String(parsed.merchantId ?? fallback.merchantId),
      serviceId: String(parsed.serviceId ?? fallback.serviceId),
      operatorCode: String(parsed.operatorCode || fallback.operatorCode),
      confirmMethod,
      purchaseTypeMappings: normalizeMappings(
        parsed.purchaseTypeMappings || parsed.purchaseTypes || parsed.purchaseTypeMap
      ),
      skipSinglePackPage: parsed.skipSinglePackPage === true,
      pollIntervalMs: Number.isFinite(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : fallback.pollIntervalMs,
      pollTimeoutMs: Number.isFinite(pollTimeoutMs) && pollTimeoutMs > 0 ? pollTimeoutMs : fallback.pollTimeoutMs,
      endpoints: {
        ...normalizeEndpoints(parsed.endpoints, fallback.endpoints),
        confirmMethod,
      },
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
  const confirmMethod = normalized.confirmMethod || 'PUT'
  return JSON.stringify({
    ...normalized,
    baseUrl: normalized.baseUrl.trim().replace(/\/+$/, ''),
    merchantId: normalized.merchantId.trim(),
    serviceId: normalized.serviceId.trim(),
    operatorCode: normalized.operatorCode.trim(),
    confirmMethod,
    purchaseTypeMappings: normalized.purchaseTypeMappings
      .map((item) => ({
        packKey: String(item.packKey || '').trim(),
        label: String(item.label || '').trim(),
        purchaseTypeId: String(item.purchaseTypeId || '').trim(),
      }))
      .filter((item) => item.packKey && item.purchaseTypeId),
    skipSinglePackPage: normalized.skipSinglePackPage === true,
    endpoints: {
      ...Object.fromEntries(
        Object.entries(normalized.endpoints).map(([key, value]) => [key, String(value || '').trim() || DEFAULT_DCB_ENDPOINTS[key]])
      ),
      confirmMethod,
    },
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

function previewPublicConfigResponse(current) {
  return JSON.stringify(
    {
      success: true,
      data: {
        merchantId: current.merchantId,
        serviceId: current.serviceId,
        operator: current.operatorCode,
        purchaseTypes: current.purchaseTypeMappings.map((m) => ({
          packKey: m.packKey,
          label: m.label,
          purchaseTypeId: m.purchaseTypeId,
        })),
        pollIntervalMs: current.pollIntervalMs,
        pollTimeoutMs: current.pollTimeoutMs,
      },
    },
    null,
    2,
  )
}

function previewSubEntitledResponse(current) {
  const activeKey = current.responsePaths.entitlementActive || 'entitlementActive'
  const currentKey = current.responsePaths.current || 'current'
  return JSON.stringify(
    {
      success: true,
      data: {
        items: [
          {
            serviceId: current.serviceId,
            status: 'ACTIVE',
            [activeKey]: true,
            [currentKey]: true,
            operator: current.operatorCode,
          },
        ],
      },
    },
    null,
    2,
  )
}

function previewPinSuccessResponse(current) {
  const sampleId = '16726123'
  return JSON.stringify(
    {
      success: true,
      providerRequestId: sampleId,
      data: {
        PinInfo: {
          ID: sampleId,
          PinCode: '0000',
        },
      },
      message: 'PIN request sent successfully',
    },
    null,
    2,
  )
}

function previewConfirmSuccessResponse(current) {
  return JSON.stringify(
    {
      success: true,
      status: 'CONFIRMED',
      message: 'PIN verified successfully',
      data: {
        [current.request.requestIdField || 'id']: '16726123',
        status: 'CONFIRMED',
      },
    },
    null,
    2,
  )
}

/**
 * Swagger-like Markdown API specification from live DCB UI config (endpoints + field names + response paths).
 * Change fields in Campaign API -> download again to refresh the doc.
 */
function buildDcbApiGuide(config) {
  const current = parseDcbConfig(config)
  const f = current.request
  const ep = current.endpoints
  const pinUrl = joinUrl(current.baseUrl, ep.pincode)
  const confirmUrl = joinUrl(current.baseUrl, ep.confirm)
  const subUrl = joinUrl(current.baseUrl, ep.subscriptions)
  const publicUrl = joinUrl(current.baseUrl, ep.publicConfig)
  const confirmMethod = current.confirmMethod || current.endpoints?.confirmMethod || 'PUT'
  const pinBody = JSON.stringify(previewPincodePayload(current), null, 2)
  const confirmBody = JSON.stringify(previewConfirmPayload(current), null, 2)
  const packsTable = current.purchaseTypeMappings.length
    ? current.purchaseTypeMappings
        .map((m) => `| \`${m.packKey}\` | ${m.label} | \`${m.purchaseTypeId}\` |`)
        .join('\n')
    : '| _default_ | Default Pack | `1` |'
  const pollSec = Math.round(Number(current.pollIntervalMs) / 1000) || 2
  const timeoutSec = Math.round(Number(current.pollTimeoutMs) / 1000) || 60

  return `# Universe Telecom DCB API Specification

> **Base URL:** \`${current.baseUrl}\`  
> **Merchant ID:** \`${current.merchantId}\`  
> **Service ID:** \`${current.serviceId}\`  
> **Operator Code:** \`${current.operatorCode}\`  
> **Confirmation Method:** \`${confirmMethod}\`  
> **Polling Interval:** Every ${pollSec}s (Timeout: ${timeoutSec}s)

This specification is generated dynamically from the live Campaign API settings. It details the REST endpoints, request structures, response schemas, and asynchronous polling lifecycles for Universe Telecom DCB integration.

---

## 1. Global Settings & Purchase Types

### Configuration Overview
| Parameter | Value | Description |
|---|---|---|
| **Base URL** | \`${current.baseUrl}\` | Upstream DCB gateway host |
| **Merchant ID** | \`${current.merchantId}\` | Registered DCB merchant identifier |
| **Service ID** | \`${current.serviceId}\` | Universe Telecom service identifier |
| **Operator Code** | \`${current.operatorCode}\` | Telco operator identifier (e.g. WM) |
| **Confirmation Method** | \`${confirmMethod}\` | HTTP method used for PIN verification |
| **Polling Settings** | ${pollSec}s interval, up to ${timeoutSec}s | Entitlement verification frequency |

### Configured Purchase Types (Packs)
| Pack Key | Plan Name | Purchase Type ID |
|---|---|---|
${packsTable}

---

## 2. Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| \`GET\` | \`${ep.publicConfig}\` | Fetch active packs & funnel configuration |
| \`GET\` | \`${ep.subscriptions}\` | Check subscriber entitlement & subscription status |
| \`POST\` | \`${ep.pincode}\` | Request a subscription PIN via SMS |
| \`${confirmMethod}\` | \`${ep.confirm}\` | Confirm subscriber PIN with provider request ID |

---

## 3. API Reference

### 3.1 Public Config (Packs)
\`GET ${ep.publicConfig}\`  
Full URL: \`${publicUrl}\`

Returns active billing packs, purchase type mappings, and polling settings for the subscriber funnel.

#### Request
- **Method:** \`GET\`
- **Headers:**
  - \`Accept: application/json\`
- **Parameters:** None

#### cURL Example
\`\`\`bash
curl -X GET '${publicUrl}' \\
  -H 'Accept: application/json'
\`\`\`

#### Responses

##### 🟢 200 OK — Success
\`\`\`json
${previewPublicConfigResponse(current)}
\`\`\`

---

### 3.2 Check Subscriptions (Entitlement)
\`GET ${ep.subscriptions}\`  
Full URL: \`${subUrl}\`

Queries the subscriber's current subscription and entitlement status. Use before initiating a PIN request and periodically while polling after PIN confirmation.

#### Request
- **Method:** \`GET\`
- **Headers:**
  - \`Accept: application/json\`
- **Query Parameters:**
  | Parameter | Type | Required | Default / Value | Description |
  |---|---|---|---|---|
  | \`${f.msisdnField}\` | string | Yes | \`566891023\` | Subscriber phone number (numeric digits) |
  | \`${f.serviceIdField}\` | string/number | Yes | \`${current.serviceId}\` | Service identifier |
  | \`${f.currentField}\` | boolean | Yes | \`true\` | Filter for current active subscription record |

#### cURL Example
\`\`\`bash
curl -X GET '${subUrl}?${f.msisdnField}=566891023&${f.serviceIdField}=${current.serviceId}&${f.currentField}=true' \\
  -H 'Accept: application/json'
\`\`\`

#### Responses

##### 🟢 200 OK — Active Entitlement Found
Subscriber has an active entitled subscription.
\`\`\`json
${previewSubEntitledResponse(current)}
\`\`\`

##### 🟡 200 OK — No Active Subscription (New User)
Subscriber has no current subscription for this service. Proceed to PIN request.
\`\`\`json
{
  "success": true,
  "data": {
    "items": []
  }
}
\`\`\`

##### 🔴 400 Bad Request — Missing Parameters
\`\`\`json
{
  "success": false,
  "error": "BAD_REQUEST",
  "message": "Missing required parameter: ${f.msisdnField}"
}
\`\`\`

---

### 3.3 Request a Subscription PIN (Pincode)
\`POST ${ep.pincode}\`  
Full URL: \`${pinUrl}\`

Initiates the DCB billing process and requests Universe Telecom to dispatch a one-time verification PIN to the subscriber's mobile device via SMS.

#### Request
- **Method:** \`POST\`
- **Headers:**
  - \`Content-Type: application/json\`
  - \`Accept: application/json\`
- **Request Body Schema:**
  | Field | Type | Required | Config Key | Description |
  |---|---|---|---|---|
  | \`${f.merchantIdField}\` | number/string | Yes | \`merchantId\` | Merchant identifier (\`${current.merchantId}\`) |
  | \`${f.serviceIdField}\` | number/string | Yes | \`serviceId\` | Service identifier (\`${current.serviceId}\`) |
  | \`${f.purchaseTypeIdField}\` | number/string | Yes | \`purchaseTypeId\` | Selected pack billing period ID (e.g. \`3\`) |
  | \`${f.msisdnField}\` | string | Yes | \`msisdn\` | Subscriber phone number |
  | \`${f.transactionChannelField}\` | string | Yes | \`transactionChannel\` | Network channel: \`Wifi\` or \`HE\` |
  | \`${f.operatorField}\` | string | Yes | \`operatorCode\` | Operator code (\`${current.operatorCode}\`) |
  | \`${f.subscriptionField}\` | string | No | \`subscription\` | Existing subscription reference (or empty string) |

#### cURL Example
\`\`\`bash
curl -X POST '${pinUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '${pinBody.replace(/'/g, "\\'")}'
\`\`\`

#### Request Body (JSON)
\`\`\`json
${pinBody}
\`\`\`

#### Responses

##### 🟢 200 OK — PIN Dispatched
SMS PIN has been dispatched to the subscriber's handset.

> **CRITICAL:** Extract the Provider Request ID from response path \`${current.responsePaths.requestId || 'data.PinInfo.ID'}\` (or \`providerRequestId\`). This ID is required for PIN confirmation (\`${f.requestIdField}\`).

\`\`\`json
${previewPinSuccessResponse(current)}
\`\`\`

##### 🔴 400 / 422 Bad Request — Upstream Rejected
\`\`\`json
{
  "success": false,
  "error": "INVALID_MSISDN",
  "message": "Invalid subscriber mobile number or unsupported operator network"
}
\`\`\`

##### 🔴 500 Internal Server Error — Gateway Error
\`\`\`json
{
  "success": false,
  "error": "GATEWAY_TIMEOUT",
  "message": "Upstream telco gateway timeout while requesting PIN"
}
\`\`\`

##### 🟡 429 Too Many Requests — Rate Limit Exceeded
\`\`\`json
{
  "success": false,
  "error": "TOO_MANY_REQUESTS",
  "message": "Too many PIN requests from this client. Please wait before retrying."
}
\`\`\`

##### 🔴 502 Bad Gateway — Provider Gateway Error
\`\`\`json
{
  "success": false,
  "error": "BAD_GATEWAY",
  "message": "Failed to communicate with Universe Telecom upstream gateway"
}
\`\`\`

---

### 3.4 Confirm the Subscription PIN
\`${confirmMethod} ${ep.confirm}\`  
Full URL: \`${confirmUrl}\`

Submits the 4-digit PIN entered by the subscriber along with the Provider Request ID to verify and activate the subscription.

#### Request
- **Method:** \`${confirmMethod}\`
- **Headers:**
  - \`Content-Type: application/json\`
  - \`Accept: application/json\`
- **Request Body Schema:**
  | Field | Type | Required | Config Key | Description |
  |---|---|---|---|---|
  | \`${f.requestIdField}\` | string | Yes | \`requestId\` | Provider request ID obtained from PIN response |
  | \`${f.pinField}\` | string | Yes | \`pinCode\` | 4-digit PIN entered by the subscriber |
  | \`${f.msisdnField}\` | string | Yes | \`msisdn\` | Same mobile number used for the PIN request |
  | \`${f.serviceIdField}\` | number/string | Yes | \`serviceId\` | Service identifier (\`${current.serviceId}\`) |
  | \`${f.purchaseTypeIdField}\` | number/string | Yes | \`purchaseTypeId\` | Same purchase type ID as PIN request |

#### cURL Example
\`\`\`bash
curl -X ${confirmMethod} '${confirmUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '${confirmBody.replace(/'/g, "\\'")}'
\`\`\`

#### Request Body (JSON)
\`\`\`json
${confirmBody}
\`\`\`

#### Responses

##### 🟢 200 OK — PIN Verified / Accepted
The PIN has been validated by Universe Telecom.

> **IMPORTANT:** A successful confirmation HTTP response indicates PIN verification, but final billing and entitlement are finalized asynchronously by the Universe Telecom callback. You must poll the subscriptions endpoint to verify active status.

\`\`\`json
${previewConfirmSuccessResponse(current)}
\`\`\`

##### 🔴 400 / 422 Bad Request — Invalid or Expired PIN
\`\`\`json
{
  "success": false,
  "error": "INVALID_PIN",
  "message": "The entered PIN is incorrect or has expired"
}
\`\`\`

##### 🔴 500 Internal Server Error — Provider Error
\`\`\`json
{
  "success": false,
  "error": "PROVIDER_ERROR",
  "message": "Upstream error confirming subscription PIN"
}
\`\`\`

##### 🟡 429 Too Many Requests — Rate Limit Exceeded
\`\`\`json
{
  "success": false,
  "error": "TOO_MANY_REQUESTS",
  "message": "Too many confirmation attempts. Please wait before retrying."
}
\`\`\`

##### 🔴 502 Bad Gateway — Provider Confirmation Gateway Error
\`\`\`json
{
  "success": false,
  "error": "BAD_GATEWAY",
  "message": "Upstream telco gateway error during PIN confirmation"
}
\`\`\`

---

## 4. Post-Confirmation Polling Lifecycle

After successful PIN confirmation, poll the subscriptions endpoint every **${pollSec} seconds** for up to **${timeoutSec} seconds**:

\`\`\`http
GET ${subUrl}?${f.msisdnField}={msisdn}&${f.serviceIdField}=${current.serviceId}&${f.currentField}=true
\`\`\`

### Status Outcome Mapping
| Status | Entitlement Active | Current | Outcome / Action |
|---|---|---|---|
| \`ACTIVE\` | \`true\` | \`true\` | **ENTITLED**: Subscription active and billed. Route to Success page. |
| \`TRIAL_ACTIVE\` | \`true\` | \`true\` | **ENTITLED**: Active trial period. Route to Success page. |
| \`PARKED_NO_BALANCE\` | \`false\` | Any | **LOW BALANCE**: Insufficient credit to charge. Show recharge notification. |
| \`SUSPENDED\` | \`false\` | Any | **LOW BALANCE**: Carrier suspension. Show low balance notification. |
| \`PENDING_PIN\` / \`PENDING_CONFIRMATION\` | Any | Any | **PENDING**: Still processing. Continue polling. |
| \`DEACTIVATED\` / \`EXPIRED\` / \`FAILED\` | \`false\` | Any | **TERMINAL**: Activation failed or expired. Stop polling. |

---

## 5. Maintain from UI

- Endpoints, request field names, response paths, merchant/service/operator, and pack -> purchaseTypeId mappings live under **Campaign -> API -> Universe Telecom DCB**.
- If the provider adds or renames fields, update them there and re-download this guide to keep your documentation in sync.

---

## 6. Standard HTTP Status Codes & Error Handling Reference

| Status Code | Status Name | Description & Action |
|---|---|---|
| \`200 OK\` | Success | Request succeeded. Check body payload or outcome. |
| \`400 / 422 Bad Request\` | Validation Error | Missing parameters, invalid MSISDN or incorrect PIN code. Do not retry without correcting input. |
| \`401 / 403 Forbidden\` | Unauthorized / Inactive | Unauthorized request or campaign access restricted. |
| \`404 Not Found\` | Not Found | Requested endpoint or resource was not found. |
| \`429 Too Many Requests\` | Rate Limited | Request rate limit exceeded. Back off and respect polling interval. |
| \`500 Internal Server Error\` | Server Error | Internal processing error. Retry with exponential backoff. |
| \`502 Bad Gateway\` | Gateway Error | Upstream carrier DCB gateway timed out or failed. |
| \`503 Service Unavailable\` | Service Unavailable | Service is temporarily unavailable or undergoing maintenance. |
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
