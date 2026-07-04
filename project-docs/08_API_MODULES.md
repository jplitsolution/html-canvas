# API Modules: Subsystem Specifications

The backend is organized into eight functional modules. Each manages a distinct component of the platform's logical domain.

---

## 1. Authentication Module (`AuthModule`)

Handles registration, validation, and profile retrieval for administrative users.
- **Controller**: `auth.controller.ts`
- **Service**: `auth.service.ts`
- **DTOs**: `RegisterDto` (email, password, name), `LoginDto` (email, password)
- **Key Operations**:
  - `register()`: Salting and hashing passwords via BCrypt, calling `UsersService` to insert, returning the sanitised user profile.
  - `login()`: Validates credentials, signs JWT payload, and returns the token.
  - `me`: Retreives profile details from the request context.

---

## 2. Users Module (`UsersModule`)

Encapsulates basic database storage and entity queries for admin users.
- **Service**: `users.service.ts`
- **Entity**: `user.entity.ts`
- **Key Operations**:
  - `create()`: Inserts a new user record.
  - `findByEmailWithPassword()`: Query selector including password hash for validation.

---

## 3. Campaigns Module (`CampaignsModule`)

Coordinates campaigns, pages mapping, and API configurations.
- **Controller**: `campaigns.controller.ts`
- **Service**: `campaigns.service.ts`
- **Entities**: `Campaign`, `CampaignPage`
- **DTOs**: `CreateCampaignDto`, `UpdateCampaignDto`, `UpdateCampaignPageDto`
- **Key Operations**:
  - `create()`: Creates a new campaign, and provisions slots for all six funnel page types (Home, Confirm, OTP, Thank You, Blocked, Error). If `copyFromCampaignId` is present, it clones visual layouts; otherwise, it seeds default pages.
  - `updatePageContent()`: Updates GrapesJS JSON data, HTML, and CSS configurations for a specific page slot.
  - `upsertApiConfig()`: Saves external partner check/charge API URLs and custom headers.

---

## 4. Templates Module (`TemplatesModule`)

Manages prebuilt and custom page designs.
- **Controller**: `templates.controller.ts`
- **Service**: `templates.service.ts`
- **Entity**: `template.entity.ts`
- **DTOs**: `CreateTemplateDto`
- **Key Operations**:
  - `findAllPrebuilt()`: Lists system templates loaded on startup. Strips heavier HTML/CSS content to return a lightweight index.
  - `findUserTemplates()`: Lists the custom page designs of the logged-in administrator.

---

## 5. Upload Module (`UploadModule`)

Handles assets and images upload.
- **Controller**: `upload.controller.ts`
- **Services**: `upload.service.ts`, `s3-upload.service.ts`, `local-upload.service.ts`
- **Key Operations**:
  - `uploadImage()`: Accepts file uploads, checks format (images only), and dispatches to S3, Cloudinary, or local fallback depending on environmental settings.

---

## 6. Flow Module (`FlowModule`)

Orchestrates public traffic funnel routing and variables interpolation.
- **Controller**: `flow.controller.ts`
- **Services**: `flow.service.ts`, `partner-api.service.ts`, `VariableResolverService`
- **DTOs**: `GetFlowPageQueryDto`, `FlowTransitionDto`
- **Key Operations**:
  - `getPage()`: Dynamic funnel lookup. Resolves campaign, runs subscription validation checks via partner APIs, compiles template, and swaps placeholders (e.g. `{{operator}}`) with client variables.
  - `transition()`: Advances funnel step, checks blocklists, updates visit status, and executes subscribe events.

---

## 7. OTP Module (`OtpModule`)

Security verification codes generator, rate-limiter, and validator utilizing a stateless provider adapter architecture.
- **Controller**: `otp.controller.ts`
- **Services**: `otp.service.ts`, `SmsProviderManager`, `TwilioProvider`, `Msg91Provider`, `KaleyraProvider`, `PartnerProvider`, `CustomHttpProvider`
- **Entity**: `otp-request.entity.ts`
- **DTOs**: `OtpSendDto`, `OtpVerifyDto`
- **Key Operations**:
  - `generate()`: Dynamic resolution of provider from campaign API settings. Enforces a 60-second resend delay and a 5-requests-per-10-minute rate limit. Generates locally (Twilio, MSG91, Kaleyra, Custom HTTP) or requests operator-generated codes (Partner mode). Saves salted SHA-256 hashes in `otp_requests`.
  - `verify()`: Resolves session, validates expiry, checks attempts threshold (max 5), and compares hashes locally or calls partner operator verify APIs. Marks records as verified on success.
  - `testSend()`: Dispatches test OTP using unsaved UI parameters to verify configurations.
  - `healthCheck()`: Performs connectivity check to gateway providers to validate API settings.

---

## 8. Analytics Module (`AnalyticsModule`)

Telemetry tracker logging customer visits and funnel conversions.
- **Controller**: `analytics.controller.ts`
- **Service**: `analytics.service.ts`
- **Entities**: `Visit`, `VisitEvent`
- **Key Operations**:
  - `getCampaignAnalytics()`: Aggregates total visits, block rates, successful/failed billing actions, and calculates conversion ratios.
  - `createVisit()` / `logEvent()`: High-frequency logs.
