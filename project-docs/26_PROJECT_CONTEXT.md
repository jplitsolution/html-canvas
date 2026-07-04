# Project Context & Environment Summary

This document summarizes the development environment, database connections, and key file locations for TemplateCraft.

---

## 1. Key Component File Locations

- **System Config Loader**: `backend/src/config/configuration.ts`
- **Default Funnel Templates**: `backend/src/database/seed/default-funnel-pages.ts`
- **Campaign Transition Logic**: `backend/src/modules/flow/flow.service.ts`
- **Partner Integration Proxy**: `backend/src/modules/flow/partner-api.service.ts`
- **Zustand State Store**: `frontend/src/store/useStore.js`
- **GrapesJS Editor Instance**: `frontend/src/editor/TemplateEditor.tsx`
- **Public Funnel Runtime**: `frontend/src/pages/SubscriptionPage.jsx`
- **Phone Header Detection**: `frontend/src/services/flow/resolvePhoneNumber.js`

---

## 2. Active Development Credentials

- **Environment Config File**: `backend/.env`
- **Active Database Connection**:
  - **Host**: `94.136.187.247`
  - **Port**: `3306` (MySQL)
  - **Database Schema**: `template_builder`
  - **User**: `track_admin`
- **Active Media Upload Cloud Provider**:
  - **Cloud Name**: `dfe5jkys2` (Cloudinary)
- **JWT Key**: `fwefdsfWEFWEF1312de`

---

## 3. Developer Commands Checklist

### 3.1 Backend Service Commands
- `npm run db:setup` — Builds database tables, applies migrations, and seeds test data.
- `npm run start:dev` — Launches the NestJS dev server with hot reload.
- `npm run test` — Executes Jest unit testing suites.
- `npm run test:e2e` — Runs API integration test suites.

### 3.2 Frontend Service Commands
- `npm run dev` — Boots the local Vite dev server.
- `npm run build` — Compiles and outputs production bundle assets into `dist/`.
- `npm run test` — Runs Vitest component unit tests.
- `npm run test:e2e` — Executes Playwright E2E browser tests.
