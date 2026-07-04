# Security Architecture & Risk Profile

This document outlines the security controls, cryptography configurations, payload validation systems, and architectural risks in TemplateCraft.

---

## 1. Cryptography & Hashing Standards

- **Admin Password Encryption**: Hashed using BCrypt with a cost factor of 10 (`bcrypt.genSalt(10)`).
- **OTP Hashing (`OtpService`)**:
  - Securely isolates codes from database administrator reads or leaks.
  - **Salt Creation**: 16 random bytes converted to hex string:
    ```typescript
    const salt = crypto.randomBytes(16).toString('hex');
    ```
  - **Hashing Algorithm**: SHA-256 string interpolation:
    ```typescript
    crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');
    ```

---

## 2. Input Validation & Filtering

### 2.1 Request Body Validation (DTOs)
The NestJS server intercepts incoming API bodies using a global `ValidationPipe` with the following configuration options:
- **`whitelist: true`**: Automatically strips any properties not explicitly defined in the class DTO, preventing parameter pollution.
- **`transform: true`**: Casts payload properties to their designated TypeScript structures (e.g. converting numeric ID strings to actual integers).

### 2.2 File Upload Validation
The `UploadController` enforces validation checks on uploaded media:
- **Structure Check**: Rejects payloads where the file key `file` is missing.
- **MIME-Type Filter**: Rejects files whose mimetype does not start with `image/` (preventing uploads of shell scripts, HTML pages, or executables).

---

## 3. Data Scoping & Guard Controls

- **Admin Protection**: Admin REST endpoints utilize a `JwtAuthGuard` strategy parsing JWT tokens from standard headers (`Authorization: Bearer <token>`).
- **Owner Verification**: Database mutations verify owner identity. Operations on campaigns or templates check if `record.userId === loggedInUser.id`, throwing a `403 ForbiddenException` if a tenant tries to alter another user's files.
- **Public API Isolation**: Public endpoints (`/flow/*`, `/otp/*`) are completely unauthenticated to allow direct mobile traffic, but they do not expose configuration variables or admin details.

---

## 4. OTP Gate Protection

The platform protects the OTP verification gate from brute-force attempts and spam:
- **Maximum Attempt Threshold (Brute Force Guard)**: Locked to a maximum of 5 attempts. If attempts reach 5, the request status is set to `failed` and subsequent attempts are blocked.
- **Session Expiration**: Expiration is set to 5 minutes (`ttlMs = 5 * 60 * 1000`). If verified after 5 minutes, it is rejected.
- **One-Time Usage (Replay Protection)**: Once successfully verified, the status is set to `verified` and `verified_at` is set. Subsequent validation attempts are rejected.
- **Resend Delay Lock**: Imposes a mandatory 60-second cooldown between successive OTP generations for the same phone number to prevent gateway flooding.
- **Velocity Rate Limiting**: Restricts a single phone number to a maximum of 5 OTP dispatches per 10-minute window.
- **Session Transition Guard**: The `/flow/transition` engine checks the database to verify that the phone number has a verified status before allowing navigation to `CONFIRM`.

---

## 5. Security Risk Resolution

The major architectural risks identified previously have been resolved:
- **[RESOLVED] OTP Leakage**: The `POST /otp/send` controller now masks the plaintext verification code in the API response. The code is only returned if using mock local providers.
- **[RESOLVED] Public Endpoint Rate Limiting**: The OTP module now has a built-in 60-second resend delay and a 10-minute sliding rate limiter per destination MSISDN.
- **API Headers Storage**: External API custom headers should continue to be stored with restrictive table permissions.
