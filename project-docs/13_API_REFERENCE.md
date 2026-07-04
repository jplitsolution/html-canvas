# API Reference: System Endpoint Catalog

All successful backend responses are wrapped in a standard JSON envelope:
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... }
}
```

---

## 1. Authentication Endpoints

### 1.1 Admin Register
- **Endpoint**: `POST /auth/register`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "Password123!",
    "name": "Admin Name"
  }
  ```
- **Validation**: Email must be unique, password length >= 6.
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": {
      "id": 1,
      "email": "admin@example.com",
      "name": "Admin Name"
    }
  }
  ```

### 1.2 Admin Login
- **Endpoint**: `POST /auth/login`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "Password123!"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "user": { "id": 1, "email": "admin@example.com", "name": "Admin Name" },
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
    }
  }
  ```

### 1.3 Fetch Profile
- **Endpoint**: `GET /auth/me`
- **Auth**: Protected (`Bearer <token>`)
- **Success Response (200)**: Returns user profile details.

---

## 2. Campaign Management Endpoints (All Protected)

### 2.1 List Campaigns
- **Endpoint**: `GET /campaigns`
- **Success Response (200)**: Array of user campaign lists. Note: Heavy GrapesJS HTML and CSS fields are stripped to `[saved]` in listings to optimize bandwidth.

### 2.2 Create Campaign
- **Endpoint**: `POST /campaigns`
- **Request Body**:
  ```json
  {
    "name": "Zain Premium Funnel",
    "country": "Saudi Arabia",
    "operator": "Zain",
    "serviceId": "zain_premium_weekly",
    "copyFromCampaignId": 2
  }
  ```
- **Validation**: `country` and `operator` combination must be unique.
- **Success Response (201)**: Returns the newly provisioned campaign object with all six pages.

### 2.3 Save Page Canvas
- **Endpoint**: `PATCH /campaigns/:id/pages/:pageType`
- **Request Body**:
  ```json
  {
    "projectData": { "components": [...] },
    "html": "<div class=\"flow-page\">...</div>",
    "css": ".flow-page { background: #fff; }"
  }
  ```
- **Success Response (200)**: Returns the updated page structure.

### 2.4 Update API Integrations Configuration
- **Endpoint**: `PATCH /campaigns/:id/api-config`
- **Request Body**:
  ```json
  {
    "userApi": "https://partner-gateway.com/verify-user",
    "blocklistApi": "https://partner-gateway.com/check-blacklist",
    "subscriptionApi": "https://partner-gateway.com/check-subscription",
    "subscribeApi": "https://partner-gateway.com/subscribe",
    "headersJson": "{\"Authorization\": \"Bearer api_secret_key\"}",
    "otpProvider": "twilio",
    "otpConfigJson": "{\"accountSid\":\"AC...\",\"authToken\":\"...\",\"from\":\"+1234567890\"}"
  }
  ```
- **Success Response (200)**: Returns the saved integration configuration.

---

## 3. Public Flow Endpoints

### 3.1 Fetch Funnel Page
- **Endpoint**: `GET /flow/page`
- **Auth**: Public
- **Query Parameters**:
  - `country` (string, required)
  - `operator` (string, required)
  - `page` (string enum, required, e.g. `HOME`, `CONFIRM`)
  - `visitId` (number, optional) — Pass to retain session ID
  - `pack` (string, optional, e.g. `weekly`)
  - `msisdn` (string, optional)
- **Headers**: Accepts `X-MSISDN`, `X-MSISDN-Number` or `MSISDN` proxies.
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "campaignId": 1,
      "visitId": 104,
      "pageType": "HOME",
      "templateId": 12,
      "html": "Compiled HTML string with resolved variables",
      "css": "CSS stylesheet rules",
      "variables": { "phone": "", "operator": "Zain", "country": "Saudi Arabia", "service_id": "zain_premium_weekly" },
      "actions": ["SUBSCRIBE"]
    }
  }
  ```

### 3.2 Transition Funnel Action
- **Endpoint**: `POST /flow/transition`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "visitId": 104,
    "country": "Saudi Arabia",
    "operator": "Zain",
    "fromPage": "HOME",
    "action": "SUBSCRIBE",
    "phone": "966500000000",
    "planId": "weekly"
  }
  ```
- **Success Response (200)**: Returns page payload for next step in funnel (e.g. `CONFIRM` or `THANKYOU`).

---

## 4. Public OTP Endpoints

### 4.1 Request Verification Code
- **Endpoint**: `POST /otp/send`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "phone": "966500000000",
    "visitId": 104
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": {
      "sent": true,
      "expiresInSec": 300,
      "otp": "654321"
    }
  }
  ```
  *(Note: In production with real providers configured, the raw `otp` field is masked and omitted from the response for security).*

### 4.2 Verify Code
- **Endpoint**: `POST /otp/verify`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "phone": "966500000000",
    "otp": "654321",
    "visitId": 104
  }
  ```
- **Success Response (201)**: `{ "success": true, "statusCode": 201, "data": { "verified": true } }`
- **Validation Errors (400)**: Exception strings ("Invalid OTP code.", "OTP has expired.", "Too many verification attempts.") returned dynamically.

### 4.3 Test Provider Dispatch (Admin Only)
- **Endpoint**: `POST /otp/test-send`
- **Auth**: Public (Internally verified by test payload context)
- **Request Body**:
  ```json
  {
    "phone": "919876543210",
    "provider": "twilio",
    "config": "{\"accountSid\":\"AC...\",\"authToken\":\"...\",\"from\":\"+1234...\"}",
    "campaignId": 1
  }
  ```
- **Success Response (201)**: Returns the generated code and status.

### 4.4 Run Provider Connection Check (Admin Only)
- **Endpoint**: `POST /otp/health-check`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "provider": "twilio",
    "config": "{\"accountSid\":\"AC...\",\"authToken\":\"...\"}"
  }
  ```
- **Success Response (201)**: Returns `{ "ok": true, "message": "Settings format valid..." }`

---

## 5. Media Upload Endpoint

### 5.1 Upload Image
- **Endpoint**: `POST /uploads`
- **Auth**: Protected (`Bearer <token>`)
- **Content-Type**: `multipart/form-data`
- **Payload**: Form field `file` containing binary image.
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": {
      "url": "https://res.cloudinary.com/dfe5jkys2/image/upload/v1700/img.png",
      "publicId": "templatecraft/img",
      "format": "png",
      "bytes": 24560
    }
  }
  ```
