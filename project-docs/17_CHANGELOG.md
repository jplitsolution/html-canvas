# Changelog & Development Progression

This document tracks all version additions, database schema updates, and feature upgrades completed in the project.

---

## [2.1.0] - Phase 2 (Profile, Security, & Deployment Upgrades)

### Added
- **Admin Profile & Personalization**:
  - Profile Page (`ProfilePage.jsx`) enabling name/email updates and password change.
  - Timezone & Date Formatting Engine: Select local timezone and format preferences, formatted runtime logs dates in `CampaignLogsPage.jsx` using new `date.js` utility.
  - Zustand UI store slice (`uiSlice.js`) persisting UI preferences like timezone.
  - **Dynamic Logs Redirection**: Added a Logs shortcut button in the header and under Quick actions on `CampaignDetailPage.jsx` to navigate directly to `CampaignLogsPage.jsx` with that specific campaign selected using `useSearchParams`.
  - **User Session Flow Timeline**: Clicking on any log row on the `Campaign Logs` dashboard opens a visual vertical chronological timeline modal displaying the journey of that specific visitor session (`visitId`).
  - **Quick Column Filters**: Clicking on table cell values (Event Name, Vendor code, Affiliate code, Click ID, or MSISDN) instantly filters the telemetry dashboard by that specific cell value without opening the timeline modal (via click event propagation control).
- **Deploy & PM2 Scripts**:
  - `backend/start.sh` and `frontend/start.sh` to run clean builds before execution under PM2 process definitions.
  - PM2 configuration in `ecosystem.config.cjs` mapping bash start wrappers.
  - Automagic full-stack deploy script `deploy.sh`.

### Security
- **Elasticsearch Localhost Binding**: Bound Elasticsearch port `9200` to `127.0.0.1` in `docker-compose.yml` to prevent public ports exposure and mitigate ransomware attack vectors.

## [2.0.0] - Phase 2 (Core Upgrades)

### Added
- **OTP Generation & Verification Subsystem**:
  - Hashing and salting engine utilizing Node's core `crypto` module (SHA-256).
  - REST endpoints `/otp/send` and `/otp/verify` to request and validate verification codes.
  - Hashed records logged inside the `otp_requests` database table.
- **Media Upload Manager**:
  - AWS S3 storage provider (`@aws-sdk/client-s3`) integration.
  - Cloudinary storage integration for asset fallbacks.
  - Local upload fallback for development mode.
- **Self-Generating API Docs**:
  - Integrated `@nestjs/swagger` OpenAPI specification wrapper in `main.ts`.

### Modified
- **Database Schema Migration (`1760000000001-AddOtpRequests.ts`)**:
  - Created the `otp_requests` table with fields `phone`, `otp_hash`, `otp_salt`, `visit_id`, `attempts`, `used_at`, `expires_at`, `created_at`.
  - Added indexes on `(phone, created_at)`.

---

## [1.0.0] - Phase 1

### Added
- **Campaign Engine**:
  - Models for campaigns containing country, operator, and status keys.
  - Isolated pages slots for Home, Confirm, OTP, Thank You, Blocked, and Error.
- **GrapesJS React Canvas Builder**:
  - Configured visual editor in the administration dashboard.
  - GrapesJS customizations: custom style sectors, components outline manager, and drag-and-drop enhancements.
- **Analytics & Funnel Tracking**:
  - Logging of customer visits and funnel interaction metrics inside the `visits` and `visit_events` tables.
  - Real-time conversion rate logic.
- **Dynamic Variables Resolver**:
  - Interpolation service that replaces string variables (e.g. `{{phone}}`, `{{operator}}`) within visual HTML templates.
- **Partner Integrations System**:
  - Configuration settings for external partner APIs (Blocklist check, Active subscription verify, Charging API).

### Modified
- **Initial Schema Migration (`1730000000000-InitialSchema.ts`)**:
  - Created tables `users`, `templates`, `campaigns`, `campaign_pages`, `api_configs`, `visits`, `visit_events`.
  - Configured indexes and delete cascade references.
