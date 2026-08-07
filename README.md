# TemplateCraft: Dynamic Subscription Funnel Builder

TemplateCraft is an enterprise-grade SaaS platform for building, deploying, and managing dynamic operator billing subscription funnels. It integrates with GrapesJS for visual campaign design customization and proxies partner billing gateways.

## Features

- **Visual Page Canvas**: Dynamic editing of funnels inside the browser using GrapesJS.
- **Interactive Hotspots & Custom Triggers**: Support for visual interactive hotspots mapped to system actions (e.g. `SUBSCRIBE` flow triggers) and client-side page routing intercepts.
- **Provider-Based OTP Engine**: Supports Twilio, MSG91, Kaleyra, Custom HTTP APIs, and Remote Telecom Partner verification.
- **Funnel Routing & Redirections**: Dynamic routing based on operator header parameters, subscriber status, and blocklist guards.
- **Real-Time Funnel Analytics**: Dynamic dashboards capturing traffic impressions, conversions, subscriber metrics, and a dedicated real-time OTP Analytics Dashboard.

## Documentation

Canonical references live in [`docs/`](./docs/README.md):

| Doc | Purpose |
|-----|---------|
| [`FLOW-ARCHITECTURE.md`](./docs/FLOW-ARCHITECTURE.md) | Detect, HE, attribution, redirects, postbacks |
| [`SAFARICOM_HE_SETUP_GUIDE.md`](./docs/SAFARICOM_HE_SETUP_GUIDE.md) | Safaricom HE admin checklist |
| [`WAP_MANAGER_DESIGN.md`](./docs/WAP_MANAGER_DESIGN.md) | Product / schema brief |

---

## Technical Stack

- **Frontend**: React 19, Vite, Zustand, Tailwind v4 CSS, GrapesJS.
- **Backend**: Express, TypeORM, PostgreSQL / MySQL, JWT.

---

## Setup & Execution

### 1. Database Setup

```bash
cd backend
npm run db:setup
```

### 2. Run Backend

```bash
cd backend
npm run start:dev
```

### 3. Run Frontend

```bash
cd frontend
npm run dev
```

Or from repo root: `./dev.sh`

### 4. Useful backend scripts

```bash
cd backend
npm run db:reset      # drop/recreate DB
npm run db:cleanup    # schema cleanup helper
npm run db:seed       # seed_clean.js
npm run test:api      # API smoke test
node scripts/e2e-detect-flow.mjs   # detect/checksub E2E
node scripts/reset-otp-local.mjs   # force local mock OTP
```
