# AI Onboarding & Context Memory

This document is designed to quickly onboard future AI models onto the TemplateCraft codebase, summarizing architectural patterns and codebase behaviors.

---

## 1. Key Architectural Patterns

- **API Response Wrapper**: All successful responses from the backend are wrapped in a standard JSON envelope: `{ success: true, statusCode, data }`. This is handled globally by `TransformInterceptor.ts`. Do NOT manually wrap success responses in controllers.
- **Client Funnel Sandbox**: The public user-facing runtime (`SubscriptionPage.jsx`) mounts campaign HTML/CSS templates inside a **Shadow DOM** container to isolate styling.
- **Header Phone Detection**: Phone number detection prioritizes operator headers (e.g. `X-MSISDN`) over query parameters.
- **OTP Production Masking**: Plaintext OTP codes are never sent in API responses or logged when `NODE_ENV === 'production'`.
- **IP & Phone Rate Limiting**: The public routes `/otp/*` and `/flow/transition` are protected by a custom `PublicRateLimitGuard` (setting `Retry-After` headers) and application-layer cooldowns and lockout rules.
- **Real-time OTP Analytics**: Provides database-agnostic aggregates of OTP events (Funnel, trends, geo performance) via `GET /api/analytics/otp`.

---

## 2. Active Database Schema (TypeORM Auto-Loaded)

Ensure that you do not query tables that do not exist:
- **`users`**: Admin user credentials.
- **`templates`**: JSON representations of GrapesJS pages.
- **`campaigns`**: Target campaign identifiers (Country + Operator must be unique).
- **`campaign_pages`**: Links campaigns to templates by page slot type.
- **`api_configs`**: External integrations endpoints (Blocklist, Subscription Validation, and Charging).
- **`visits`** / **`visit_events`**: High-frequency telemetry tracking.
- **`otp_requests`**: Hashed (SHA-256) validation codes.

---

## 3. Critical Codebase Behaviors

- **Campaign Copying**: Creating a campaign can copy page layouts from an existing campaign. If `copyFromCampaignId` is omitted, the backend seeds default templates (`default-funnel-pages.ts`).
- **GrapesJS Configuration**:
  - `nativeDnD` must remain `false`. Native browser drag-and-drop behaves erratically within iframes.
  - Style manager rules are defined in `styleManagerConfig.ts`.
- **Media Upload Strategy**: Uses S3 if credentials are provided; falls back to Cloudinary, and uses local storage in non-production environments if both cloud providers are missing.

---

## 4. Current Work Items & Todo Checklist

1. [x] **OTP Funnel Integration**: Wire up the OTP code verification flow. Update `FlowService.transition()` to handle `fromPage === OTP` transitions, and add event listeners in the frontend runtime (`SubscriptionPage.jsx`) to handle OTP send/verify button clicks inside the shadow DOM.
2. [x] **API Response Security**: Remove the plaintext `otp` parameter returned by the `/otp/send` controller.
3. [x] **Public API Throttling**: Configure guards on public routes (`/flow/*`, `/otp/*`) to prevent spamming and brute-force attempts.
4. **Obsolete Documentation Cleanup**: Review the project root directory and update references to direct `Subscriptions` and `Blocklist` tables.
5. **Database Archiving**: Add a cron job to archive or clean up old telemetry records from the `visits` and `visit_events` tables.
