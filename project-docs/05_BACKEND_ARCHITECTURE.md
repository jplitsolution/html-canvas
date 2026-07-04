# Backend Architecture Specification

TemplateCraft's backend is a modular NestJS web service following clean coding standards, dependency injection patterns, and structured layers.

---

## 1. Request Lifecycle & Global Infrastructure

When an HTTP request enters the NestJS server, it passes through the following pipelines:

```
[ Incoming Request ]
         │
         ▼
  [ CORS Middleware ] ──► (Validates origin policies)
         │
         ▼
  [ Validation Pipe ] ──► (Validates DTO constraints & strips non-whitelisted params)
         │
         ▼
  [ Route Guard ] ────► (JwtAuthGuard parses Bearer token via passport strategy)
         │
         ▼
  [ Controller Handler ] ─► (Delegates execution to the designated Service)
         │
         ▼
  [ Transform Interceptor ] ─► (Wraps returned value inside { success: true, statusCode, data })
         │
         ▼
  [ Exception Filter ] ──► (In case of errors, logs and returns { success: false, statusCode, message })
```

---

## 2. Dynamic Database Adapter

In `app.module.ts`, database connections are established asynchronously based on `ConfigService` configurations. The connection handles:
- **Engine Selection**: Adapts dynamically between MySQL (`mysql`) and PostgreSQL (`postgres`).
- **Entity Loading**: Scans TypeORM models automatically via `autoLoadEntities: true`.
- **Automatic Migration**: Database migrations run on application startup (`migrationsRun: true`).

---

## 3. Core Architectural Modules

The system is structured as nine isolated NestJS modules, each encapsulating its controllers, services, database repositories, and schemas.

### 3.1 Auth & Users Modules (`AuthModule`, `UsersModule`)
- **Responsibility**: Admin onboarding and profile management.
- **Crypto Security**: Hashing of credentials using `bcrypt` (10 rounds).
- **Authentication**: JWT Strategy (`passport-jwt`) validates requests on admin endpoints. The token payload contains `{ email: user.email, sub: user.id }`.

### 3.2 Campaigns & Templates Modules (`CampaignsModule`, `TemplatesModule`)
- **Responsibility**: Visual canvas templates and campaigns.
- **Funnel Provisioning**: Creating a campaign automatically triggers `CampaignsService` to clone default funnel configurations (Home, Confirm, OTP, Thank You, Blocked, Error) as unique user templates.
- **Content Storage**: Layout JSON data and style definitions are stored inside the `Template` table `data` property.

### 3.3 Flow Module (`FlowModule`)
- **Responsibility**: Campaign resolution, traffic routing, and partner API requests.
- **Components**:
  - `FlowController`: Exposes public routing endpoints.
  - `FlowService`: Manages funnel state transitions.
  - `PartnerApiService`: Proxies external requests to vendor systems.
  - `VariableResolverService`: Performs string replacement of custom placeholders (e.g. `{{phone}}`, `{{operator}}`) within the visual HTML templates.

### 3.4 OTP Module (`OtpModule`)
- **Responsibility**: Validation codes storage and checks.
- **Salted Hash Validation**: Utilizes Node's core `crypto` module (`sha256`) to store hashed codes in the database, preventing unauthorized validation reads.

### 3.5 Upload Module (`UploadModule`)
- **Responsibility**: Handles assets/media uploads.
- **Storage Strategy**:
  - Checks if S3 bucket parameters are configured. If yes, uploads to S3.
  - If S3 is missing, checks Cloudinary configurations.
  - If both S3 and Cloudinary are missing, falls back to local storage (only in non-production environments).
- **File Validation**: REST controller validates MIME-types, blocking uploads of non-image files.
