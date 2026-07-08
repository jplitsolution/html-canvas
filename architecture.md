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
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
 [ AuthModule ]        [ UsersModule ]       [ CampaignsModule ]
        │                                           │
        ▼                                           ▼
 [ UploadModule ]                            [ TemplatesModule ]
                                                    │
                                                    ▼
                                              [ FlowModule ]
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
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Campaign Pages
- `id` (int, Primary Key)
- `campaign_id` (int, Foreign Key to campaigns, Cascade Delete)
- `page_type` (varchar: HOME, CONFIRM, OTP, THANKYOU, BLOCKED, ERROR)
- `template_id` (int, Foreign Key to templates, Set Null)
- `created_at` (timestamp)
- `updated_at` (timestamp)

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

## 4. Routing Flow

Incoming request to `GET /flow/page` and subsequent steps follow this routing path:

```
[ Incoming Request ]
         │
         ▼
[ Active Subscription Check ] ──► (Already Subscribed via Partner API?) ──► [Yes] ──► Route to THANKYOU Page
         │
         ▼ [No]
[ MSISDN Detection ] ───────────► (Is MSISDN Phone Detected?) ───────────► [Yes] ──► Route to CONFIRM Page
         │
         ▼ [No]
Route to OTP Page (and verify phone number)
```

> [!NOTE]
> The dynamic **Blocklist Check** is performed via partner APIs during the subscription confirmation transition. If the phone number is blocked, the user is redirected to the **BLOCKED** page.

---

## 5. Publish Flow

1. Client opens `https://domain.com/subscription?country=XX&operator=YY&msisdn=ZZ`.
2. Server matches campaign by `country` and `operator`.
3. Create `Visit` record in database (status `VISIT`).
4. Execute page compilation, replace placeholders, and return page details.

---

## 6. Subscription & OTP Flow

1. User lands on HOME page, clicks subscribe.
2. If phone is detected:
   - Transition to `CONFIRM` page.
3. If phone is NOT detected:
   - Transition to `OTP` page.
   - User requests OTP (calls `POST /otp/send`). SMS is sent via dynamic campaign provider (Twilio, MSG91, Kaleyra, Custom HTTP, or Partner).
   - User inputs code (calls `POST /otp/verify`).
   - If verified, frontend requests transition to `CONFIRM`.
4. User selects a pack on the `CONFIRM` page and clicks to buy (calls `POST /flow/transition`).
5. Backend performs blocklist validation (calls partner `blocklist_api`). If blocked, routes to `BLOCKED`.
6. Backend processes billing validation (calls partner `subscription_api`). If already subscribed, routes to `THANKYOU`.
7. Backend requests new subscription charging (calls partner `subscribe_api`).
8. On success:
   - Update `Visit` status to `SUCCESS` (or `SUBSCRIBED`).
   - Log `SUBSCRIBE_SUCCESS` event.
   - Route to `THANKYOU` page.

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
