# Known Issues & Technical Debt

This document details known bugs, security gaps, documentation discrepancies, and bottlenecks in the current codebase.

---

## 1. Functional Implementation Gaps

### 1.1 OTP Funnel State Integration Gap
- **Issue**: The `OtpModule` provides code generation and validation endpoints, but the main campaign transition engine does not support the OTP step.
- **Backend Gap**:
  - `FlowService.transition()` contains handler logic for `fromPage === HOME` and `fromPage === CONFIRM`. It lacks transition logic for `fromPage === OTP` to verify the code and advance the user to the `CONFIRM` page.
- **Frontend Gap**:
  - The client runtime `SubscriptionPage.jsx` has event listeners to intercept click actions for `SUBSCRIBE` and `CONFIRM`. It lacks listeners to capture OTP request buttons (`data-otp-action="send"`, `data-otp-action="verify"`) or read phone/OTP inputs from the shadow DOM.
- **Impact**: End-users who do not have carrier MSISDN headers are routed to the OTP page but cannot progress.

---

## 2. Security Vulnerabilities & Risks

### 2.1 Plaintext OTP Leakage in API Response
- **Issue**: The `POST /otp/send` endpoint returns the generated OTP code directly in the response payload for testing convenience:
  ```typescript
  return {
    sent: true,
    expiresInSec,
    otp, // <--- Plaintext code returned to the client
  };
  ```
- **Impact**: Allows anyone to bypass SMS verification by reading the HTTP response payload.
- **Mitigation**: Remove the `otp` property from the return statement before deploying to production.

### 2.2 Lack of Rate Limiting (Throttling) on Public Endpoints
- **Issue**: Public endpoints (`/flow/*`, `/otp/*`) lack request rate limiting.
- **Impact**: Exposes the system to DDoS attacks, brute-force OTP attempts, and high SMS costs.
- **Mitigation**: Implement `@nestjs/throttler` guards on all public routes.

---

## 3. Architecture & Documentation Discrepancies

### 3.1 Obsolete Documentation (`architecture.md` & `changes.md`)
- **Issue**: The root documents `architecture.md` and `changes.md` describe database schemas and modules for `Subscriptions` and `Blocklist` that do not exist.
- **Reality**: In the code, these checks are delegated to external partner APIs (`api_configs` table).
- **Impact**: Can confuse onboarding developers.

---

## 4. Performance Bottlenecks

### 4.1 Synchronous Telemetry Database Writes
- **Issue**: Every page visit or click inserts a record into the `visits` and `visit_events` tables synchronously.
- **Impact**: Under high traffic, this will block TypeORM connection pools, slowing down the server.
- **Mitigation**: Offload telemetry writes to a message queue (e.g. RabbitMQ).
