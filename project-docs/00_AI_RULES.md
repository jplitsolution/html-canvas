# AI Development Rules & Context Guidelines

Welcome to the **TemplateCraft (Dynamic Subscription Flow Builder)** codebase. This document outlines the absolute development rules and guidelines for any AI agent or developer modifying this repository.

---

## 1. Project Context & Critical Truths

Before writing any code or making design assumptions, you must respect the following ground truths:
- **Discrepancy Warning**: Pre-existing documentation (such as `architecture.md` and `changes.md` in the root) references a `Subscriptions` entity/module and a `Blocklist` entity/module. **These do not exist in the source code or migrations.** Do not write code trying to query them. Both subscription checks and blocklist checks are delegated dynamically via external partner APIs configured in the `api_configs` database table.
- **Transform Interceptor**: The backend uses a global `TransformInterceptor` that wraps all successful JSON responses in a `{ success: true, statusCode: number, data: T }` format. Do NOT manually wrap responses in controllers.
- **Frontend Shadow DOM Runtime**: The user-facing funnel runtime (`SubscriptionPage.jsx`) loads templates and executes inside a shadow root to isolate styles and scripts. Clicks and actions must be intercepted by traversing the shadow DOM and checking composition paths.

---

## 2. Coding Rules & Constraints

### Backend (NestJS + TypeORM)
- **Database Modesty**: Do NOT enable TypeORM `synchronize: true` in production configuration. All changes to entities must be accompanied by TypeORM migration files under `src/database/migrations/`.
- **Validation**: Every endpoint taking query parameters or request bodies must use a validation DTO decorated with `class-validator` and `class-transformer` decorators.
- **Auth Guarding**: Admin endpoints must be guarded with `@UseGuards(JwtAuthGuard)`. Ensure that user-scoped resources verify ownership (`userId` from the `@CurrentUser()`) before performing mutations or reads.

### Frontend (React 19 + GrapesJS + Zustand)
- **Do Not Break GrapesJS DnD**: The visual editor is configured with `nativeDnD: false`. Native drag-and-drop breaks drops inside iframes. Keep this disabled.
- **Style Isolation**: Ensure that template page CSS is kept isolated in the iframe/shadow root. Do not pollute the main dashboard styles.
- **State Mutability**: Zustand stores must be updated immutably. Always return new state references.
- **React StrictMode & Concurrent Requests**: Concurrent calls to APIs must be avoided or handled cleanly. The `apiClient` in `client.js` has a request deduplication logic using maps (`dedupeKey`). Do not disable it without a valid reason.

---

## 3. Communication and Review Flow

1. **Analysis First**: Before modifying any entity, query, or view, trace the tables and components from migrations and endpoints.
2. **Never Hallucinate APIs**: If you need to make callouts to partner APIs, verify the parameters in `partner-api.service.ts` first.
3. **Keep Logs Out of Production**: Ensure that any development debugging logs (e.g. dev console logs for React rendering) are kept within `import.meta.env.DEV` conditions or removed before check-in.
