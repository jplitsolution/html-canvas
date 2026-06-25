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
- **Flow**: Public runtime API — resolves campaign by country/operator, calls partner blocklist/subscribe APIs, and serves rendered HTML.
- **Templates**: Reusable canvas layouts and system seeds.
- **Variable Engine**: Renders placeholders like `{{phone}}`, `{{country}}`, `{{operator}}` dynamically inside HTML.
- **Analytics**: Captures visits and visit events per campaign to calculate conversion rates.
- **Upload**: Image upload for canvas assets.

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
```

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
