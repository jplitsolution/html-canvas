# Authentication & Authorization Model

TemplateCraft implements a dual access scope model. Admin operations are secure and require token-based credentials, whereas subscriber traffic endpoints are public and read-only.

---

## 1. Access Scopes

| Target Audience | Endpoint Prefix | Auth Strategy | Security Policy |
| :--- | :--- | :--- | :--- |
| **Administrators** | `/auth/*`, `/campaigns/*`, `/templates/*`, `/uploads/*` | JSON Web Token (JWT) | Bearer Token validation. Verifies resource ownership scoped to user ID. |
| **Public Consumers**| `/flow/*`, `/otp/*` | Unauthenticated | Completely open endpoints. Only permits read-only flow operations and logs visit impressions. |

---

## 2. JWT Administration Flow

```
[ Admin User ]                 [ Auth Controller ]               [ User Repository ]
      │                                │                                  │
      │ 1. POST /auth/login (email/pwd) │                                  │
      ├───────────────────────────────►│                                  │
      │                                │ 2. Query user by email            │
      │                                ├─────────────────────────────────►│
      │                                │◄─────────────────────────────────┤
      │                                │ 3. Compare hashes (Bcrypt)       │
      │                                │ 4. Sign JWT Payload              │
      │ 5. Return Token & User profile │                                  │
      │◄───────────────────────────────┤                                  │
      │                                │                                  │
      │ 6. Save token to localStorage  │                                  │
      │                                │                                  │
      │ 7. GET /campaigns (Bearer JWT)  │                                  │
      ├───────────────────────────────►│ (Validated via JwtAuthGuard)     │
```

---

## 3. Security Specifications & Cryptography

### 3.1 BCrypt Password Storage
Passwords stored inside the `users` table are hashed during registration using:
- **Salt Generation**: 10 rounds (`bcrypt.genSalt(10)`).
- **Hashing**: `bcrypt.hash(registerDto.password, salt)`.

### 3.2 JWT Payload Structure
JWT tokens are signed by `@nestjs/jwt` and contain the following payload tokens:
- **`sub`**: User database ID (`user.id`).
- **`email`**: User registration email (`user.email`).
- **Expiration**: Standard lifetime is 24 hours (`24h`), customizable via `JWT_EXPIRATION`.

### 3.3 Route Guarding & User Context
Admin endpoints are decorated with `@UseGuards(JwtAuthGuard)`. When active:
1. The token is parsed from the request header: `Authorization: Bearer <token>`.
2. Passport decrypts and validates the token.
3. The custom decorator `@CurrentUser()` fetches the logged-in `User` entity, allowing campaigns/templates operations to check ownership:
   ```typescript
   if (campaign.userId !== userId) {
     throw new ForbiddenException('You do not have permission to access this campaign');
   }
   ```
4. Fetching template details (`GET /templates/:id`) supports **optional authentication** by manually decoding the header to verify creator ownership if the template is not prebuilt.
