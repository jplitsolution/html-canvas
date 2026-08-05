# Safaricom Kenya WAP — HE (Token → MSISDN) Setup Guide

Complete guide for configuring Header Enrichment on TemplateCraft / WAP Manager using the Safaricom partner APIs.

---

## 1. What this flow does

On the subscription **HOME** page:

1. Page shows immediately (user sees the creative).
2. In the background the backend calls:
   - **Token API** → gets `access_token`
   - **Masked MSISDN API** → gets the user’s number (Bearer token)
3. **If MSISDN is found** → number is stored; CTA continues the normal funnel (CONFIRM / subscribe).
4. **If MSISDN is missing** → user still sees HOME; when they press any CTA → **warning** → then redirect to **CG URL**.

```
User lands HOME
    │
    ├─► show HOME UI
    └─► background: POST token → GET masked MSISDN
            │
            ├─ success → msisdn in URL/session
            │              CTA → CONFIRM / next page
            │
            └─ fail    → CTA → warning banner
                           → redirect to CG
```

---

## 2. Partner APIs (source of truth)

### 2.1 Token API

| Item | Value |
|------|--------|
| URL | `https://evisaf.wellnesss360.com/safcom/hetoken` |
| Method | `POST` |
| Body | `{}` (empty) |
| Header | `X-Session-ID: <browser session id>` |
| Success field | `access_token` |

Partner-style pseudocode:

```js
const response = await axios.post(TOKEN_URL, {}, {
  headers: { 'X-Session-ID': getSessionId() },
});
return response.data?.access_token || null;
```

Session id (browser):

```js
let sessionId = sessionStorage.getItem('session_id');
if (!sessionId) {
  sessionId = `sid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  sessionStorage.setItem('session_id', sessionId);
}
```

In our app this is stored as `templatecraft_he_session_id` and sent to `/flow/detect-msisdn` as `sessionId`. The backend forwards it as `X-Session-ID` on the token call.

### 2.2 Masked MSISDN API

| Item | Value |
|------|--------|
| URL | `https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn` |
| Method | `GET` |
| Headers | see below |

```http
Authorization: Bearer <access_token>
X-App: he-partner
X-MessageID: <numeric id>
X-Source-System: he-partner
```

Partner-style pseudocode:

```js
await axios.get(MASKED_MSISDN_URL, {
  headers: {
    Authorization: `Bearer ${token}`,
    'X-App': 'he-partner',
    'X-MessageID': '1234',
    'X-Source-System': 'he-partner',
  },
});
```

### 2.3 Fail / Wi‑Fi redirect (CG)

```
https://dsdp-cg.safaricom.com/300002437
```

Use this when HE cannot resolve MSISDN (typical on Wi‑Fi / non‑Safaricom data).

**Attribution (required for vendor postbacks):** when we redirect to CG (or any external URL), we always attach:

| Param | Meaning |
|--------|---------|
| `click_id` | Our visit click id (used to match billing callbacks → vendor) |
| `rcid` | Affiliate / vendor original click (when different) |
| `msisdn` | Phone when known (HE success / later hops) |

Example:

```
https://dsdp-cg.safaricom.com/300002437?click_id=<our-id>&rcid=<vendor-id>&msisdn=2547...
```

You can also put placeholders in the CG URL: `{{click_id}}`, `{{rcid}}`, `{{msisdn}}`.
Without placeholders we auto-append query params.

CTA-time rebuild uses the latest ids from `/flow/page` (not only the first detect call), so callbacks can still map to the vendor who sent the traffic.
---

## 3. Dashboard setup (step by step)

### Step A — Campaign CG URL

1. Open the **Safaricom Kenya** campaign.
2. Find **CG redirect URL**.
3. Paste:

```
https://dsdp-cg.safaricom.com/300002437
```

4. Click **Save**.

### Step B — Detect phone (HE)

1. Click **API settings** (or API configuration).
2. Open tab **Detect phone**.
3. Choose mode: **Token + MSISDN** (`safaricom_masked`).
4. Fill:

| Field | Value |
|--------|--------|
| Token URL | `https://evisaf.wellnesss360.com/safcom/hetoken` |
| Masked / MSISDN URL | `https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn` |
| Fail message | `Please use Safaricom Mobile Data` |
| Fail redirect | `https://dsdp-cg.safaricom.com/300002437` |

> If **Fail redirect** is left empty, the campaign **CG redirect URL** is used automatically for Token/Custom HE modes.

5. Click **Save API Settings**.

Saved config is stored as `heProvider = safaricom_masked` plus `heConfigJson` similar to:

```json
{
  "tokenUrl": "https://evisaf.wellnesss360.com/safcom/hetoken",
  "maskedUrl": "https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn",
  "failMessage": "Please use Safaricom Mobile Data",
  "failRedirectUrl": "https://dsdp-cg.safaricom.com/300002437"
}
```

### Step C — Flow mode

In **Flow Builder**, pick one:

| Mode | When to use |
|------|-------------|
| **Header Injection** | HE-only: MSISDN → CONFIRM; no MSISDN → ERROR / CTA warning → CG |
| **Header Injection + OTP** | MSISDN → CONFIRM; no MSISDN → OTP path (CG warning only applies for API HE CTA gate) |
| **OTP only** | Always OTP; HE detect may still run but funnel is OTP-first |
| **None** | No HE/OTP; landing can go straight to CG |

For this Safaricom WAP brief, prefer **Header Injection** (or **Header + OTP** if you also want OTP fallback instead of only CG).

### Step D — Publish

Ensure HOME / CONFIRM / THANKYOU are ready, campaign is **live**, then test with the subscription URL.

---

## 4. What happens at runtime

### Success (token + MSISDN both OK)

1. HOME visible.
2. Soft chip may show “Detecting number…” briefly.
3. `msisdn` added to URL / session.
4. User taps Subscribe / CTA → **no warning**.
5. Flow goes to **CONFIRM** (or next graph node) with the number.

### Failure (no MSISDN)

1. HOME still visible (no instant bounce).
2. User taps any HOME CTA.
3. Amber warning: fail message (e.g. *Please use Safaricom Mobile Data*).
4. After ~2 seconds → browser goes to fail/CG URL.

### Localhost note

On `localhost` / Wi‑Fi / non‑operator network, Safaricom HE usually **cannot** return a real MSISDN. That is expected. You will see the fail warning + CG redirect path. Real success tests need **Safaricom mobile data** on the live (or operator-reachable) WAP URL.

---

## 5. Code map (for developers)

| Piece | Location |
|--------|----------|
| Token + masked client | `backend/src/modules/flow/he.service.js` (`safaricom_masked`) |
| Detect API | `GET /api/flow/detect-msisdn` → `flow.routes.js` / `flow.service.js` |
| FE detect + session id | `frontend/src/services/api/flow.js` (`detectMsisdnApi`) |
| Phone resolve order | `frontend/src/services/flow/resolvePhoneNumber.js` |
| HOME show first + CTA warning | `frontend/src/pages/SubscriptionPage.jsx` |
| HE UI | `frontend/src/components/dashboard/CampaignApiConfigModal.jsx` |

Defaults baked into `safaricom_masked`:

- Token: **POST**, header `X-Session-ID`
- Masked: **GET**, headers `Authorization`, `X-App=he-partner`, `X-MessageID`, `X-Source-System=he-partner`
- Token response prefers `access_token`

Optional `heConfigJson` overrides: `tokenMethod`, `tokenHeaders`, `maskedHeaders`, `xApp`, `xSourceSystem`, `messageId`, `tokenBody`.

---

## 6. Quick checklist

- [ ] Campaign **CG redirect URL** = `https://dsdp-cg.safaricom.com/300002437`
- [ ] HE mode = **Token + MSISDN**
- [ ] Token URL = `https://evisaf.wellnesss360.com/safcom/hetoken`
- [ ] Masked URL = `https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn`
- [ ] Fail message set
- [ ] Fail redirect = CG URL (or leave empty to reuse campaign CG)
- [ ] Flow mode = Header Injection (or Header + OTP)
- [ ] Campaign live
- [ ] Test on Safaricom **mobile data** for success path
- [ ] Test on Wi‑Fi for warning → CG path

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Instant redirect / no HOME | Old build / cached tab | Hard refresh; confirm latest `SubscriptionPage` (HOME first) |
| Warning then chrome error | Fake fail URL (`*.example.com`) | Use real CG URL above |
| `ENOTFOUND` / token error in backend logs | Wrong host / network | Confirm token URL; server must reach evisaf host |
| Token OK but no phone | Not on Safaricom data; or response shape | Check backend HE logs; confirm masked response path |
| CTA works without number on HE mode | Mode not `safaricom_masked` | Re-save Detect phone as Token + MSISDN |
| OTP campaigns suddenly bounce to CG | Unrelated; CG fallback only for API HE providers | Keep OTP campaigns on `header` / `none` |

Backend log hints:

```
[HE DEBUG] /detect-msisdn ...
HE resolve failed (safaricom_masked): ...
```

Frontend console:

```
[HE] no MSISDN — HOME stays; warn on button press
[HE] CTA blocked — no MSISDN
```

---

## 8. Copy-paste values (Safaricom Kenya)

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

---

*Last updated for the Safaricom Kenya WAP HE contract (POST token + Bearer masked MSISDN + CG fallback).*
