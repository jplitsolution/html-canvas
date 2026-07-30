# WAP Manager — Product & Schema Design

> Canonical product brief + target database design.
> Last updated: 2026-07-29

---

## 1. What we are building

A **WAP / carrier-billing subscription manager** for operators (Etisalat, Zain, STC, …).

Ads drive traffic to a **subscription funnel**. On load we try to detect the subscriber MSISDN (HTTP header enrichment). Partner APIs own billing + OTP — we never store OTP codes locally and we do not use Twilio/MSG91/Kaleyra.

### Actors

| Actor | Job |
|-------|-----|
| **Admin** | Configure markets, campaigns, page HTML, partner API URLs, vendors/affiliates |
| **End user** | Lands from an ad → sees funnel → subscribes (HE or OTP) |
| **Partner** | Check-sub, subscribe, blocklist, OTP send/verify (e.g. TickHighs SubOTP) |
| **Vendor / Affiliate** | Traffic source identified by `vid` / `aff_id` on the tracking URL |

### Funnel (runtime)

```
Ad click
  → /subscription?country=…&operator=…&campid=…&vid=…&aff_id=…&click_id=…
  → Detect MSISDN (optional)
  → HOME
       ├─ MSISDN present  → CONFIRM → (subscribe) → THANKYOU
       └─ No MSISDN       → OTP (send + verify via partner) → CONFIRM → THANKYOU
  → BLOCKED / ERROR on partner / policy failure
```

**Verification modes**

| Mode | Behaviour |
|------|-----------|
| `HEADER_INJECTION` | Must resolve MSISDN from HE; else ERROR |
| `OTP_ONLY` | Always OTP path |
| `BOTH` | HE if available, else OTP (default) |
| `NONE` | No verification gate (rare) |

### Admin UX (nested routes)

```
/markets
  → /markets/:cc/:oc
  → /markets/:cc/:oc/campaigns/:id
  → …/edit/:pageType
  → …/flow
```

Campaign pages (exactly these six): **HOME · OTP · CONFIRM · THANKYOU · BLOCKED · ERROR**

### Partner API contract (TickHighs / SubOTP style)

| Purpose | Example | Success |
|---------|---------|---------|
| Check subscription | `GET /sub/checksub?msisdn=&serviceId=` | `responseCode: "0"` |
| Subscribe (optional HE) | partner-specific URL | `responseCode: "0"` |
| Blocklist (optional) | partner DND URL | blocked flag |
| OTP send | `GET /otp/subscribe?msisdn=&subServiceId=&…` | `responseCode: "0"` |
| OTP verify | `GET /otp/validate_otp?msisdn=&otp=` | `responseCode: "0"` (often queues subscribe) |

Placeholders: `{{msisdn}}`, `{{otp}}`, `{{subServiceId}}`, `{{serviceId}}`, `{{country}}`, `{{operator}}`, `{{transactionId}}`.

### Attribution URL

```
/subscription?country=UAE&operator=Etisalat
  &campid=AE-ETISALAT-2
  &vid=ADM01
  &aff_id=AFF_BE
  &click_id={CLICKID}
```

`campid` = `{COUNTRY_CODE}-{OPERATOR_CODE}-{campaignId}` (see `tracking-id.util.js`).

---

## 2. Domain model (clean)

```
User
 └─ Country
     └─ Operator
         └─ Campaign
             ├─ CampaignPage[]     (1 per page_type → Template)
             ├─ ApiConfig          (1:1 partner URLs)
             └─ CampaignTracking[] (vendor + optional affiliate allow-list)

Vendor
 └─ Affiliate

Visit  (runtime session)
 └─ VisitEvent[]
```

**OTP**: partner owns the code. We only set `visits.otp_verified_at` after partner verify succeeds. Pending send metadata may live in Redis (`otp:pending:…`), never in Postgres.

---

## 3. Target schema

### Keep

| Table | Role |
|-------|------|
| `users` | Admin auth |
| `countries` / `operators` | Markets |
| `campaigns` | Offer + flow mode |
| `campaign_pages` | Funnel page ↔ template |
| `templates` | GrapesJS html/css/projectData |
| `api_configs` | Partner billing + OTP URLs |
| `vendors` / `affiliates` | Traffic partners |
| `campaign_trackings` | Which vid/aff may run this campaign |
| `visits` / `visit_events` | Funnel analytics |

### Drop / stop using

| Item | Why |
|------|-----|
| `otp_requests` | Partner-only OTP; unused; not registered in TypeORM |
| `api_configs.user_api` | Never read/written |
| `api_configs.otp_provider` | Always `partner` — redundant |
| Legacy page types `LANDING` / `OTP_PROMPT` / `SUCCESS` | Replaced by HOME/OTP/THANKYOU |
| Twilio / MSG91 / Kaleyra / local OTP providers | Dead code |
| `VisitStatus.PLAN_SHOWN` / `PLAN_VIEW` events | Never produced |

### Columns we keep (with intent)

**`campaigns.country` + `campaigns.operator` (varchar)**  
Denormalized display + public URL lookup (`?country=UAE&operator=Etisalat`). Canonical FK is `operator_id → operators → countries`. Always dual-write on create/update from the market. Future phase can drop strings once all lookups join markets.

**`visits.country` / `visits.operator`**  
Snapshot of the hit (analytics). Keep as strings.

**`api_configs.subscribe_api`**  
Optional. TickHighs queues subscribe inside `validate_otp`, so this may be empty for OTP-first partners.

**`api_configs.blocklist_api`**  
Optional — skip when partner has no DND API.

**`api_configs.resolve_msisdn_url`**  
Optional HE enrichment URL.

### Constraints to add

- `campaign_trackings`: unique `(campaign_id, vendor_id, coalesce(affiliate_id,0))`
- `campaign_trackings.updated_at`
- `campaigns.operator_id` required for new rows (backfill existing)

### Page types (enum)

```
HOME | OTP | CONFIRM | THANKYOU | BLOCKED | ERROR
```

### Visit statuses (trimmed)

```
VISIT | HOME_SHOWN | OTP_SHOWN | CONFIRM_SHOWN |
BLOCKED | SUBSCRIBED | SUCCESS | FAILED
```

---

## 4. Runtime responsibilities (backend)

| Module | Owns |
|--------|------|
| `flow` | Resolve campaign by campid/market, serve pages, transitions, HE detect |
| `otp` | Partner send/verify; mark `otp_verified_at` |
| `partner-api` | checksub / subscribe / blocklist / resolve MSISDN HTTP calls |
| `campaigns` | CRUD + pages + tracking + api config |
| `markets` | Countries / operators |
| `partners` | Vendors / affiliates |
| `analytics` | Visits + events (+ optional ES index) |

Success rule for partner HTTP: **business code** (`responseCode === "0"`), not bare HTTP 200.

---

## 5. Seed profile (clean demo)

After schema cleanup, one deterministic demo:

| Market | Campaign | Tracking | APIs |
|--------|----------|----------|------|
| UAE / Etisalat | AE Etisalat Wellness | `AE-ETISALAT-{id}`, vid `ADM01`, aff `AFF_BE` | TickHighs checksub + OTP send/verify |
| South Sudan / Zain | SS Zain Wellness | `SS-ZAIN-{id}`, same vendor/aff | Same TickHighs URLs |

Test MSISDN (Swagger): `211911961169`.

Script: `node seed_clean.js`

---

## 6. Out of scope (for now)

- Multi-tenant SaaS billing for the manager itself
- Local OTP generation / SMS gateways
- Real-time HE operator SDKs beyond configured `resolve_msisdn_url`
- Dropping `campaigns.country`/`operator` strings (phase 2)

---

## 7. Implementation checklist

1. ✅ This document  
2. Migration: drop `otp_requests`, drop `user_api` + `otp_provider`, delete legacy pages, tighten trackings  
3. Entity + code cleanup (dead providers, VisitStatus)  
4. `seed_clean.js` — wipe demo funnel data, insert markets/campaigns/pages/APIs/trackings  
5. Smoke: HOME → OTP send → (verify with real SMS) → CONFIRM → THANKYOU  
