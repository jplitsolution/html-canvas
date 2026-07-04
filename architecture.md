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
        │                                           ▼
        │                                    [ TemplatesModule ]
        │                                           │
        │                                           ▼
        │                                     [ PagesModule ]
        │                                           │
        ▼                                           ▼
 [ UploadModule ]                            [ ApiConfigModule ]
                                                    │
                                                    ▼
                                             [ BlocklistModule ]
                                                    │
                                                    ▼
                                           [ SubscriptionsModule ]
                                                    │
                                                    ▼
                                             [ RoutingModule ]
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

### Campaigns
- `id` (int, Primary Key)
- `name` (varchar)
- `country` (varchar)
- `operator` (varchar)
- `service_id` (varchar, Nullable)
- `data` (json, Nullable)
- `user_id` (int, Foreign Key to users)

### Campaign Pages
- `id` (int, Primary Key)
- `campaign_id` (int, Foreign Key to campaigns, Cascade Delete)
- `template_id` (int, Foreign Key to templates, Set Null)
- `name` (varchar)
- `slug` (varchar)
- `page_type` (varchar: HOME, CONFIRM, OTP, THANKYOU, BLOCKED, ERROR)

### Blocklist Entries
- `id` (int, Primary Key)
- `phone` (varchar, Indexed)
- `reason` (varchar, Nullable)
- `active` (boolean, default true)

### Subscriptions
- `id` (int, Primary Key)
- `phone` (varchar)
- `service_id` (varchar)
- `status` (varchar: ACTIVE, PENDING, CANCELLED)
- Compound index on `(phone, service_id)`

### API Configs
- `id` (int, Primary Key)
- `campaign_id` (int, Unique, Foreign Key to campaigns, Cascade Delete)
- `user_api` (varchar, Nullable)
- `blocklist_api` (varchar, Nullable)
- `subscription_api` (varchar, Nullable)
- `subscribe_api` (varchar, Nullable)
- `headers_json` (text, Nullable)
- `otp_provider` (varchar(32), Nullable)
- `otp_config_json` (text, Nullable)

### Visits
- `id` (int, Primary Key)
- `campaign_id` (int)
- `phone` (varchar)
- `country` (varchar)
- `operator` (varchar)
- `ip_address` (varchar)
- `user_agent` (varchar)
- `landing_url` (text)
- `visit_status` (varchar: VISIT, BLOCKED, OTP_SHOWN, CONFIRM_SHOWN, SUCCESS, FAILED)
- `page_type` (varchar, Nullable)

### Visit Events
- `id` (int, Primary Key)
- `visit_id` (int, Foreign Key to visits, Cascade Delete)
- `event_type` (varchar: VISIT, BLOCKED, OTP_VIEW, CONFIRM_VIEW, SUBSCRIBE_CLICK, SUBSCRIBE_SUCCESS, SUBSCRIBE_FAILED)
- `metadata` (json, Nullable)

### OTP Requests
- `id` (int, Primary Key)
- `visit_id` (int, Nullable)
- `campaign_id` (int, Nullable)
- `phone` (varchar(32))
- `otp_hash` (varchar(255))
- `otp_salt` (varchar(64), Nullable)
- `provider` (varchar(32), Nullable)
- `provider_request_id` (varchar(255), Nullable)
- `status` (varchar(32))
- `attempts` (int, default 0)
- `verified_at` (datetime, Nullable)
- `expires_at` (datetime)

---

## 4. Routing Flow

Incoming request to `GET /flow/page` follows this routing path:

```
[ Incoming Request ]
         │
         ▼
[ Blocklist Check ] ─────► (Is Blocked?) ─────► [Yes] ─────► Route to BLOCKED Page
         │
         ▼ [No]
[ Subscription Check] ──► (Is Active?) ───────► [Yes] ─────► Route to THANKYOU Page
         │
         ▼ [No]
 (Is MSISDN Detected?) ──► [Yes] ──► Route to CONFIRM Page
         │
         ▼ [No]
Route to OTP Page
```

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
5. Calls Partner Billing URL with headers configured in `headersJson`.
6. On success:
   - Update `Visit` to `SUCCESS`.
   - Log `SUBSCRIBE_SUCCESS` event.
   - Insert `Subscription` with status `ACTIVE`.
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
