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
[ AuthModule ]        [ UsersModule ]       [ ProjectsModule ]
       │                                           │
       │                                           ▼
       │                                    [ TemplatesModule ]
       │                                           │
       ▼                                           ▼
[ UploadModule ]                             [ PagesModule ]
                                                   │
                                                   ▼
                                            [ ApiConfigModule ]
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
                                            [ PublishModule ]
```

---

## 3. Database Schema

All entities are configured using TypeORM and support both MySQL and PostgreSQL.

### Projects
- `id` (int, Primary Key)
- `name` (varchar)
- `slug` (varchar, Unique, Indexed)
- `service_id` (varchar, Nullable)
- `data` (json, Nullable)
- `user_id` (int, Foreign Key to users)

### Pages
- `id` (int, Primary Key)
- `project_id` (int, Foreign Key to projects, Cascade Delete)
- `template_id` (int, Foreign Key to templates, Set Null)
- `name` (varchar)
- `slug` (varchar)
- `page_type` (varchar: LOADING, PLAN, THANKYOU, BLOCKED, ERROR)

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
- `project_id` (int, Unique, Foreign Key to projects, Cascade Delete)
- `user_api` (varchar, Nullable)
- `blocklist_api` (varchar, Nullable)
- `subscription_api` (varchar, Nullable)
- `subscribe_api` (varchar, Nullable)
- `headers_json` (text, Nullable)

### Visits
- `id` (int, Primary Key)
- `project_id` (int)
- `phone` (varchar)
- `country` (varchar)
- `operator` (varchar)
- `ip_address` (varchar)
- `user_agent` (varchar)
- `landing_url` (text)
- `visit_status` (varchar: VISIT, BLOCKED, SUBSCRIBED, PLAN_SHOWN, SUCCESS, FAILED)
- `page_type` (varchar, Nullable)

### Visit Events
- `id` (int, Primary Key)
- `visit_id` (int, Foreign Key to visits, Cascade Delete)
- `event_type` (varchar: VISIT, BLOCKED, PLAN_VIEW, SUBSCRIBE_CLICK, SUBSCRIBE_SUCCESS, SUBSCRIBE_FAILED)
- `metadata` (json, Nullable)

---

## 4. Routing Flow

Incoming request to `GET /p/:slug` follows this routing path:

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
Route to PLAN Page
```

---

## 5. Publish Flow

1. Client opens `https://domain.com/p/:slug?msisdn=XXX&country=YY&operator=ZZ`.
2. Controller matches project by `slug`.
3. Create `Visit` record in database (status `VISIT`).
4. Execute `RoutingService.resolvePage()`.
5. Update `Visit` status according to routing results.
6. Return JSON payload containing pageType, pageId, templateId, visitId and replacement variables.

---

## 6. Subscription Flow

1. User clicks "Subscribe" on the Plan Page.
2. App sends `POST /public/subscribe` containing `{ visitId, projectId, phone, planId }`.
3. Log event `SUBSCRIBE_CLICK`.
4. Load project's `ApiConfig`.
5. Call Partner Billing URL with headers configured in `headersJson`.
6. **On Success**:
   - Update `Visit` to `SUCCESS`.
   - Log `SUBSCRIBE_SUCCESS` event.
   - Insert/Update `Subscription` record with status `ACTIVE`.
   - Return Redirection/Thank You page details.
7. **On Failure**:
   - Update `Visit` to `FAILED`.
   - Log `SUBSCRIBE_FAILED` event.
   - Return Error page details.

---

## 7. Analytics Flow

Analytics data is updated real-time using events:
- Total unique traffic counts.
- Step-by-step conversion tracking:
  `Visits` → `Plan Views` → `Subscribe Clicks` → `Success Subscriptions`.
- Conversion Rate Calculation: `(successfulSubscriptions / totalVisits) * 100`.

---

## 8. Security Model

- **Admin APIs**: Secured via standard `JwtAuthGuard` (Authorization header `Bearer <token>`). Endpoints verify that the logged-in user owns the resource being manipulated (Project-scoped ownership).
- **Public APIs**: Endpoints `/p/:slug` and `/public/subscribe` are completely public (unauthenticated) to allow traffic from end-users, but they are read-only regarding configs and enforce tracking constraints.

---

## 9. Future Scaling

1. **Caching**: Store routing records (blocklist state, active subscription mappings) in Redis with high TTL for sub-10ms response times.
2. **Read/Write DB Splitting**: Direct high-frequency analytics writes (Visits, Events) to write-heavy nodes or offload to queues (RabbitMQ/Kafka) to process asynchronously.
3. **Variable Engine Pre-rendering**: Shift variable replacements to edge nodes (CDN / Cloudflare Workers) to serve optimized HTML directly to mobile devices.
