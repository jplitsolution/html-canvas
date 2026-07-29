# SAFWAP (prod) vs html-canvas WAP Manager — Gap Analysis

> Source: `safwap-server-backup/safwap-app-20260729.tar.gz` + live nginx (`safwap.wellnesss360.com`)
> Date: 2026-07-29 · Updated: implemented P0 parity (postback + HE + CG)

---

## 1. What production SAFWAP actually is

**One hardcoded campaign app** for **Safaricom Kenya / Wellness360**, not a multi-campaign manager.

| Layer | What it does |
|-------|----------------|
| Frontend (`/var/www/frontend/dist`) | Single React SPA. Partner URLs, HE, service IDs, packs, UI — **baked into the JS bundle** |
| Backend (`wap-manager-backend`) | Thin Express helper: affiliate callback + redirect save + file logs |
| Nginx | Serves SPA + proxies `/api/` → Node on `:7000` |
| Domain | `https://safwap.wellnesss360.com` |

### Hardcoded in the frontend bundle

```
HE token:     https://evisaf.wellnesss360.com/safcom/hetoken
HE MSISDN:    https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn
Check-sub:    https://evisaf.wellnesss360.com/Subs_Engine/checkSubscription
              serviceId=001034838320, cpId=100, country=KN, operator=SFC
OTP/Sub APIs: evisaf … /verify_otp, /subscribe, /unsubscribe, /checksub
              SERVICE_ID=HEALTH (and related PARAMS)
CG redirect:  https://dsdp-cg.safaricom.com/300002437
offer_code:   1764335424182  (fixed)
Default op:   Safaricom / Kenya
Routes:       /  and  /thanks only
```

### Backend that actually runs

| Endpoint | Role |
|----------|------|
| `GET /v1/callback` | Operator → us; fire **affiliate CPA callback**; mark `callback_manage.sendcallback=1` |
| `POST /v1/getredirecturl` | Save `{msisdn, camp, rcid, offer}` into `callback_manage` |
| `POST /v1/savetransactionlog` | Append JSON lines under `logs/YYYY-MM-DD.log` |

**Empty stubs in the backup** (never shipped / wiped):  
`campaign.service`, `subscription.service`, campaign/pack/operator models & repos, campaign routes.

So “campaign manager” naming is aspirational — prod is a **single Safaricom funnel + callback glue**.

---

## 2. What our html-canvas manager covers

| Capability | SAFWAP prod | Our manager |
|------------|-------------|-------------|
| Multi market / campaign without redeploy | No | **Yes** (DB + admin UI) |
| Visual page builder (HOME/OTP/CONFIRM/…) | Hardcoded UI | **Yes** |
| Partner checksub / subscribe / OTP URLs as config | Hardcoded in JS | **Yes** (`api_configs`) |
| `responseCode: "0"` success rule | Partner-specific | **Yes** (partner OTP) |
| Vendors / affiliates / campid tracking URLs | Query `camp`/`rcid` only | **Yes** (`campaign_trackings`) |
| Visits + funnel events in DB | File logs mostly | **Yes** (`visits` / `visit_events`) |
| Verification modes (HE / OTP / BOTH) | Implicit HE-first Safaricom | **Yes** (configurable) |
| Vendor/affiliate CPA postback URL | Hardcoded backend template | **Yes** (`vendors.postback_url` / affiliate override) |
| Operator callback → fire postback | `/v1/callback` | **Yes** `GET/POST /api/flow/callback` |
| Pending conversions ledger | `callback_manage` | **Yes** `conversion_postbacks` |
| HE providers (incl. Safaricom masked) | Hardcoded | **Yes** `he_provider` + `he_config_json` |
| External CG redirect | Hardcoded URL | **Yes** `campaigns.cg_redirect_url` |

**Goal alignment:** same business purpose (WAP subscribe funnel) — we make it **config-driven**.

---

## 3. How to configure (admin)

1. **Vendors** → set CPA postback URL with `{{msisdn}}` / `{rcid}` / `{campid}` (affiliate can override).
2. **Campaign → API settings → Header Enrichment** → provider `safaricom_masked` + token/masked JSON (or `header` / `custom_http`).
3. **Campaign detail → Carrier CG redirect** → e.g. `https://dsdp-cg.safaricom.com/300002437`.
4. Operator notifies: `GET /api/flow/callback?msisdn=…&status=active` → fires pending vendor postback.
5. Optional pre-CG: `POST /api/flow/register-postback` with visit/msisdn/clickId.

Placeholders: `{{msisdn}}` `{{click_id}}` `{{rcid}}` `{{campid}}` `{{offer_code}}` `{{visit_id}}` `{{vendor}}` `{{affiliate}}` (also single-brace SAFWAP form).

---

## 4. Remaining (ops / P1)

| Item | Status |
|------|--------|
| Partner call audit log (full request/response) | Still weaker than prod file logs |
| Staging HTTPS / nginx / PM2 next to safwap | Not wired yet |
| Postback retry worker | Manual / on callback only |
| Blocklist when partner provides DND | Partial |

---

## 5. One-line summary

| | |
|--|--|
| **SAFWAP today** | One Safaricom Kenya SPA; change campaign ⇒ change code ⇒ rebuild ⇒ deploy |
| **Our manager** | Multi-campaign config UI + partner OTP/checksub + **vendor postback + HE plugins + CG URL** |
| **Still for prod** | Ops deploy (HTTPS/PM2), richer partner audit, retry worker |

**New campaign = admin form, not a new repo deploy** — P0 parity pieces are in the manager.
