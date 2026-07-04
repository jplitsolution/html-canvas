# Database Entities: Code-Level Schema Definitions

This document details the TypeORM decorators, properties, relationships, and constraint mappings for every database entity.

---

## 1. User Entity (`user.entity.ts`)

- **Class**: `User`
- **Table**: `users`
- **Fields**:
  - `id`: `number` (Primary Generated Column)
  - `email`: `string` (Column, Unique)
  - `password`: `string` (Column, Select: false) — Hashed password (hidden by default in TypeORM queries)
  - `name`: `string` (Column)
  - `avatar`: `string` (Column, Nullable)
  - `createdAt`: `Date` (Create Date Column, name: `created_at`)
  - `updatedAt`: `Date` (Update Date Column, name: `updated_at`)

---

## 2. Template Entity (`template.entity.ts`)

- **Class**: `Template`
- **Table**: `templates`
- **Fields**:
  - `id`: `number` (Primary Generated Column)
  - `name`: `string` (Column)
  - `data`: `any` (Column, type: `json`) — Holds HTML, CSS, and editor project JSON
  - `userId`: `number` (Column, name: `user_id`, Nullable)
  - `isPrebuilt`: `boolean` (Column, name: `is_prebuilt`, Default: `false`)
  - `createdAt`: `Date` (Create Date Column, name: `created_at`)
  - `updatedAt`: `Date` (Update Date Column, name: `updated_at`)

---

## 3. Campaign Entity (`campaign.entity.ts`)

- **Class**: `Campaign`
- **Table**: `campaigns`
- **Indexes**: Unique index on `['country', 'operator']`
- **Fields**:
  - `id`: `number` (Primary Generated Column)
  - `name`: `string` (Column)
  - `country`: `string` (Column) — Campaign target country
  - `operator`: `string` (Column) — Campaign target mobile operator
  - `serviceId`: `string` (Column, name: `service_id`, Nullable) — Billing package ID
  - `active`: `boolean` (Column, Default: `false`)
  - `userId`: `number` (Column, name: `user_id`)
  - `createdAt`: `Date` (Create Date Column, name: `created_at`)
  - `updatedAt`: `Date` (Update Date Column, name: `updated_at`)
- **Relations**:
  - `user`: `@ManyToOne(() => User, { onDelete: 'CASCADE' })`
  - `pages`: `@OneToMany(() => CampaignPage, (page) => page.campaign)`

---

## 4. Campaign Page Entity (`campaign-page.entity.ts`)

- **Class**: `CampaignPage`
- **Table**: `campaign_pages`
- **Indexes**: Unique compound index on `['campaignId', 'pageType']`
- **Fields**:
  - `id`: `number` (Primary Generated Column)
  - `campaignId`: `number` (Column, name: `campaign_id`)
  - `pageType`: `CampaignPageType` (Column, name: `page_type`, enum)
  - `templateId`: `number` (Column, name: `template_id`, Nullable)
  - `createdAt`: `Date` (Create Date Column, name: `created_at`)
  - `updatedAt`: `Date` (Update Date Column, name: `updated_at`)
- **Relations**:
  - `campaign`: `@ManyToOne(() => Campaign, (campaign) => campaign.pages, { onDelete: 'CASCADE' })`
  - `template`: `@ManyToOne(() => Template, { onDelete: 'SET NULL', nullable: true })`

---

## 5. API Config Entity (`api-config.entity.ts`)

- **Class**: `ApiConfig`
- **Table**: `api_configs`
- **Indexes**: Unique index on `campaignId`
- **Fields**:
  - `id`: `number` (Primary Generated Column)
  - `campaignId`: `number` (Column, name: `campaign_id`)
  - `userApi`: `string` (Column, name: `user_api`, Nullable)
  - `blocklistApi`: `string` (Column, name: `blocklist_api`, Nullable)
  - `subscriptionApi`: `string` (Column, name: `subscription_api`, Nullable)
  - `subscribeApi`: `string` (Column, name: `subscribe_api`, Nullable)
  - `headersJson`: `string` (Column, name: `headers_json`, type: `text`, Nullable)
  - `createdAt`: `Date` (Create Date Column, name: `created_at`)
  - `updatedAt`: `Date` (Update Date Column, name: `updated_at`)

---

## 6. Visit Entity (`visit.entity.ts`)

- **Class**: `Visit`
- **Table**: `visits`
- **Indexes**: Index on `campaignId`
- **Fields**:
  - `id`: `number` (Primary Generated Column)
  - `campaignId`: `number` (Column, name: `campaign_id`, Nullable)
  - `phone`: `string` (Column, Nullable)
  - `country`: `string` (Column, Nullable)
  - `operator`: `string` (Column, Nullable)
  - `ipAddress`: `string` (Column, name: `ip_address`, Nullable)
  - `userAgent`: `string` (Column, name: `user_agent`, Nullable)
  - `landingUrl`: `string` (Column, name: `landing_url`, type: `text`, Nullable)
  - `visitStatus`: `VisitStatus` (Column, name: `visit_status`, enum, Default: `VISIT`)
  - `pageType`: `string` (Column, name: `page_type`, Nullable)
  - `createdAt`: `Date` (Create Date Column, name: `created_at`)
  - `updatedAt`: `Date` (Update Date Column, name: `updated_at`)
- **Relations**:
  - `events`: `@OneToMany(() => VisitEvent, (event) => event.visit)`

---

## 7. Visit Event Entity (`visit-event.entity.ts`)

- **Class**: `VisitEvent`
- **Table**: `visit_events`
- **Indexes**: Index on `visitId`
- **Fields**:
  - `id`: `number` (Primary Generated Column)
  - `visitId`: `number` (Column, name: `visit_id`)
  - `eventType`: `VisitEventType` (Column, name: `event_type`, enum)
  - `metadata`: `any` (Column, type: `json`, Nullable)
  - `createdAt`: `Date` (Create Date Column, name: `created_at`)
- **Relations**:
  - `visit`: `@ManyToOne(() => Visit, (visit) => visit.events, { onDelete: 'CASCADE' })`

---

## 8. OTP Request Entity (`otp-request.entity.ts`)

- **Class**: `OtpRequest`
- **Table**: `otp_requests`
- **Indexes**: Compound index on `['phone', 'createdAt']`
- **Fields**:
  - `id`: `number` (Primary Generated Column)
  - `phone`: `string` (Column)
  - `otpHash`: `string` (Column, name: `otp_hash`)
  - `otpSalt`: `string` (Column, name: `otp_salt`)
  - `visitId`: `string` (Column, name: `visit_id`, Nullable)
  - `attempts`: `number` (Column, Default: `0`)
  - `usedAt`: `Date` (Column, name: `used_at`, Nullable)
  - `expiresAt`: `Date` (Column, name: `expires_at`)
  - `createdAt`: `Date` (Create Date Column, name: `created_at`)
