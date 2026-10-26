import { apiClient } from './client'

export function clampPayoutPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 100
  return Math.min(100, Math.max(0, Math.round(n)))
}

export function buildOtpExposeUrls(origin, campaignId, vendorId) {
  const host = origin || 'https://your-domain.com'
  const cid = campaignId || '{campaignId}'
  const vid = vendorId || '{vendorId}'
  const base = `${host}/api/otp/${cid}/${vid}`
  return {
    base,
    sendUrl: `${base}/send?msisdn=`,
    verifyUrl: `${base}/verify?msisdn=&otp=`,
  }
}

const SAMPLE_MSISDN = '566891023'

export function buildOtpExposeApiPayload({ origin, campaign, vendor, vendorId } = {}) {
  const cid = campaign?.id || '{campaignId}'
  const vid = vendorId || vendor?.id || '{vendorId}'
  const urls = buildOtpExposeUrls(origin, cid, vid)
  return [
    {
      comment: 'Step 1 — send OTP to this MSISDN. Use the same msisdn on verify.',
      method: 'POST',
      url: urls.sendUrl.replace(/\?.*$/, ''),
      request: {
        msisdn: SAMPLE_MSISDN,
        pack: 'daily',
      },
      response: {
        sent: true,
        visitId: 1,
        msisdn: SAMPLE_MSISDN,
        message: 'OTP sent successfully',
      },
    },
    {
      comment: 'Step 2 — verify the OTP the user received. Conversion is counted on success.',
      method: 'POST',
      url: urls.verifyUrl.replace(/\?.*$/, ''),
      request: {
        msisdn: SAMPLE_MSISDN,
        otp: '1234',
      },
      response: {
        verified: true,
        visitId: 1,
        msisdn: SAMPLE_MSISDN,
        message: 'OTP verified successfully',
      },
    },
  ]
}

export function buildOtpExposeMarkdownGuide({ origin, campaign, vendor, vendorId } = {}) {
  const cid = campaign?.id || '{campaignId}'
  const vid = vendorId || vendor?.id || '{vendorId}'
  const urls = buildOtpExposeUrls(origin, cid, vid)
  const vendorName = vendor?.name || vendor?.code || 'Vendor'
  const campaignName = campaign?.name || 'Campaign'
  const sendBase = urls.sendUrl.replace(/\?.*$/, '')
  const verifyBase = urls.verifyUrl.replace(/\?.*$/, '')

  return `# Vendor OTP API Specification

> **Campaign:** ${campaignName} (ID: \`${cid}\`)  
> **Vendor:** ${vendorName} (ID: \`${vid}\`)  
> **Base URL:** \`${urls.base}\`  
> **Format:** RESTful API (JSON Body or URL Query Parameters)  
> **Call Sequence:** \`Send OTP\` → \`Verify OTP\`

This specification describes the vendor-scoped One-Time Password (OTP) verification API flow. Vendors can integrate these endpoints to dispatch verification codes via SMS and confirm them to trigger conversion.

---

## 1. Integration Lifecycle

1. **Step 1 — Send OTP**: Dispatch a one-time verification passcode to the subscriber's phone number via SMS.
2. **Step 2 — Verify OTP**: Verify the code entered by the user. Upon successful verification, the vendor conversion is counted.

---

## 2. Endpoints Overview

| Method | Endpoint | Summary |
|---|---|---|
| \`POST\` / \`GET\` | \`${sendBase}\` | Send verification OTP to subscriber MSISDN |
| \`POST\` / \`GET\` | \`${verifyBase}\` | Verify OTP code and record conversion |

---

## 3. API Reference

### 3.1 Send OTP
\`POST ${sendBase}\`  
Query format fallback: \`${urls.sendUrl}{msisdn}\`

Dispatches an SMS verification code to the specified subscriber phone number.

#### Request
- **Method:** \`POST\` (or \`GET\`)
- **Headers:**
  - \`Content-Type: application/json\`
  - \`Accept: application/json\`
- **Parameters / Body Schema:**
  | Parameter | Type | Required | Example | Description |
  |---|---|---|---|---|
  | \`msisdn\` | string | Yes | \`566891023\` | Subscriber mobile phone number |
  | \`pack\` | string | No | \`daily\` | Selected subscription plan key |
  | \`visitId\` | number | No | \`1\` | Optional visit tracking identifier |

#### cURL Example
\`\`\`bash
curl -X POST '${sendBase}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '{
    "msisdn": "566891023",
    "pack": "daily"
  }'
\`\`\`

#### Responses

##### 🟢 200 OK — OTP Sent
SMS verification passcode dispatched successfully.
\`\`\`json
{
  "sent": true,
  "visitId": 1,
  "msisdn": "566891023",
  "message": "OTP sent successfully"
}
\`\`\`

##### 🔴 400 Bad Request — Missing / Invalid Phone
The MSISDN provided is missing or invalid.
\`\`\`json
{
  "statusCode": 400,
  "error": "Error",
  "message": "Phone number is required"
}
\`\`\`

##### 🔴 403 Forbidden — Offer Stopped (Capping Limit)
The campaign has reached its conversion capping limit or the vendor is inactive.
\`\`\`json
{
  "statusCode": 403,
  "error": "Error",
  "message": "Offer is stopped due to capping limit"
}
\`\`\`

##### 🔴 404 Not Found — Campaign or Vendor Not Found
The campaign ID or vendor ID does not exist or is not assigned.
\`\`\`json
{
  "statusCode": 404,
  "error": "Error",
  "message": "Campaign or Vendor not found"
}
\`\`\`

##### 🟡 429 Too Many Requests — Rate Limit Exceeded
Too many OTP dispatch requests from this IP (limit: 5 requests / minute). Wait before retrying.
\`\`\`json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Too many requests. Please wait a minute before requesting another OTP."
}
\`\`\`

##### 🔴 500 Internal Server Error — Unexpected Error
An unexpected internal server error occurred while processing the request.
\`\`\`json
{
  "statusCode": 500,
  "error": "Error",
  "message": "Internal Server Error"
}
\`\`\`

##### 🔴 502 Bad Gateway — Upstream SMS Gateway Error
Failed to communicate with the upstream SMS aggregator or operator gateway.
\`\`\`json
{
  "statusCode": 502,
  "error": "Error",
  "message": "Failed to send OTP via upstream SMS gateway"
}
\`\`\`

---

### 3.2 Verify OTP
\`POST ${verifyBase}\`  
Query format fallback: \`${urls.verifyUrl}{msisdn}&otp={otp}\`

Validates the OTP entered by the subscriber. Conversion is registered on success.

#### Request
- **Method:** \`POST\` (or \`GET\`)
- **Headers:**
  - \`Content-Type: application/json\`
  - \`Accept: application/json\`
- **Parameters / Body Schema:**
  | Parameter | Type | Required | Example | Description |
  |---|---|---|---|---|
  | \`msisdn\` | string | Yes | \`566891023\` | Same phone number used on send |
  | \`otp\` | string | Yes | \`1234\` | Verification code entered by subscriber |
  | \`visitId\` | number | No | \`1\` | Optional visit tracking identifier |

#### cURL Example
\`\`\`bash
curl -X POST '${verifyBase}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '{
    "msisdn": "566891023",
    "otp": "1234"
  }'
\`\`\`

#### Responses

##### 🟢 200 OK — Verified Successfully
OTP code is valid and verified. Vendor conversion is registered.
\`\`\`json
{
  "verified": true,
  "visitId": 1,
  "msisdn": "566891023",
  "message": "OTP verified successfully"
}
\`\`\`

##### 🔴 400 Bad Request — Invalid or Expired Code
The submitted OTP code is incorrect, expired, or missing.
\`\`\`json
{
  "statusCode": 400,
  "error": "Error",
  "message": "Invalid or expired OTP code"
}
\`\`\`

##### 🔴 403 Forbidden — Offer Inactive / Capping Limit
The campaign has reached its conversion cap or the offer is inactive.
\`\`\`json
{
  "statusCode": 403,
  "error": "Error",
  "message": "Offer is stopped due to capping limit"
}
\`\`\`

##### 🔴 404 Not Found — Session or Campaign Not Found
No matching verification session found for this phone number and vendor.
\`\`\`json
{
  "statusCode": 404,
  "error": "Error",
  "message": "Verification session or Vendor not found"
}
\`\`\`

##### 🟡 429 Too Many Requests — Brute-Force Protection
Too many failed verification attempts (limit: 10 attempts / 10 minutes).
\`\`\`json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Too many failed verification attempts. Please try again later."
}
\`\`\`

##### 🔴 500 Internal Server Error — Unexpected Error
An unexpected internal server error occurred while processing the verification.
\`\`\`json
{
  "statusCode": 500,
  "error": "Error",
  "message": "Internal Server Error"
}
\`\`\`

##### 🔴 502 Bad Gateway — Upstream Verification Gateway Failure
Upstream partner/carrier verification gateway failed to validate the code.
\`\`\`json
{
  "statusCode": 502,
  "error": "Error",
  "message": "Upstream carrier verification gateway failure"
}
\`\`\`

---

## 4. Standard HTTP Status Codes & Error Handling Reference

| Status Code | Status Name | Description & Vendor Action |
|---|---|---|
| \`200 OK\` | Success | Request succeeded. Proceed with the integration flow. |
| \`400 Bad Request\` | Client Error | Required parameters are missing or invalid (e.g. missing \`msisdn\` or wrong \`otp\`). Do NOT retry without correcting input. |
| \`401 Unauthorized\` | Unauthorized | Missing or invalid authentication / API key where required. |
| \`403 Forbidden\` | Forbidden / Capped | Offer is capped or vendor is inactive. Pause traffic dispatch immediately. |
| \`404 Not Found\` | Not Found | Campaign ID or Vendor ID was not found in the platform. Check your endpoint URL. |
| \`429 Too Many Requests\` | Rate Limited | Rate limit or anti-brute force limit triggered. Back off and retry after the specified window. |
| \`500 Internal Server Error\` | Server Error | Internal server processing error. Retry with exponential backoff. |
| \`502 Bad Gateway\` | Upstream Gateway Error | Upstream SMS provider or telco carrier timed out or rejected the dispatch. Retry after brief delay. |
| \`503 Service Unavailable\` | Service Unavailable | Service is undergoing maintenance or temporarily offline. Retry with backoff. |
`
}

export function buildOtpExposeApiGuide(opts = {}) {
  if (opts && opts.format === 'markdown') {
    return buildOtpExposeMarkdownGuide(opts)
  }
  return JSON.stringify(
    {
      comment: 'Vendor OTP APIs. Call in order: send → verify. GET or POST. Query or JSON body.',
      apis: buildOtpExposeApiPayload(opts),
    },
    null,
    2,
  )
}

export async function sendOtp({ phone, visitId, pack, campaignId }) {
  return apiClient('/otp/send', {
    method: 'POST',
    body: {
      phone,
      ...(visitId ? { visitId: Number(visitId) } : {}),
      ...(campaignId ? { campaignId: Number(campaignId) } : {}),
      ...(pack ? { pack } : {}),
    },
    dedupe: false,
  })
}

export async function verifyOtp({ phone, otp, visitId, campaignId }) {
  return apiClient('/otp/verify', {
    method: 'POST',
    body: {
      phone,
      otp,
      otpCode: otp,
      ...(visitId ? { visitId: Number(visitId) } : {}),
      ...(campaignId ? { campaignId: Number(campaignId) } : {}),
    },
    dedupe: false,
  })
}

