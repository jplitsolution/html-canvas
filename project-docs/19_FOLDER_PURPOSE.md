# Folder Purpose Specification

This document maps out the specific functional roles and responsibilities of each folder in the TemplateCraft codebase.

---

## 1. Backend Core Modules & Directories

### 1.1 `src/common/`
Utility classes and scripts globally imported by backend modules.
- **`decorators/`**: Defines custom decorators like `@CurrentUser()`, which extracts the parsed user object from the Request context.
- **`filters/`**: House global error interceptors (e.g. `HttpExceptionFilter` catches NestJS errors and formats standard JSON error envelopes).
- **`interceptors/`**: Handles successful response transformations (`TransformInterceptor` wraps endpoints outputs into standardized successful JSON envelopes).
- **`services/`**: Holds utility layers (e.g. `VariableResolverService` contains string manipulation logic to replace tags like `{{phone}}` with client context).

### 1.2 `src/database/`
System migrations, setups, and templates seeds.
- **`migrations/`**: Tracks incremental database modifications (Initial schema and OTP request table modifications).
- **`seed/`**:
  - Seeds the admin account and prebuilt layouts.
  - `default-funnel-pages.ts` contains the base template layout HTML and CSS code for HOME, CONFIRM, OTP, THANKYOU, BLOCKED, and ERROR slots.

### 1.3 `src/modules/`
Encapsulated functional logic features.
- **`analytics/`**: Telemetry tracking engines logging visitor footprints (`visits` and `visit_events` tables).
- **`api-config/`**: Data model mapping external partner API integration urls.
- **`auth/`**: Admin portal login/registration flows.
- **`campaigns/`**: Campaign layouts, CRUD actions, and settings updates.
- **`flow/`**: Public consumer traffic page compiler and transition handler.
- **`otp/`**: Validation codes database generator and validator.
- **`templates/`**: Visual designs database mapping.
- **`upload/`**: Local, AWS S3, and Cloudinary media upload integrations.

---

## 2. Frontend Core Modules & Directories

### 2.1 `src/components/`
Modular UI components used across the application.
- **`auth/`**: Router route guards (`RequireAuth.jsx` blocks unauthenticated users from opening dashboards).
- **`common/`**: Framework features like Modals, Toasts alerts, Theme toggles, and Error boundaries.
- **`dashboard/`**: Campaign creation forms and integration settings modals.
- **`ui/`**: Base layouts (`AppShell.jsx`), badges, cards, buttons, device emulators, and text sliders.

### 2.2 `src/editor/`
Visual builder workspace components.
- **`blocks/`**: Component definitions and icons lists displayed in GrapesJS's drag-and-drop side drawer.
- **`plugins/`**: Custom GrapesJS extensions:
  - `dragAndDrop.ts` replaces native HTML5 drag behaviors.
  - `assetDrag.ts` and `assetUpload.ts` handle canvas media drops.
  - `canvasEnhancements.ts` manages zoom adjustments.
  - `pagesManager.ts` syncs pages.
- **`services/`**: Modules handling GrapesJS save payloads (`saveTemplate`), HTML exports (`exportSite`), and template restores.
- **`shell/`**: Visual control bars (Toolbar, Sidebar, Properties panel, Raw HTML panel, and Drag status debug overlay).
- **`utils/`**: Helper scripts validating anchor links, background overlays, styles check validations, and text edits.

### 2.3 `src/services/`
- **`api/`**: Network request wrappers (Campaigns, Uploads, Auth, OTP, Flow).
- **`flow/`**: Mobile number detection layers (`resolvePhoneNumber.js` sequentially queries URL search parameters, browser session, parent windows, and operator API headers to resolve numbers).
