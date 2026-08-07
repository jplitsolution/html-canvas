# Safaricom Kenya WAP — HE (Token → MSISDN) Setup Guide

Operator-specific setup for **Token + Masked MSISDN** (`safaricom_masked`).

For full architecture (attribution, decision matrix, postbacks, invariants), see
**[`FLOW-ARCHITECTURE.md`](./FLOW-ARCHITECTURE.md)**.

**Last updated:** Aug 2026

---

## 1. What this flow does (current behaviour)

On subscription landing for an API HE campaign:

1. Frontend shows a **detect overlay** (“Detecting mobile number…”) — **HOME/OTP are not shown**.
2. Backend (visit-first) calls:
   - **Token API** → `access_token`
   - **Masked MSISDN API** → user number
3. **If MSISDN found** → checksub/blocklist (if configured) → HE success redirect / status page / campaign success.
4. **If MSISDN missing** → immediate redirect to **fail URL** (or campaign CG fallback). No HOME flash.

```
User lands /subscription
    │
    ├─► overlay (no HOME)
    └─► POST token → GET masked MSISDN
            │
            ├─ success → checksub → success/status redirect
            │
            └─ fail    → failRedirectUrl / campaign CG (URL as-is)
```

---

## 2. Partner APIs

### 2.1 Token API

| Item | Value |
|------|--------|
| URL | `https://evisaf.wellnesss360.com/safcom/hetoken` |
| Method | `POST` |
| Body | `{}` |
| Header | `X-Session-ID: <session id>` |
| Success field | `access_token` |

Session id is stored as `templatecraft_he_session_id` and sent to `/api/flow/detect-msisdn` as `sessionId`. Backend forwards it as `X-Session-ID`.

### 2.2 Masked MSISDN API

| Item | Value |
|------|--------|
| URL | `https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn` |
| Method | `GET` |

```http
Authorization: Bearer <access_token>
X-App: he-partner
X-MessageID: 1234
X-Source-System: he-partner
```

### 2.3 Fail / Wi‑Fi redirect (CG)

```
https://dsdp-cg.safaricom.com/300002437
```

**Important — attribution:**

- We **do not** append `click_id`, `campid`, or `rcid` to this URL.
- Open the configured URL **as-is**.
- Optional placeholders only if you put them in the config: `{{msisdn}}`, `{{phone}}`, `{{country}}`, `{{operator}}`.
- Our `click_id` stays internal (visit + `api_call_logs` + conversion postbacks).

---

## 3. Dashboard setup

### Step A — Campaign CG URL

1. Open the campaign.
2. Set **CG redirect URL** to the Safaricom CG (fail fallback if HE fail URL empty).
3. Save.

### Step B — Detect phone (HE)

1. **API settings** → **Detect phone**.
2. Mode: **Token + MSISDN** (`safaricom_masked`).
3. Fill:

| Field | Value |
|--------|--------|
| Token URL | `https://evisaf.wellnesss360.com/safcom/hetoken` |
| Masked / MSISDN URL | `https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn` |
| Fail message | `Please use Safaricom Mobile Data` |
| Success redirect | Partner next hop `https://…` (or empty to rely on checksub routing) |
| Fail redirect | `https://dsdp-cg.safaricom.com/300002437` |

> Empty **Fail redirect** → campaign **CG redirect URL** is used for API HE only.

Saved shape:

```json
{
  "tokenUrl": "https://evisaf.wellnesss360.com/safcom/hetoken",
  "maskedUrl": "https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn",
  "failMessage": "Please use Safaricom Mobile Data",
  "failRedirectUrl": "https://dsdp-cg.safaricom.com/300002437",
  "successRedirectUrl": "https://partner.example/next"
}
```

Also configure **checksub** (`subscription_api`) if you need `new` vs `active` vs low-balance routing.

### Step C — Flow mode

| Mode | Use |
|------|-----|
| Header Injection | Classic header HE funnel |
| Header + OTP | Header with OTP fallback |
| OTP only | OTP-first |
| None | Null-flow CG (no HE/OTP) |

For Safaricom **token** WAP with success/fail redirects, HE provider matters more than mode:
API HE suppresses HOME/OTP regardless; redirects come from detect.

### Step D — Publish

Campaign live; test on Safaricom **mobile data** for success, Wi‑Fi for fail.

---

## 4. Runtime outcomes

| MSISDN | checksub | Result |
|--------|----------|--------|
| Missing | — | Fail/CG URL immediately (overlay only) |
| Found | `new` | HE success redirect + pending conversion row |
| Found | `active` | Campaign success URL / THANKYOU |
| Found | grace/parking | `LOW_BALANCE` page |
| Found | blocklist | `BLOCKED` page |
| Found | no checksub | HE success URL (legacy) |

See decision matrix in [`FLOW-ARCHITECTURE.md`](./FLOW-ARCHITECTURE.md) §6.

---

## 5. Code map

| Piece | Location |
|--------|----------|
| Token + masked client | `backend/src/modules/flow/he.service.js` |
| Detect + routing | `backend/src/modules/flow/flow.service.js` → `detectMsisdn` |
| Routes | `backend/src/modules/flow/flow.routes.js` |
| FE overlay / suppress | `frontend/src/pages/SubscriptionPage.jsx` |
| Redirect helper (no click_id append) | `frontend/src/services/flow/resolvePhoneNumber.js` |
| Config UI | `frontend/src/components/dashboard/CampaignApiConfigModal.jsx` |

Optional `heConfigJson` overrides: `tokenMethod`, `tokenHeaders`, `maskedHeaders`, `xApp`, `xSourceSystem`, `messageId`, `tokenBody`.

---

## 6. Checklist

- [ ] Campaign CG URL = Safaricom CG
- [ ] HE mode = Token + MSISDN
- [ ] Token + Masked URLs set
- [ ] Fail redirect set (or CG fallback OK)
- [ ] checksub configured if you need new/active split
- [ ] Campaign live
- [ ] Test mobile data → success path
- [ ] Test Wi‑Fi → fail URL **without** `click_id`/`campid` query junk

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| HOME flashes then bounce | Old frontend | Hard refresh; confirm API HE suppress |
| Fail URL has `?click_id=` | Old build | Latest code must open URL as-is |
| Token `ENOTFOUND` | Network / host | Server must reach token host |
| Token OK, no phone | Not on Safaricom data | Expected on Wi‑Fi → fail path |
| Stuck spinner | Detect cancelled | Overlay must still fire fail redirect |
| OTP campaign bounces to CG | Wrong HE provider | OTP campaigns should use `header` / `none`, not `safaricom_masked` |

Logs:

```
[HE DEBUG] /detect-msisdn ...
HE resolve failed (safaricom_masked): ...
[HE] no MSISDN — fail redirect (skip HOME)
```

---

## 8. Copy-paste values

```
Token URL:
https://evisaf.wellnesss360.com/safcom/hetoken

Masked URL:
https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn

CG / Fail redirect:
https://dsdp-cg.safaricom.com/300002437

Fail message:
Please use Safaricom Mobile Data
```
