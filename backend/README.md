# Dynamic Subscription Flow Builder Backend

This is the backend API for the Visual Builder and Dynamic Subscription Flow Engine, powered by **NestJS**, **TypeORM**, and supporting **PostgreSQL** or **MySQL**.

---

## Tech Stack & Key Modules

- **Core**: NestJS + TypeScript
- **Database**: PostgreSQL / MySQL + TypeORM Migrations
- **Authentication**: Passport.js + JWT
- **APIs**: REST API + Swagger Documentation
- **Testing**: Jest unit tests

---

## Architecture & Module Overview

- **Auth**: JWT register / login and profile authentication.
- **Users**: User account entities.
- **Campaigns**: Country + operator campaigns with per-page canvas templates (HOME, CONFIRM, THANKYOU, BLOCKED, ERROR) and partner API config.
- **Flow**: Public runtime API — resolves campaign by country/operator (or `campid`), applies the per-campaign verification mode + flow graph, calls partner blocklist/subscribe/MSISDN-resolve APIs, and serves rendered HTML.
- **Flow Engine**: Interprets a campaign's `flowConfig` (page graph) and `verificationMode` (`MSISDN_ONLY` | `OTP_ONLY` | `BOTH`) to decide page transitions.
- **Partners**: Vendors and their Affiliates. Assign a vendor to a campaign, generate affiliate tracking URLs, and attribute clicks.
- **Templates**: Reusable canvas layouts and system seeds.
- **Variable Engine**: Renders placeholders like `{{phone}}`, `{{country}}`, `{{operator}}` dynamically inside HTML.
- **Analytics**: Captures visits and visit events per campaign (with vendor/affiliate/click attribution) to calculate conversion rates.
- **Search / Logs**: Optional Elasticsearch mirror of funnel events for the in-app Campaign Logs viewer (`GET /api/logs/campaign/:id` + `/aggregations`).
- **Upload**: Image upload for canvas assets.

### Verification modes

- `MSISDN_ONLY`: resolve the number (header / ISP API via `ApiConfig.resolveMsisdnUrl`). On success go to CONFIRM, otherwise ERROR.
- `OTP_ONLY`: always send the user through the OTP page.
- `BOTH`: attempt to resolve the number to prefill, but still require OTP.

### Click attribution / tracking URL

Shared campaign URLs look like:

```
/subscription?country=sa&operator=zain&campid=12&vid=acme&aff_id=aff01&click_id={}
```

`vid` and `aff_id` resolve to a vendor/affiliate; `click_id` (macro `{}` filled by the network) and the raw params are stored on the visit.

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server
PORT=3000
NODE_ENV=development

# Database Configuration (supports postgres or mysql)
DB_TYPE=mysql                     # mysql | postgres
DB_HOST=localhost
DB_PORT=3306                      # 3306 for mysql, 5432 for postgres
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=builder_db

# Security
JWT_SECRET=super_secret_session_token_key
JWT_EXPIRATION=24h

# Elasticsearch (optional — powers the in-app Campaign Logs viewer).
# Leave unset to disable; the app runs fine without it.
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=campaign_events
```

Start Elasticsearch (and MySQL) with `docker compose up -d`. Backfill historical
events into ES with `node scripts/reindex-logs.mjs`.

---

## Installation & Running

```bash
# Install dependencies
$ npm install

# Start database container
$ docker-compose up -d

# Create database (first time)
$ npm run db:setup

# Fresh install / after schema changes — drops and recreates the database
$ npm run db:reset

# Migrations run automatically on startup (single file: InitialSchema)
$ npm run start:dev
```

---

## Running Tests

```bash
# Unit tests
$ npm run test

# End-to-end API smoke test (server must be running)
$ node scripts/test-apis.mjs
```

---

## Core Flows

### 1. Admin — Campaign Setup

1. Create a campaign with `country`, `operator`, and `serviceId`.
2. Apply default funnel pages or edit each page in the canvas editor.
3. Configure partner API URLs on the campaign (`blocklistApi`, `subscribeApi`, etc.).
4. Activate the campaign.

### 2. Public — Subscription Flow

`GET /api/flow/page?country=India&operator=Zain&page=HOME&msisdn=919876543210`

Resolves the active campaign, calls partner APIs as needed, and returns rendered HTML for the requested funnel step.

`POST /api/flow/transition`

Handles button actions (`data-action` in template HTML) such as confirm subscribe, advancing the funnel.

### 3. Analytics

`GET /api/analytics/campaign/:campaignId`

Returns visit counts, blocked/subscribed users, and conversion rate for a campaign.
