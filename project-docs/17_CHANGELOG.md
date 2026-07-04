# Changelog & Development Progression

This document tracks all version additions, database schema updates, and feature upgrades completed in the project.

---

## [2.0.0] - Phase 2 (Current Release)

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
