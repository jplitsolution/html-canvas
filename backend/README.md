# Dynamic Subscription Flow Builder Backend

This is the backend API for the Visual Builder and Dynamic Subscription Flow Engine, powered by **NestJS**, **TypeORM**, and supporting **PostgreSQL** or **MySQL**.

---

## 🛠️ Tech Stack & Key Modules
- **Core**: NestJS + TypeScript
- **Database**: PostgreSQL / MySQL + TypeORM Migrations
- **Authentication**: Passport.js + JWT
- **APIs**: REST API + Swagger Documentation
- **Testing**: Jest unit tests

---

## 🏗️ Architecture & Module Overview

- **Auth**: JWT Register / Login and profile authentication.
- **Users**: User account entities.
- **Projects**: Visual layouts management. Added indexable unique `slug` and billing `serviceId`.
- **Templates**: Reusable canvas layouts and system seeds.
- **Pages**: Handles multi-page visual routing (`LOADING`, `PLAN`, `THANKYOU`, `BLOCKED`, `ERROR`).
- **Blocklist**: Manages blocked telephone lists.
- **Subscriptions**: Tracks user subscriptions status.
- **API Config**: Holds custom integrations / headers JSON per project.
- **Routing**: Determines flows (Blocklist ➔ Subscription ➔ Plan/Subscribe flow).
- **Variable Engine**: Render placeholders like `{{phone}}`, `{{country}}`, `{{operator}}` dynamically inside HTML.
- **Publish**: Public endpoints for resolving slug-based campaigns and subscribing.
- **Analytics**: Captures Visits and VisitEvents to calculate conversion rates.

---

## ⚙️ Environment Variables

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

## 🚀 Installation & Running

```bash
# Install dependencies
$ npm install

# Start database container
$ docker-compose up -d

# Initialize database
$ npm run db:setup

# Run migrations (automatically executes on application startup as well)
$ npm run start:dev
```

---

## 🧪 Running Tests

```bash
# Run unit tests (including the new engine tests)
$ npm run test
```

---

## 🔄 Core Flows

### 1. Routing Flow
Checks blocklist and active subscriptions to serve the correct layout:
`Incoming Traffic` ➔ `Blocklist Verification` ➔ `Active Subscription Check` ➔ `Plan Confirmation`.

### 2. Publish Flow
`GET /api/p/:slug?msisdn=919876543210&country=IN&operator=airtel`
- Resolves appropriate page type (e.g. `PLAN`, `BLOCKED`, `THANKYOU`).
- Replaces HTML layout variables in real-time.
- Creates a visit log.

### 3. Subscribe Flow
`POST /api/public/subscribe`
- Logs user click action.
- Dispatches authorization or billing request to Partner APIs.
- Updates visit funnel status and records subscription.
