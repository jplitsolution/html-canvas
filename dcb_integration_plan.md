# Implementation & Testing Plan: Universe DCB Gateway Integration

## 1. Overview & Objectives
Universe DCB Gateway Spring Boot microservice ke sath integration ko align karna hai using only 3 core APIs:
- **API 06 - Request PIN**: `POST /api/dcb/pincode`
- **API 07 - Confirm PIN**: `PUT /api/dcb/confirmation`
- **API 13 - Subscriptions Status**: `GET /api/dcb/subscriptions?msisdn=...&serviceId=581&current=true`

Architecture wise hamare system me already `UNIVERSE_DCB` verification mode and flow completely ready hai. Hum sirf provider client, normalizer aur config defaults ko align karenge, aur ek **dedicated manual testing demo tool** provide karenge jisse user directly live testing kar sake.

---

## 2. Gaps & Exact Changes Required

### A. Provider Client (`universe-dcb.provider.js`)
1. **Endpoint & Method (API 07)**:
   - Default endpoint: `/api/dcb/confirmation` (pehle `/api/dcb/confirm` tha).
   - Default HTTP method for confirm: `PUT` (pehle `POST` tha).
2. **Confirm Payload Fields**:
   - Provider expects `{ "id": "<providerRequestId>", "pinCode": "<pin>" }`.
   - Update `requestFields` default keys: `id` instead of `requestId`, and `pinCode`.
3. **Request ID Extraction (API 06)**:
   - Pincode response me `providerRequestId` top-level par aur `providerResponse.PinInfo.ID` nested par aata hai.
   - Add these paths to `REQUEST_ID_FALLBACK_PATHS` so `response.providerRequestId` is never missed.
4. **Success Boolean Case Sensitivity**:
   - Provider sends `"Success": true` / `"Success": false` (Capital S).
   - Check both `response.data?.success === false` and `response.data?.Success === false`.

### B. Normalizer (`universe-dcb-normalizer.js`)
1. **Spring Data Page Support (API 13)**:
   - Spring Boot API 13 returns `{ content: [ ... ], totalElements: ... }`.
   - Add `payload.content` and `payload.subscription` array detection.
2. **Status and Entitlement Extraction**:
   - Ensure `item.status`, `item.entitlementActive`, `item.serviceId` accurately map to `ACTIVE`, `PARKED_NO_BALANCE`, `PENDING_PIN`, etc.

### C. Frontend DCB Config Defaults (`dcbConfig.js`)
1. Update `DEFAULT_DCB_ENDPOINTS.confirm` to `/api/dcb/confirmation`.
2. Ensure default field names match: `requestIdField: 'id'`, `pinField: 'pinCode'`.

---

## 3. Manual Testing Demo Tool (Interactive)
Ek dedicated standalone testing script aur interactive test page:
1. **Interactive Node Script (`backend/scripts/test-dcb-gateway.js`)**:
   - CLI tool: `node scripts/test-dcb-gateway.js pincode <msisdn> [purchaseTypeId]`
   - CLI tool: `node scripts/test-dcb-gateway.js confirm <requestId> <pin>`
   - CLI tool: `node scripts/test-dcb-gateway.js status <msisdn>`
2. **Interactive Web Demo Page (`backend/public/dcb-test-demo.html` or direct test endpoint)**:
   - Browser UI with 3 clear buttons:
     - Step 1: Send PIN (API 6) -> Shows response JSON & extracts `providerRequestId`.
     - Step 2: Confirm PIN (API 7) -> Submits PIN with `id` -> Shows success / expired response JSON.
     - Step 3: Check Subscriptions (API 13) -> Shows current subscription status JSON (`PARKED_NO_BALANCE`, `ACTIVE`, etc.).

---

## 4. Verification & Validation Steps
1. Unit tests update & execution with `node --test`.
2. Provider mock test to verify `PUT`, endpoint url, payload and response parsing.
3. Live test using the manual test tool with user's credentials / test MSISDN.
