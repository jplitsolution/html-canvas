# Tech Stack: Complete Architectural Specification

TemplateCraft uses a modern TypeScript/JavaScript stack split into a modular backend service and a responsive single-page web app.

---

## 1. Backend Architecture (NestJS)

The backend is built as a modular NestJS server designed for security, configurability, and database engine adaptability.

| Layer / Library | Technology / Package | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework Core** | `@nestjs/core`, `@nestjs/common` | `^11.0.1` | Main application lifecycle, dependency injection, and HTTP server framework. |
| **Database ORM** | `typeorm`, `@nestjs/typeorm` | `^1.0.0` / `^11.0.1` | Database connectivity, migrations, query building, and transaction management. |
| **DB Drivers** | `mysql2`, `pg` | `^3.22.5` / `^8.11.3` | Dual driver support for MySQL and PostgreSQL database backends. |
| **Auth & Security** | `passport`, `passport-jwt`, `@nestjs/jwt` | `^0.7.0` / `^11.0.2` | Core admin authentication, JSON Web Token issuance, and request guarding. |
| **Password Crypt** | `bcrypt` | `^6.0.0` | One-way hashing with salt parameters for admin password storage. |
| **Validation** | `class-validator`, `class-transformer` | `^0.15.1` / `^0.5.1` | Request DTO validation, data conversion, and incoming payload stripping. |
| **HTTP Client** | `axios` | `^1.6.2` | Calling external partner APIs (blocklist, subscription verify, subscribe requests). |
| **Storage API** | `@aws-sdk/client-s3`, `cloudinary` | `^3.1073.0` / `^2.10.0` | Cloud media storage with Amazon S3 and Cloudinary providers. |
| **API Docs** | `@nestjs/swagger` | `^11.4.4` | Self-generating interactive OpenAPI specification and Swagger UI wrapper. |

---

## 2. Frontend Application (React & GrapesJS)

The frontend is a fast client-side application compiled via Vite and styled with Tailwind CSS v4.

| Layer / Library | Technology / Package | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Core View Library**| `react`, `react-dom` | `^19.2.6` | Component-based rendering and view management. |
| **Visual Editor** | `grapesjs` | `^0.23.2` | Visual drag-and-drop landing page editor framework. |
| **State Manager** | `zustand` | `^5.0.14` | Decentralized, immutable client store for campaigns and UI. |
| **Client Routing** | `react-router-dom` | `^7.17.0` | Client-side page navigation, parameter matching, and routing shields. |
| **Styling Engine** | `tailwindcss`, `@tailwindcss/vite` | `^4.3.0` | Utility-first CSS generation integrated directly inside Vite compilation. |
| **Form Validation** | `zod` | `^3.25.28` | Compile-time and run-time schema validation for inputs. |
| **Icon Set** | `lucide-react` | `^0.511.0` | Clean vector UI icons. |
| **Test Runner** | `vitest`, `@testing-library/react` | `^3.2.3` / `^16.3.0` | Unit and integration testing on components. |
| **E2E Testing** | `@playwright/test` | `^1.52.0` | Browser-based end-to-end integration test suites. |

---

## 3. Infrastructure & Environments

- **Database Engine Compatibility**: Supports MySQL and PostgreSQL. Dynamic connection properties are resolved in `app.module.ts` from environment configurations.
- **Docker Compose**: Serves a local containerized environment for databases and development scripts.
- **Vite Bundler**: Compiles modules, runs Dev servers, and outputs optimized distribution files (`dist/`) during production build commands.
