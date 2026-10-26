import {
  convPercentColumn,
  pubConvPercentColumn,
  totalClicksColumn,
  wapFlowDetail,
} from './shared/wapClicks'

const wap = wapFlowDetail('ORANGE_BF')

export const orangeBfFlowDetail = {
  ...wap,
  id: 'ORANGE_BF',
  isFlowLocked: true,
  vendorHint:
    'Orange Burkina Faso (+226). Conversion = vendor CPA fired on OTP success after payout %. Operator billing callback is not used. Skipped/failed rows can still be fired from Postbacks.',
  statsColumns: [
    totalClicksColumn,
    {
      key: 'conversions',
      label: 'Conversions',
      hint: 'Vendor CPA fired after payout %',
      render: (row) => row.conversions ?? 0,
    },
    convPercentColumn,
    pubConvPercentColumn,
  ],
  getVendorEndpoints({ origin, campaign, vendorId }) {
    const base = `${origin}/flow/api/orange-bf`
    const copyKey = String(vendorId || 'all')
    return [
      { key: `${copyKey}-check`, method: 'POST', label: 'CheckSub', url: `${base}/check?campid=${campaign.id}` },
      { key: `${copyKey}-send`, method: 'POST', label: 'Send OTP', url: `${base}/otp/send?campid=${campaign.id}` },
      { key: `${copyKey}-verify`, method: 'POST', label: 'Verify OTP', url: `${base}/otp/verify?campid=${campaign.id}` },
      { key: `${copyKey}-unsub`, method: 'POST', label: 'Unsubscribe', url: `${base}/unsub?campid=${campaign.id}` },
    ]
  },
  assignmentActions: {
    downloadApiGuide: 'orange-bf',
    downloadHtmlScreen: false,
    openHtmlScreen: false,
  },
}

export function buildOrangeBfExposeMarkdownGuide({ origin, campaign, vendor, vendorId } = {}) {
  const host = origin || 'https://your-domain.com'
  const cid = campaign?.id || '{campaignId}'
  const vid = vendorId || vendor?.id || '{vendorId}'
  const base = `${host}/flow/api/orange-bf`
  const vendorName = vendor?.name || vendor?.code || 'Vendor'
  const campaignName = campaign?.name || 'Campaign'

  return `# Orange Burkina Faso Vendor API Specification

> **Campaign:** ${campaignName} (ID: \`${cid}\`)  
> **Vendor:** ${vendorName} (ID: \`${vid}\`)  
> **Base URL:** \`${base}\`  
> **Format:** RESTful API (JSON Body or URL Query Parameters)  
> **Call Sequence:** \`Check Sub\` → \`Send OTP\` → \`Verify OTP\` → \`Unsubscribe\`

This specification describes the Orange Burkina Faso (+226) vendor API flow. Vendor CPA conversions are finalized upon OTP verification after payout % application.

---

## 1. Endpoints Overview

| Method | Endpoint | Summary |
|---|---|---|
| \`POST\` / \`GET\` | \`${base}/check?campid=${cid}\` | Check if subscriber has active subscription |
| \`POST\` / \`GET\` | \`${base}/otp/send?campid=${cid}\` | Send OTP to subscriber mobile |
| \`POST\` / \`GET\` | \`${base}/otp/verify?campid=${cid}\` | Verify OTP and register conversion |
| \`POST\` / \`GET\` | \`${base}/unsub?campid=${cid}\` | Unsubscribe mobile number |

---

## 2. API Reference

### 2.1 Check Subscription
\`POST ${base}/check?campid=${cid}\`

#### Request
- **Method:** \`POST\` (or \`GET\`)
- **Headers:**
  - \`Content-Type: application/json\`
  - \`Accept: application/json\`
- **Parameters / Body Schema:**
  | Parameter | Type | Required | Example | Description |
  |---|---|---|---|---|
  | \`phone\` / \`msisdn\` | string | Yes | \`22670000000\` | Mobile number (Orange BF) |
  | \`campid\` | number | Yes | \`${cid}\` | Campaign ID |
  | \`visitId\` | number | No | \`1\` | Tracking visit identifier |

#### cURL Example
\`\`\`bash
curl -X POST '${base}/check?campid=${cid}' \\
  -H 'Content-Type: application/json' \\
  -d '{ "phone": "22670000000", "campid": ${cid} }'
\`\`\`

#### Responses
##### 🟢 200 OK
\`\`\`json
{
  "success": true,
  "outcome": "NOT_SUBSCRIBED",
  "message": "User is eligible to subscribe"
}
\`\`\`

---

### 2.2 Send OTP
\`POST ${base}/otp/send?campid=${cid}\`

#### Request
- **Method:** \`POST\` (or \`GET\`)
- **Headers:**
  - \`Content-Type: application/json\`
  - \`Accept: application/json\`
- **Parameters / Body Schema:**
  | Parameter | Type | Required | Example | Description |
  |---|---|---|---|---|
  | \`phone\` / \`msisdn\` | string | Yes | \`22670000000\` | Mobile number |
  | \`language\` | string | No | \`_E\` | Language: \`_E\` (English) or \`_F\` (French) |
  | \`campid\` | number | Yes | \`${cid}\` | Campaign ID |
  | \`visitId\` | number | No | \`1\` | Tracking visit identifier |

#### Responses
##### 🟢 200 OK
\`\`\`json
{
  "success": true,
  "status": "OTP_SENT",
  "message": "OTP sent successfully"
}
\`\`\`

---

### 2.3 Verify OTP
\`POST ${base}/otp/verify?campid=${cid}\`

#### Request
- **Method:** \`POST\` (or \`GET\`)
- **Headers:**
  - \`Content-Type: application/json\`
  - \`Accept: application/json\`
- **Parameters / Body Schema:**
  | Parameter | Type | Required | Example | Description |
  |---|---|---|---|---|
  | \`phone\` / \`msisdn\` | string | Yes | \`22670000000\` | Same mobile number used on send |
  | \`otp\` | string | Yes | \`1234\` | Verification code entered by subscriber |
  | \`campid\` | number | Yes | \`${cid}\` | Campaign ID |
  | \`visitId\` | number | No | \`1\` | Tracking visit identifier |

#### Responses
##### 🟢 200 OK
\`\`\`json
{
  "success": true,
  "status": "SUCCESS",
  "message": "OTP verified successfully. Conversion registered."
}
\`\`\`

---

### 2.4 Unsubscribe
\`POST ${base}/unsub?campid=${cid}\`

#### Request
- **Method:** \`POST\` (or \`GET\`)
- **Headers:**
  - \`Content-Type: application/json\`
  - \`Accept: application/json\`
- **Parameters / Body Schema:**
  | Parameter | Type | Required | Example | Description |
  |---|---|---|---|---|
  | \`phone\` / \`msisdn\` | string | Yes | \`22670000000\` | Mobile number to unsubscribe |
  | \`campid\` | number | Yes | \`${cid}\` | Campaign ID |

#### Responses
##### 🟢 200 OK
\`\`\`json
{
  "success": true,
  "message": "Unsubscribed successfully"
}
\`\`\`
`
}

export default {
  id: 'ORANGE_BF',
  resolve() {
    return orangeBfFlowDetail
  },
}
