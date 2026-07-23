# AI Onboarding & Context Memory

This document is designed to quickly onboard future AI models onto the TemplateCraft codebase, summarizing architectural patterns and codebase behaviors.

---

## 1. Key Architectural Patterns

- **API Response Wrapper**: All successful responses from the backend are wrapped in a standard JSON envelope: `{ success: true, statusCode, data }`. This is handled globally by `TransformInterceptor.ts`. Do NOT manually wrap success responses in controllers.
- **Client Funnel Sandbox**: The public user-facing runtime (`SubscriptionPage.jsx`) mounts campaign HTML/CSS templates inside a **Shadow DOM** container to isolate styling.
- **Header Phone Detection**: Phone number detection prioritizes operator headers (e.g. `X-MSISDN`) over query parameters.
- **OTP Production Masking**: Plaintext OTP codes are never sent in API responses or logged when `NODE_ENV === 'production'`.
- **IP & Phone Rate Limiting**: The public routes `/otp/*` and `/flow/transition` are protected by a custom `PublicRateLimitGuard` (setting `Retry-After` headers) and application-layer cooldowns and lockout rules.
- **Elasticsearch Logging**: Telemetry clicks and funnel events are pushed to an Elasticsearch index (`campaign_events`) for fast audit log querying, replacing relational DB queries for charts.
- **In-Memory Caching (Phase 1)**: Key campaign configurations, API configs, and partner attribution checks are cached for 15 seconds in `FlowService` to optimize query reads.
- **Batch Telemetry Event Queue (Phase 3)**: High-frequency user events are buffered inside `AnalyticsService` and bulk-inserted every 5 seconds (or at 100 queue size) to prevent SQL database write locks under high volume traffic spikes.
- **Telemetry Query Caching (Phase 3)**: Active session visit records are cached for 10 seconds to eliminate redundant database reads during Elasticsearch indexing.
- **Action-Mapped Hotspots**: Custom hotspots placed on page templates can trigger `SUBSCRIBE` actions (by setting `data-action="SUBSCRIBE"` and `href="#"`).
- **Intercepted Client Routing**: The public client runtime (`SubscriptionPage.jsx`) intercepts anchor clicks pointing to step paths (like `HOME`, `OTP`, `CONFIRM`, etc.) to run client-side state transitions (using query parameters) instead of regular window redirections.

---

## 2. Active Database Schema (TypeORM Auto-Loaded)

Ensure that you do not query tables that do not exist:
- **`users`**: Admin user credentials.
- **`templates`**: JSON representations of GrapesJS pages.
- **`campaigns`**: Target campaign identifiers (Country + Operator must be unique; supports `vendorId`, `verificationMode`, and `flowConfig`).
- **`campaign_pages`**: Links campaigns to templates by page slot type.
- **`vendors`**: Advertiser/vendor short codes (for `vid` tracking parameter).
- **`affiliates`**: Advertiser affiliates short codes (for `aff_id` tracking parameter).
- **`api_configs`**: External integrations endpoints (Blocklist, Subscription Validation, and Charging).
- **`visits`** / **`visit_events`**: High-frequency telemetry tracking (extended with affiliate attribution fields).
- **`otp_requests`**: Hashed (SHA-256) validation codes.

---

## 3. Critical Codebase Behaviors

- **Campaign Copying**: Creating a campaign can copy page layouts from an existing campaign. If `copyFromCampaignId` is omitted, the backend seeds default templates (`default-funnel-pages.ts`).
- **Configurable Page Flows**: Campaigns use `flow_config` graphs (nodes and edges) to dynamically determine the next page type on action outcome transitions.
- **Affiliate Click Attribution**: Traffic URL parameters (`vid`, `aff_id`, `click_id`) are resolved against database vendors/affiliates to attribute incoming visits.
- **Elasticsearch Auditing**: Audit logging queries are routed to Elasticsearch via the `SearchService` (falls back silently to empty results if `ELASTICSEARCH_NODE` is missing).
- **GrapesJS Configuration**:
  - `nativeDnD` must remain `false`. Native browser drag-and-drop behaves erratically within iframes.
  - Style manager rules are defined in `styleManagerConfig.ts`.
- **Media Upload Strategy**: Uses S3 if credentials are provided; falls back to Cloudinary, and uses local storage in non-production environments if both cloud providers are missing.

---

## 4. Current Work Items & Todo Checklist

1. [x] **OTP Funnel Integration**: Wire up the OTP code verification flow. Update `FlowService.transition()` to handle `fromPage === OTP` transitions, and add event listeners in the frontend runtime (`SubscriptionPage.jsx`) to handle OTP send/verify button clicks inside the shadow DOM.
2. [x] **API Response Security**: Remove the plaintext `otp` parameter returned by the `/otp/send` controller.
3. [x] **Public API Throttling**: Configure guards on public routes (`/flow/*`, `/otp/*`) to prevent spamming and brute-force attempts.
4. [x] **Obsolete Documentation Cleanup**: Review the project root directory and update references to direct `Subscriptions` and `Blocklist` tables.
5. [x] **Elasticsearch Security**: Bind Elasticsearch port 9200 to localhost only (`127.0.0.1:9200`) in Docker configurations to prevent ransomware attacks.
6. [x] **Admin Personalization**: Build `ProfilePage.jsx` and customize log dates to render with local timezones.
7. [x] **Production PM2 Wrappers**: Configure PM2 ecosystem and start script wrappers to run build checks in deploy processes.
8. [ ] **Database Archiving**: Add a cron job to archive or clean up old telemetry records from the `visits` and `visit_events` tables.
9. [x] **Preview Mode UI Fixes**: Fixed background image rendering in the shadow DOM by sanitizing double quotes in inline style attributes.
