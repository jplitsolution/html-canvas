/**
 * Client helpers for vendor-scoped Universe DCB API expose URLs + payload download.
 */

export function buildDcbExposeUrls(origin, campaignId, vendorId) {
  const host = origin || 'https://your-domain.com'
  const cid = campaignId || '{campaignId}'
  const vid = vendorId || '{vendorId}'
  const base = `${host}/api/flow/dcb/${cid}/${vid}`
  return {
    base,
    configUrl: `${base}/config`,
    pincodeUrl: `${base}/pincode`,
    confirmUrl: `${base}/confirm`,
    statusUrl: `${base}/status?msisdn=`,
    screenUrl: `${base}/screen`,
  }
}

const SAMPLE_MSISDN = '566891023'
const SAMPLE_REQUEST_ID = '16726123'

export function buildDcbExposeApiPayload({ origin, campaign, vendor, vendorId } = {}) {
  const cid = campaign?.id || '{campaignId}'
  const vid = vendorId || vendor?.id || '{vendorId}'
  const urls = buildDcbExposeUrls(origin, cid, vid)
  return [
    {
      comment:
        'Step 0 — list allowed packs. Use purchaseTypeId (or pack key) on pincode. Weekly in this sample is 3.',
      method: 'GET',
      url: urls.configUrl,
      request: {},
      response: {
        purchaseTypes: [
          { packKey: 'daily', label: 'Daily', purchaseTypeId: '2', code: 'RenewalDaily' },
          { packKey: 'weekly', label: 'Weekly', purchaseTypeId: '3', code: 'RenewalWeekly' },
          { packKey: 'monthly', label: 'Monthly', purchaseTypeId: '4', code: 'RenewalMonthly' },
        ],
        pollIntervalMs: 2000,
        pollTimeoutMs: 60000,
      },
    },
    {
      comment:
        'Step 1 — send billing PIN to this MSISDN. Save requestId from the response; confirm needs it.',
      method: 'POST',
      url: urls.pincodeUrl,
      request: {
        msisdn: SAMPLE_MSISDN,
        purchaseTypeId: 3,
        pack: 'weekly',
        transactionChannel: 'Wifi',
      },
      response: {
        sent: true,
        requestId: SAMPLE_REQUEST_ID,
        msisdn: SAMPLE_MSISDN,
        stage: 'PIN_REQUIRED',
        outcome: 'PENDING',
        message: 'PIN requested successfully',
      },
    },
    {
      comment:
        'Step 2 — confirm the PIN. Send only requestId + pin (no msisdn). Then poll status.',
      method: 'POST',
      url: urls.confirmUrl,
      request: {
        requestId: SAMPLE_REQUEST_ID,
        pin: '1234',
      },
      response: {
        verified: true,
        requestId: SAMPLE_REQUEST_ID,
        stage: 'POLLING',
        outcome: 'PENDING',
        message: 'PIN confirmed. Poll status until the subscription is entitled.',
      },
    },
    {
      comment:
        'Step 3 — poll subscription status until outcome is ENTITLED (user is billed / active).',
      method: 'GET',
      url: `${urls.statusUrl}${SAMPLE_MSISDN}`,
      request: {
        msisdn: SAMPLE_MSISDN,
      },
      response: {
        msisdn: SAMPLE_MSISDN,
        outcome: 'ENTITLED',
        status: 'ACTIVE',
        entitlementActive: true,
        current: true,
      },
    },
  ]
}

export function buildDcbExposeMarkdownGuide({ origin, campaign, vendor, vendorId } = {}) {
  const cid = campaign?.id || '{campaignId}'
  const vid = vendorId || vendor?.id || '{vendorId}'
  const urls = buildDcbExposeUrls(origin, cid, vid)
  const vendorName = vendor?.name || vendor?.code || 'Vendor'
  const campaignName = campaign?.name || 'Campaign'

  return `# Vendor DCB API Specification

> **Campaign:** ${campaignName} (ID: \`${cid}\`)  
> **Vendor:** ${vendorName} (ID: \`${vid}\`)  
> **Base URL:** \`${urls.base}\`  
> **Format:** RESTful API (JSON Body or URL Query Parameters)  
> **Call Sequence:** \`Config\` → \`PIN\` → \`Confirm\` → \`Status\`

This specification describes the vendor-scoped Direct Carrier Billing (DCB) API flow for Universe Telecom integration. Vendors can implement this sequence to fetch active packs, dispatch SMS PINs, verify subscriber PINs, and poll asynchronous entitlement outcomes.

---

## 1. Integration Lifecycle

1. **Step 0 — Get Config**: Discover active billing packs, purchase type IDs, and polling settings.
2. **Step 1 — Send Billing PIN**: Initiate billing by sending a PIN to the subscriber's MSISDN. Save the returned \`requestId\`.
3. **Step 2 — Confirm PIN**: Submit the 4-digit PIN along with the \`requestId\` to activate the subscription.
4. **Step 3 — Poll Status**: Because carrier billing finalization is asynchronous, poll the status endpoint until \`outcome\` is \`ENTITLED\`.
5. **(Optional) Step 4 — Screen**: Access the rendered HTML subscription interface for webview or iframe integration.

---

## 2. Endpoints Overview

| Method | Endpoint | Summary |
|---|---|---|
| \`GET\` | \`${urls.configUrl}\` | Fetch allowed packs & polling intervals |
| \`POST\` / \`GET\` | \`${urls.pincodeUrl}\` | Send billing PIN to subscriber MSISDN |
| \`POST\` / \`GET\` | \`${urls.confirmUrl}\` | Confirm PIN with provider request ID |
| \`GET\` / \`POST\` | \`${urls.statusUrl}{msisdn}\` | Poll subscription status until ENTITLED |
| \`GET\` | \`${urls.screenUrl}\` | Rendered HTML subscription screen |

---

## 3. API Reference

### 3.1 Get Config (Packs)
\`GET ${urls.configUrl}\`

Returns active subscription tiers, purchase type mappings, and polling timing for the campaign.

#### Request
- **Method:** \`GET\` (or \`POST\`)
- **Headers:**
  - \`Accept: application/json\`
- **Parameters:** None

#### cURL Example
\`\`\`bash
curl -X GET '${urls.configUrl}' \\
  -H 'Accept: application/json'
\`\`\`

#### Responses

##### 🟢 200 OK — Success
Active purchase types and polling parameters returned.
\`\`\`json
{
  "purchaseTypes": [
    { "packKey": "daily", "label": "Daily", "purchaseTypeId": "2", "code": "RenewalDaily" },
    { "packKey": "weekly", "label": "Weekly", "purchaseTypeId": "3", "code": "RenewalWeekly" },
    { "packKey": "monthly", "label": "Monthly", "purchaseTypeId": "4", "code": "RenewalMonthly" }
  ],
  "pollIntervalMs": 2000,
  "pollTimeoutMs": 60000
}
\`\`\`

##### 🔴 400 Bad Request — Invalid Request
\`\`\`json
{
  "statusCode": 400,
  "error": "Error",
  "message": "This campaign does not expose DCB billing APIs"
}
\`\`\`

##### 🔴 404 Not Found — Campaign or Vendor Not Found
\`\`\`json
{
  "statusCode": 404,
  "error": "Error",
  "message": "Campaign or Vendor not found"
}
\`\`\`

##### 🔴 500 Internal Server Error — Server Error
\`\`\`json
{
  "statusCode": 500,
  "error": "Error",
  "message": "Internal Server Error"
}
\`\`\`

##### 🔴 503 Service Unavailable — DCB Not Configured
\`\`\`json
{
  "statusCode": 503,
  "error": "Error",
  "message": "Universe DCB is not configured or disabled"
}
\`\`\`

---

### 3.2 Send Billing PIN (Pincode)
\`POST ${urls.pincodeUrl}\`

Dispatches an SMS verification PIN to the subscriber's mobile phone number.

#### Request
- **Method:** \`POST\` (or \`GET\`)
- **Headers:**
  - \`Content-Type: application/json\`
  - \`Accept: application/json\`
- **Parameters / Request Body Schema:**
  | Parameter | Type | Required | Example | Description |
  |---|---|---|---|---|
  | \`msisdn\` | string | Yes | \`566891023\` | Subscriber phone number (numeric digits) |
  | \`purchaseTypeId\` | number/string | No | \`3\` | Billing plan ID from Config |
  | \`pack\` | string | No | \`weekly\` | Pack key (e.g. \`weekly\`, \`daily\`) |
  | \`transactionChannel\` | string | No | \`Wifi\` | Channel type: \`Wifi\` or \`HE\` |

#### cURL Example
\`\`\`bash
curl -X POST '${urls.pincodeUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '{
    "msisdn": "566891023",
    "purchaseTypeId": 3,
    "pack": "weekly",
    "transactionChannel": "Wifi"
  }'
\`\`\`

#### Responses

##### 🟢 200 OK — PIN Dispatched
> **CRITICAL:** Retain the \`requestId\` value from this response. You must provide it in the PIN confirmation step.

\`\`\`json
{
  "sent": true,
  "requestId": "16726123",
  "msisdn": "566891023",
  "stage": "PIN_REQUIRED",
  "outcome": "PENDING",
  "message": "PIN requested successfully"
}
\`\`\`

##### 🔴 400 Bad Request — Invalid MSISDN
\`\`\`json
{
  "statusCode": 400,
  "error": "Error",
  "message": "Subscriber mobile number is invalid or unsupported"
}
\`\`\`

##### 🔴 403 Forbidden — Offer Stopped / Capping Limit
\`\`\`json
{
  "statusCode": 403,
  "error": "Error",
  "message": "Offer is stopped due to capping limit"
}
\`\`\`

##### 🔴 404 Not Found — Campaign or Vendor Not Found
\`\`\`json
{
  "statusCode": 404,
  "error": "Error",
  "message": "Campaign or Vendor not found"
}
\`\`\`

##### 🟡 429 Too Many Requests — Rate Limit Exceeded
\`\`\`json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Too many requests. Please wait a minute before requesting another PIN."
}
\`\`\`

##### 🔴 500 Internal Server Error — Server Error
\`\`\`json
{
  "statusCode": 500,
  "error": "Error",
  "message": "Internal Server Error"
}
\`\`\`

##### 🔴 502 Bad Gateway — Upstream DCB Gateway Error
\`\`\`json
{
  "statusCode": 502,
  "error": "Error",
  "message": "Upstream telco gateway error while dispatching PIN"
}
\`\`\`

---

### 3.3 Confirm Billing PIN
\`POST ${urls.confirmUrl}\`

Submits the 4-digit PIN entered by the subscriber with the provider request ID. Note: Send only \`requestId\` and \`pin\` (no MSISDN needed).

#### Request
- **Method:** \`POST\` (or \`GET\`)
- **Headers:**
  - \`Content-Type: application/json\`
  - \`Accept: application/json\`
- **Parameters / Request Body Schema:**
  | Parameter | Type | Required | Example | Description |
  |---|---|---|---|---|
  | \`requestId\` | string | Yes | \`16726123\` | Provider Request ID from Step 1 |
  | \`pin\` | string | Yes | \`1234\` | 4-digit PIN entered by subscriber |

#### cURL Example
\`\`\`bash
curl -X POST '${urls.confirmUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '{
    "requestId": "16726123",
    "pin": "1234"
  }'
\`\`\`

#### Responses

##### 🟢 200 OK — PIN Accepted
\`\`\`json
{
  "verified": true,
  "requestId": "16726123",
  "stage": "POLLING",
  "outcome": "PENDING",
  "message": "PIN confirmed. Poll status until the subscription is entitled."
}
\`\`\`

##### 🔴 400 Bad Request — Invalid PIN
\`\`\`json
{
  "statusCode": 400,
  "error": "Error",
  "message": "Incorrect or expired PIN entered"
}
\`\`\`

##### 🔴 403 Forbidden — Offer Inactive / Capping Limit
\`\`\`json
{
  "statusCode": 403,
  "error": "Error",
  "message": "Offer is stopped due to capping limit"
}
\`\`\`

##### 🔴 404 Not Found — Request ID or Vendor Not Found
\`\`\`json
{
  "statusCode": 404,
  "error": "Error",
  "message": "Provider request ID or Vendor not found"
}
\`\`\`

##### 🟡 429 Too Many Requests — Verification Limit Exceeded
\`\`\`json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Too many failed confirmation attempts. Please try again later."
}
\`\`\`

##### 🔴 500 Internal Server Error — Server Error
\`\`\`json
{
  "statusCode": 500,
  "error": "Error",
  "message": "Internal Server Error"
}
\`\`\`

##### 🔴 502 Bad Gateway — Upstream Confirmation Failure
\`\`\`json
{
  "statusCode": 502,
  "error": "Error",
  "message": "Upstream error confirming subscription PIN"
}
\`\`\`

---

### 3.4 Poll Subscription Status
\`GET ${urls.statusUrl}{msisdn}\`

Checks if subscriber billing and entitlement has finalized upstream. Repeat every 2 seconds until \`outcome\` is \`ENTITLED\` or timeout (60s).

#### Request
- **Method:** \`GET\` (or \`POST\`)
- **Headers:**
  - \`Accept: application/json\`
- **Parameters:**
  | Parameter | In | Type | Required | Example | Description |
  |---|---|---|---|---|---|
  | \`msisdn\` | Query | string | Yes | \`566891023\` | Subscriber mobile phone number |

#### cURL Example
\`\`\`bash
curl -X GET '${urls.statusUrl}566891023' \\
  -H 'Accept: application/json'
\`\`\`

#### Responses

##### 🟢 200 OK — Subscription Entitled (Success)
\`\`\`json
{
  "msisdn": "566891023",
  "outcome": "ENTITLED",
  "status": "ACTIVE",
  "entitlementActive": true,
  "current": true
}
\`\`\`

##### 🟡 200 OK — Polling In Progress
\`\`\`json
{
  "msisdn": "566891023",
  "outcome": "PENDING",
  "status": "PENDING_CONFIRMATION",
  "entitlementActive": false,
  "current": false
}
\`\`\`

##### 🔴 200 OK — Low Balance / Recharge Required
\`\`\`json
{
  "msisdn": "566891023",
  "outcome": "LOW_BALANCE",
  "status": "PARKED_NO_BALANCE",
  "entitlementActive": false
}
\`\`\`

##### 🔴 400 Bad Request — Missing MSISDN
\`\`\`json
{
  "statusCode": 400,
  "error": "Error",
  "message": "MSISDN query parameter is required"
}
\`\`\`

##### 🔴 404 Not Found — Session or Campaign Not Found
\`\`\`json
{
  "statusCode": 404,
  "error": "Error",
  "message": "Campaign or Subscription record not found"
}
\`\`\`

##### 🟡 429 Too Many Requests — Polling Rate Limit Exceeded
\`\`\`json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Polling frequency exceeded. Maintain a minimum 2-second interval."
}
\`\`\`

##### 🔴 500 Internal Server Error — Server Error
\`\`\`json
{
  "statusCode": 500,
  "error": "Error",
  "message": "Internal Server Error"
}
\`\`\`

---

## 4. Polling & Status Outcome Guide

| Outcome | Entitlement Active | Description & Action |
|---|---|---|
| \`ENTITLED\` | \`true\` | **Success**: Subscription active. Grant user access & count conversion. |
| \`PENDING\` | \`false\` | **In Progress**: Continue polling every 2s until timeout (60s). |
| \`LOW_BALANCE\` | \`false\` | **Low Balance**: Subscriber lacks credit to renew. Prompt recharge. |
| \`TERMINAL_FAILURE\` | \`false\` | **Failed**: Activation rejected or expired. Stop polling. |

---

## 5. Standard HTTP Status Codes & Error Handling Reference

| Status Code | Status Name | Description & Vendor Action |
|---|---|---|
| \`200 OK\` | Success | Request succeeded. Check JSON body outcome / stage. |
| \`400 Bad Request\` | Client Error | Invalid or missing request parameters. Do NOT retry without correcting input. |
| \`401 Unauthorized\` | Unauthorized | Missing or invalid API authentication credentials. |
| \`403 Forbidden\` | Forbidden / Capped | Offer is capped or vendor is inactive. Pause traffic dispatch immediately. |
| \`404 Not Found\` | Not Found | Campaign ID or Vendor ID was not found. Check your endpoint URL. |
| \`429 Too Many Requests\` | Rate Limited | Polling or request limit exceeded. Back off and respect polling interval (2s). |
| \`500 Internal Server Error\` | Server Error | Internal server processing error. Retry with exponential backoff. |
| \`502 Bad Gateway\` | Upstream Gateway Error | Upstream carrier DCB gateway timed out or rejected request. Retry after delay. |
| \`503 Service Unavailable\` | Service Unavailable | Universe DCB integration is not configured or under maintenance. |
`
}

export function buildDcbExposeApiGuide(opts = {}) {
  if (opts && opts.format === 'markdown') {
    return buildDcbExposeMarkdownGuide(opts)
  }
  return JSON.stringify(
    {
      comment:
        'Vendor DCB billing APIs. Call in order: config → pincode → confirm → status. GET or POST. Query or JSON body.',
      apis: buildDcbExposeApiPayload(opts),
    },
    null,
    2,
  )
}
