# OTP API Endpoint Reference

This document references all endpoints exposed by the OTP Module.

## Public Gateway Endpoints

### 1. Request OTP Code
`POST /otp/send`
- **Request Body**:
  ```json
  {
    "phone": "919876543210",
    "visitId": "1234"
  }
  ```
- **Response (Production)**:
  ```json
  {
    "sent": true,
    "expiresInSec": 300,
    "message": "OTP sent successfully."
  }
  ```
- **Response (Local Dev / Mock)**:
  ```json
  {
    "sent": true,
    "expiresInSec": 300,
    "otp": "123456"
  }
  ```

### 2. Verify OTP Code
`POST /otp/verify`
- **Request Body**:
  ```json
  {
    "phone": "919876543210",
    "otp": "123456",
    "visitId": "1234"
  }
  ```
- **Response**:
  ```json
  {
    "verified": true
  }
  ```

---

## Admin / Testing Endpoints

> [!WARNING]
> Both `test-send` and `health-check` endpoints are **disabled** in Production environments (`NODE_ENV=production`) and will respond with `403 Forbidden`.

### 3. Test Provider Dispatch
`POST /otp/test-send`
- **Request Body**:
  ```json
  {
    "phone": "919876543210",
    "provider": "twilio",
    "config": "{\"accountSid\":\"...\",\"authToken\":\"...\",\"from\":\"...\"}",
    "campaignId": 12
  }
  ```
- **Response (Development)**:
  ```json
  {
    "sent": true,
    "expiresInSec": 300,
    "otp": "482910"
  }
  ```
- **Response (Testing Mode without Expose)**:
  ```json
  {
    "sent": true,
    "expiresInSec": 300,
    "message": "OTP sent successfully."
  }
  ```

### 4. Run Provider Connection Check
`POST /otp/health-check`
- **Request Body**:
  ```json
  {
    "provider": "msg91",
    "config": "{\"authKey\":\"...\",\"templateId\":\"...\"}"
  }
  ```
- **Response**:
  ```json
  {
    "ok": true,
    "message": "Settings format valid and connection parameters checked"
  }
  ```
