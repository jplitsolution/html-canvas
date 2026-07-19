# TemplateCraft: Dynamic Subscription Funnel Builder

TemplateCraft is an enterprise-grade SaaS platform for building, deploying, and managing dynamic operator billing subscription funnels. It integrates with GrapesJS for visual campaign design customization and proxies partner billing gateways.

## Features

- **Visual Page Canvas**: Dynamic editing of funnels inside the browser using GrapesJS.
- **Interactive Hotspots & Custom Triggers**: Support for visual interactive hotspots mapped to system actions (e.g. `SUBSCRIBE` flow triggers) and client-side page routing intercepts.
- **Provider-Based OTP Engine**: Supports Twilio, MSG91, Kaleyra, Custom HTTP APIs, and Remote Telecom Partner verification.
- **Funnel Routing & Redirections**: Dynamic routing based on operator header parameters, subscriber status, and blocklist guards.
- **Real-Time Funnel Analytics**: Dynamic dashboards capturing traffic impressions, conversions, subscriber metrics, and a dedicated real-time OTP Analytics Dashboard.

---

## Technical Stack

- **Frontend**: React 19, Vite, Zustand, Tailwind v4 CSS, GrapesJS.
- **Backend**: NestJS, TypeORM, MySQL / PostgreSQL, JWT.

---

## OTP Subsystem Documentation

The upgraded OTP engine is fully documented in [docs/otp/](file:///d:/dddd/docs/otp/):
1. [01_ARCHITECTURE.md](file:///d:/dddd/docs/otp/01_ARCHITECTURE.md) - Conceptual Design
2. [02_PROVIDER_SYSTEM.md](file:///d:/dddd/docs/otp/02_PROVIDER_SYSTEM.md) - Stateless Adapters
3. [03_DATABASE.md](file:///d:/dddd/docs/otp/03_DATABASE.md) - Schema Specifications
4. [04_RUNTIME_ENGINE.md](file:///d:/dddd/docs/otp/04_RUNTIME_ENGINE.md) - Execution Flows
5. [05_FRONTEND_BINDING.md](file:///d:/dddd/docs/otp/05_FRONTEND_BINDING.md) - GrapesJS Bindings
6. [06_SECURITY.md](file:///d:/dddd/docs/otp/06_SECURITY.md) - Security Protections
7. [07_API_REFERENCE.md](file:///d:/dddd/docs/otp/07_API_REFERENCE.md) - Endpoint Index
8. [08_PROVIDER_GUIDE.md](file:///d:/dddd/docs/otp/08_PROVIDER_GUIDE.md) - Configurations Guide
9. [09_SEQUENCE_DIAGRAM.md](file:///d:/dddd/docs/otp/09_SEQUENCE_DIAGRAM.md) - Transaction Sequences
10. [10_FUTURE_IMPROVEMENTS.md](file:///d:/dddd/docs/otp/10_FUTURE_IMPROVEMENTS.md) - Scaling Recommendations
11. [11_ANALYTICS.md](file:///d:/dddd/docs/otp/11_ANALYTICS.md) - Telemetry & Dashboard
12. [12_FAILOVER.md](file:///d:/dddd/docs/otp/12_FAILOVER.md) - Automatic Failover Strategy

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

### 4. Running Tests
- **Backend Unit & Spec**: `npm run test` (inside `backend`)
- **Backend Integration (E2E)**: `npm run test:e2e` (inside `backend`)
- **Frontend Unit**: `npm run test` (inside `frontend`)
