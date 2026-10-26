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
\`\`\`json
{
  "sent": true,
  "visitId": 1,
  "msisdn": "566891023",
  "message": "OTP sent successfully"
}
\`\`\`

##### 🔴 400 Bad Request — Missing / Invalid Phone
\`\`\`json
{
  "sent": false,
  "error": "INVALID_PHONE",
  "message": "Valid phone number is required"
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
\`\`\`json
{
  "verified": true,
  "visitId": 1,
  "msisdn": "566891023",
  "message": "OTP verified successfully"
}
\`\`\`

##### 🔴 400 Bad Request — Invalid or Expired Code
\`\`\`json
{
  "verified": false,
  "error": "INVALID_OTP",
  "message": "Invalid or expired OTP code"
}
\`\`\`
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

