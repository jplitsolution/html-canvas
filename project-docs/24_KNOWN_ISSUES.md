# Known Issues & Technical Debt

This document details known bugs, security gaps, documentation discrepancies, and bottlenecks in the TemplateCraft codebase.

---

## 1. Resolved Issues

### 1.1 OTP Funnel State Integration
- **Status**: Resolved. `FlowService.transition()` has been updated to support `fromPage === OTP` and advance the user to the `CONFIRM` page. Frontend runtime (`SubscriptionPage.jsx`) handles all click actions, countdown timers, inputs validation, and page forwards.

### 1.2 Plaintext OTP Leakage in API Response
- **Status**: Resolved. Plaintext OTP has been removed from the `/otp/send` controller response, keeping validation secure.

### 1.3 Rate Limiting on Public Endpoints
- **Status**: Resolved. `PublicRateLimitGuard` has been configured to apply request limits on all public endpoints (`/flow/*` and `/otp/*`).

### 1.4 Obsolete Documentation in Root Directory
- **Status**: Resolved. Obsolete references to local `Subscriptions` and `Blocklist` tables in root `architecture.md` and `changes.md` have been cleaned up and replaced with dynamic partner configuration checks.

### 1.5 Background Image Missing in Preview
- **Status**: Resolved. The `style` attribute in the HTML snapshot was breaking due to unescaped double quotes when rendering background image URLs. Fixed in `exportSite.ts` and `PropertyPanel.tsx` by utilizing single quotes for URLs.

---

## 2. Performance Bottlenecks & Active Debt

### 2.1 Synchronous Telemetry Database Writes
- **Issue**: Every page visit or click inserts a record into the `visits` and `visit_events` tables synchronously.
- **Impact**: Under high traffic, this will block TypeORM connection pools, slowing down the server.
- **Mitigation**: Offload telemetry writes to a message queue (e.g. RabbitMQ or BullMQ).

