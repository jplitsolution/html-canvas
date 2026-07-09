# 🏛️ Architecture Documentation: Dynamic Subscription Flow Builder

This document outlines the technical design, module structure, routing algorithms, database schemas, and security model for the Dynamic Subscription Flow Builder platform.

---

## 1. System Overview

The platform enables marketing campaigns to dynamically route traffic based on operator, country, blocklist rules, and existing subscription records. It acts as a middle layer between incoming traffic, page templates (rendered inside a canvas editor), and partner subscription billing APIs.

---

## 2. Module Architecture

```
                                  [ AppModule ]
                                        │
        ┌───────────────────────┬───────┴───────┬───────────────────────┐
        ▼                       ▼               ▼                       ▼
 [ AuthModule ]          [ UsersModule ]  [ CampaignsModule ]     [ LogsModule ]
        │                                       │                       │
        ▼                                       ▼                       ▼
 [ UploadModule ]                        [ TemplatesModule ]     [ SearchModule ]
                                                │                       ▲
                                                ▼                       │
                                          [ FlowModule ] ───────────────┘
                                                │
                                                ▼
                                        [ PartnersModule ]
                                                │
                                                ▼
                                        [ AnalyticsModule ]
                                                │
                                                ▼
                                          [ OtpModule ]
```

---

## 3. Database Schema

All entities are configured using TypeORM and support both MySQL and PostgreSQL.

### Users
- `id` (int, Primary Key)
- `email` (varchar, Unique, Indexed)
- `password` (varchar) — BCrypt hashed password
- `name` (varchar)
- `avatar` (varchar, Nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Templates
- `id` (int, Primary Key)
- `name` (varchar)
- `data` (json) — Holds HTML, CSS, and editor state
- `user_id` (int, Foreign Key to users, Nullable)
- `is_prebuilt` (boolean, default false)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Campaigns
- `id` (int, Primary Key)
- `name` (varchar)
- `country` (varchar)
- `operator` (varchar)
- `service_id` (varchar, Nullable)
- `active` (boolean, default false)
- `user_id` (int, Foreign Key to users)
- `vendor_id` (int, Foreign Key to vendors, Nullable) — Assigned advertiser/vendor
- `verification_mode` (varchar: MSISDN_ONLY, OTP_ONLY, BOTH, Nullable) — Mode of verification
- `flow_config` (text, Nullable) — JSON layout for flow config graphs
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Campaign Pages
- `id` (int, Primary Key)
- `campaign_id` (int, Foreign Key to campaigns, Cascade Delete)
- `page_type` (varchar: HOME, CONFIRM, OTP, THANKYOU, BLOCKED, ERROR)
- `template_id` (int, Foreign Key to templates, Set Null)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Vendors
- `id` (int, Primary Key)
- `name` (varchar)
- `code` (varchar) — Tracking key used in `vid` URL parameter
- `user_id` (int)
- `active` (boolean, default true)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- Unique index on `(user_id, code)`

### Affiliates
- `id` (int, Primary Key)
- `vendor_id` (int, Foreign Key to vendors, Cascade Delete)
- `name` (varchar)
- `code` (varchar) — Tracking key used in `aff_id` URL parameter
- `user_id` (int)
- `active` (boolean, default true)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- Unique index on `(user_id, code)`

### API Configs
- `id` (int, Primary Key)
- `campaign_id` (int, Unique, Foreign Key to campaigns, Cascade Delete)
- `user_api` (varchar, Nullable)
- `blocklist_api` (varchar, Nullable) — External endpoint to check DND/blocklist
- `subscription_api` (varchar, Nullable) — External endpoint to check active status
- `subscribe_api` (varchar, Nullable) — External endpoint to request new billing setup
- `headers_json` (text, Nullable)
- `otp_provider` (varchar(32), Nullable) — twilio, msg91, kaleyra, partner, custom_http, local
- `otp_config_json` (text, Nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Visits
- `id` (int, Primary Key)
- `campaign_id` (int, Foreign Key to campaigns, Nullable)
- `phone` (varchar, Nullable)
- `country` (varchar, Nullable)
- `operator` (varchar, Nullable)
- `ip_address` (varchar, Nullable)
- `user_agent` (varchar, Nullable)
- `landing_url` (text, Nullable)
- `vendor_id` (int, Foreign Key to vendors, Nullable) — Click attribution vendor
- `affiliate_id` (int, Foreign Key to affiliates, Nullable) — Click attribution affiliate
- `click_id` (varchar, Nullable) — Affiliate network unique click identifier
- `vid_raw` (varchar, Nullable) — Raw vendor parameter value from URL
- `aff_raw` (varchar, Nullable) — Raw affiliate parameter value from URL
- `visit_status` (varchar: VISIT, BLOCKED, SUBSCRIBED, PLAN_SHOWN, HOME_SHOWN, CONFIRM_SHOWN, SUCCESS, FAILED)
- `page_type` (varchar, Nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Visit Events
- `id` (int, Primary Key)
- `visit_id` (int, Foreign Key to visits, Cascade Delete)
- `event_type` (varchar: VISIT, BLOCKED, PLAN_VIEW, HOME_VIEW, CONFIRM_VIEW, SUBSCRIBE_CLICK, SUBSCRIBE_SUCCESS, SUBSCRIBE_FAILED)
- `metadata` (json, Nullable)
- `created_at` (timestamp)

### OTP Requests
- `id` (int, Primary Key)
- `visit_id` (int, Nullable)
- `campaign_id` (int, Nullable)
- `phone` (varchar(32))
- `otp_hash` (varchar(255))
- `otp_salt` (varchar(64), Nullable)
- `provider` (varchar(32), Nullable)
- `provider_request_id` (varchar(255), Nullable)
- `status` (varchar(32)) — 'sent', 'verified', 'failed'
- `attempts` (int, default 0)
- `verified_at` (timestamp, Nullable)
- `expires_at` (timestamp)
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

## 4. Routing & Page-Flow Engine

Incoming requests to `GET /flow/page` are processed dynamically using the campaign's `flow_config` (graph structure mapping nodes and conditional edges):

```
                        [ Incoming Request ]
                                 │
                                 ▼
                     [ Active Subscription Check ]
                                 │ (If already subscribed)
                                 ├──► Route to THANKYOU Page
                                 │
                                 ▼ (Otherwise)
                     [ Page Flow Graph Engine ]
                                 │
                   (Resolves next page by condition)
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼ (MSISDN Resolved)      ▼ (OTP Required)         ▼ (Verification Verified)
 [ Route to CONFIRM ]       [ Route to OTP ]         [ Route to CONFIRM ]
```

### Verification Modes & Routing Logic:
- **`MSISDN_ONLY`**: Resolves phone number via network headers or partner ISP API. If successful, transitions to `CONFIRM`, otherwise to `ERROR`.
- **`OTP_ONLY`**: Bypasses header checks and routes directly to `OTP` verification page, advancing to `CONFIRM` only after code validation.
- **`BOTH`**: Attempts pre-filling the phone number using MSISDN headers/APIs if possible, but always routes through the `OTP` verification screen before confirmation.

---

## 5. Affiliate Tracking & Click Attribution Flow

1. Subscriber lands via campaign marketing link containing query params:
   `https://domain.com/subscription?country=XX&operator=YY&vid=VENDOR_CODE&aff_id=AFFILIATE_CODE&click_id=CLICK_ID`
2. Routing matches campaign and parses the tracking parameters:
   - Queries `vendors` and `affiliates` tables to validate vendor/affiliate codes.
   - Saves click attribution details (`vendor_id`, `affiliate_id`, `click_id`, `vid_raw`, `aff_raw`) to the `Visit` record in database.
3. Telemetry events log impressions and conversions back-referenced to the attributed affiliate IDs.

---

## 6. Subscription & OTP Flow

1. User lands on HOME page and triggers the transition.
2. Flow Engine resolves the next node based on the campaign's verification mode:
   - If MSISDN resolved: transition to `CONFIRM` page.
   - If OTP required: transition to `OTP` page.
3. On `OTP` page, user requests OTP code (calls `POST /otp/send`). System hashes code and triggers SMS dispatch.
4. User inputs code (calls `POST /otp/verify`). Upon verification, Flow Engine moves the user to the `CONFIRM` page.
5. On `CONFIRM` page, user selects a billing pack and purchases (calls `POST /flow/transition`).
6. System performs blocklist and subscription checks dynamically via external configured partner APIs.
7. System calls partner charging API (`subscribe_api`). On success:
   - Updates `Visit` status to `SUCCESS` (or `SUBSCRIBED`).
   - Logs `SUBSCRIBE_SUCCESS` event (indexed in Elasticsearch/DB).
   - Routes to `THANKYOU` page.

---

## 7. Telemetry & Elasticsearch Logs

To handle high volumes without performance degradation:
- Visits and funnel telemetry events are recorded in relational DB and sent best-effort to **Elasticsearch** (when enabled via `ELASTICSEARCH_NODE`).
- A dedicated **Campaign Logs UI** replaces heavy SQL charts, querying Elasticsearch using search index parameters (`clickId`, `vendorId`, `affiliateId`, `phoneMasked`, `timestamp`) to audit user actions, errors, and conversions.
- Aggregated conversions compute the final Conversion Rate: `(successfulSubscriptions / totalVisits) * 100`..

---

## 7. Analytics Flow

Analytics data is updated real-time using events:
- Total unique traffic counts.
- Step-by-step conversion tracking:
  `Visits` → `OTP Views` → `Confirm Views` → `Subscribe Clicks` → `Success Subscriptions`.
- Conversion Rate Calculation: `(successfulSubscriptions / totalVisits) * 100`.

---

## 8. Security Model

- **Admin APIs**: Secured via standard `JwtAuthGuard` (Authorization header `Bearer <token>`). Endpoints verify that the logged-in user owns the resource being manipulated (Campaign-scoped ownership).
- **Public APIs**: Endpoints `/flow/*` and `/otp/*` are completely public (unauthenticated) to allow traffic from end-users, but they enforce rate-limiting, resend delays, brute-force lockout, and transition validations.

---

## 9. Future Scaling

1. **Caching**: Store routing records (blocklist state, active subscription mappings) in Redis with high TTL for sub-10ms response times.
2. **Read/Write DB Splitting**: Direct high-frequency analytics writes (Visits, Events) to write-heavy nodes or offload to queues (RabbitMQ/Kafka) to process asynchronously.
3. **Variable Engine Pre-rendering**: Shift variable replacements to edge nodes (CDN / Cloudflare Workers) to serve optimized HTML directly to mobile devices.
