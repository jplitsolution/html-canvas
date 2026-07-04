# OTP Security Configurations

The OTP subsystem is designed using strict security principles to prevent abuse, spoofing, and brute-force attacks.

## Security Controls

1. **OTP Cryptographic Hashing**: Plaintext codes are never stored. Values are salted and hashed using SHA-256.
2. **Resend Delay**: Imposes a 60-second lock between OTP dispatches per phone number to prevent SMS spam.
3. **Request Rate Limiting**: Limit phone numbers to a maximum of 5 requests per 10-minute window.
4. **Attempt Expiry (Brute Force Guard)**: Session records are terminated and updated to `failed` status after 5 invalid verification attempts.
5. **Replay Protection**: The OTP token is invalidated immediately upon successful verification.
6. **Session-Locked Transitions**: The `/flow/transition` controller checks the database to verify that the phone number has a verified status before allowing navigation to `CONFIRM`.
7. **Production Masking**: Plaintext codes are stripped from public HTTP responses unless in local/mock environments.

## Enterprise-Grade Rate Limiting & Protection

The OTP subsystem is fortified at both the network (IP) and application (Phone number) layers.

### 1. IP-Based Rate Limiting (Network Layer)
A custom NestJS guard (`PublicRateLimitGuard`) protects all public endpoints. If a threshold is crossed, the server returns a `429 Too Many Requests` status along with a `Retry-After` header indicating the waiting duration (in seconds).

- **`POST /api/otp/send`**: Max 5 requests per minute per IP.
- **`POST /api/otp/verify`**: Max 10 requests per minute per IP.
- **`POST /api/flow/transition`**: Max 20 requests per minute per IP.

### 2. Application-Based Limits & Lockout (Phone Layer)
- **Resend Cooldown**: 60 seconds delay between OTP requests for a single phone number.
- **Request Rate Limit**: Max 5 OTP requests per 10-minute window per phone number.
- **Temporary Lockout**: If a phone number accumulates 5 failed verification attempts, the number is locked out for **15 minutes**. During this window, any further send or verify requests will return `429 Too Many Requests`.

---

## Metric & Dashboard Tracking

To monitor security attacks, the subsystem records security-related occurrences in the `visit_events` table under the following identifiers:

- **`RATE_LIMIT_HIT`**: Triggered whenever an IP is throttled.
- **`BLOCKED_REQUEST`**: Triggered when a request is blocked due to active lockouts or rate-limit violations.
- **`BRUTE_FORCE_ATTEMPT`**: Triggered on every wrong verification code entry.

These metrics are queried dynamically in the campaign analytics service to display stats for **Blocked Requests**, **Rate Limit Hits**, and **Brute Force Attempts**.

---

## Recovery & Administrative Unlock

If a legitimate user is locked out:
1. **Self-Recovery**: The lockout expires automatically after **15 minutes**.
2. **Administrative Override**: A database administrator can manually clear a phone number's lockout by updating the relevant row in the `otp_requests` table:
   ```sql
   UPDATE otp_requests SET status = 'failed_archived' WHERE phone = '919876543210' AND status = 'failed';
   ```

---

## Testing Security Limits

- **Verify IP Throttling**: Use `curl` or Postman to spam `/api/otp/send` 6 times in quick succession. The 6th request will yield `429 Too Many Requests` with a `Retry-After: 58` header.
- **Verify Lockout**: Input an incorrect OTP 5 times. The 5th request returns a 429 lockout status. Subsequent attempts to request a new OTP will yield a 429 lockout error with a countdown of the remaining minutes.

## Environment-Aware Security Controls

| Control / Behavior | Development Mode (`NODE_ENV=development`) | Testing Mode (`NODE_ENV=test` / `testing`) | Production Mode (`NODE_ENV=production`) |
| :--- | :--- | :--- | :--- |
| **OTP Response Exposing** | Exposed in API response for local/mock providers. | Exposed **only** if explicitly enabled via `OTP_EXPOSE_TEST=true`. | **Never exposed**. Payload is sanitized to `{ "success": true, "message": "OTP sent successfully." }`. |
| **Server Logs** | Plaintext OTP is logged for local/mock providers. | Plaintext OTP is logged for debugging. | **Never logged**. All logs are masked (e.g. `[REDACTED IN PRODUCTION]`). |
| **Testing Routes** | Active. | Active. | **Disabled**. Endpoints `/otp/test-send` and `/otp/health-check` throw `403 Forbidden`. |
| **Error Messages** | Detailed database and system error traces returned. | Detailed error traces returned. | **Sanitized**. Unexpected internal server errors return generic message: `"An unexpected error occurred. Please try again later."` |

### Log Masking Policies
In Production mode, all provider gateways (e.g., custom HTTP gateways or operator partner integrations) sanitize log messages. Any variables containing client OTP codes are replaced with `[REDACTED]`.

### Error Sanitization
To prevent SQL injection probing or information leakage regarding schema layouts, the global `HttpExceptionFilter` catches all raw backend errors in Production and returns a generic HTTP 500 payload, while securely logging the full stack trace on the server for administrators.
