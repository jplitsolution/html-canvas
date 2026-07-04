# Dependency Specification & Rationales

This document details the software libraries and frameworks utilized in the codebase.

---

## 1. Backend Libraries (`backend/package.json`)

### 1.1 Core NestJS Infrastructure
- **`@nestjs/common` & `@nestjs/core` (`^11.0.1`)**: Framework architecture, dependency injection, and REST endpoints.
- **`@nestjs/config` (`^4.0.4`)**: Config module that handles dynamic environment configuration loading.
- **`@nestjs/platform-express` (`^11.0.1`)**: Standard Express-based HTTP server adapter layer.

### 1.2 Database & Persistence
- **`typeorm` (`^1.0.0`) & `@nestjs/typeorm` (`^11.0.1`)**: Entity mapper, migration script runner, and database connection pooling.
- **`mysql2` (`^3.22.5`)**: MySQL database connector driver.
- **`pg` (`^8.11.3`)**: PostgreSQL database connector driver.

### 1.3 Security & Middleware
- **`passport` (`^0.7.0`), `passport-jwt` (`^4.0.1`), `@nestjs/passport` (`^11.0.5`)**: Session strategy and administrative request gating.
- **`@nestjs/jwt` (`^11.0.2`)**: Signs, validates, and decodes JSON Web Tokens.
- **`bcrypt` (`^6.0.0`)**: Secure password encryption hashing.

### 1.4 API Documentations & Validations
- **`@nestjs/swagger` (`^11.4.4`)**: Generates interactive OpenAPI specifications.
- **`class-validator` (`^0.15.1`) & `class-transformer` (`^0.5.1`)**: Decorators validating DTO input types.

### 1.5 Third-Party Integrations
- **`axios` (`^1.6.2`)**: Executes outbound HTTP requests to external billing and blocklist systems.
- **`@aws-sdk/client-s3` (`^3.1073.0`)**: Amazon S3 storage provider.
- **`cloudinary` (`^2.10.0`)**: Cloudinary asset manager provider.

---

## 2. Frontend Libraries (`frontend/package.json`)

### 2.1 UI Rendering & Router
- **`react` & `react-dom` (`^19.2.6`)**: Component rendering engine.
- **`react-router-dom` (`^7.17.0`)**: Client-side single-page router.

### 2.2 Visual Editor
- **`grapesjs` (`^0.23.2`)**: WYSIWYG HTML/CSS canvas builder.

### 2.3 Global State & Validation
- **`zustand` (`^5.0.14`)**: Lightweight, decoupled state management.
- **`zod` (`^3.25.28`)**: Type-safe validation engine for form schemas.

### 2.4 Styling & UI Elements
- **`tailwindcss` & `@tailwindcss/vite` (`^4.3.0`)**: Utility-first styling framework.
- **`lucide-react` (`^0.511.0`)**: Vector icons library.

### 2.5 Utilities
- **`axios` (`^1.18.0`)**: API fetch client wrapper.
- **`jszip` (indirectly inside zip exports)**: Creates zip archives of pages in client exports.
