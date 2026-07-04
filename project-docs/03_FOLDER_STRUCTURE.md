# Folder Structure: Repository Layout Mapping

This document provides a comprehensive structural index of all directories and critical source files in the project.

---

## 1. Workspace Root Directories

```
Abhinav-vishwkarmaa/html-canvas/
├── architecture.md      # Outdated system design summary
├── changes.md           # Log of previous feature changes
├── README.md            # Startup documentation
├── backend/             # NestJS Server Application
├── frontend/            # Vite + React Client Dashboard & Runtime Shadow DOM
└── docs/                # Comprehensive platform guides
    └── otp/             # Production-Ready OTP Subsystem Documentation
```

---

## 2. Backend Module Layout

```
backend/
├── src/
│   ├── app.controller.ts
│   ├── app.module.ts            # Root module wiring up database and imports
│   ├── main.ts                  # Server entry point, interceptors, exception filter
│   ├── common/
│   │   ├── decorators/          # @CurrentUser decorator
│   │   ├── filters/             # HttpExceptionFilter wrapping error output
│   │   ├── interceptors/        # TransformInterceptor formatting success responses
│   │   └── services/            # VariableResolverService (interpolates HTML placeholders)
│   ├── config/
│   │   └── configuration.ts     # Maps environment variables to typed config interfaces
│   ├── database/
│   │   ├── migrations/          # Schema changes (including 1760000000002-AddOtpConfigAndColumns.ts)
│   │   └── seed/                # Default templates and database seed services
│   └── modules/
│       ├── analytics/           # High-frequency Visit & VisitEvent logs and controller
│       ├── api-config/          # ApiConfig TypeORM entity definition
│       ├── auth/                # Register, Login endpoints, JwtStrategy & guards
│       ├── campaigns/           # Campaigns list, pages, configs, templates updates
│       ├── flow/                # Public traffic router, page compiler, partner APIs proxy
│       ├── otp/                 # Verification request tables and validation endpoints
│       │   ├── providers/       # Twilio, MSG91, Kaleyra, Custom HTTP, and Partner provider adapters
│       │   ├── entities/        # OtpRequest TypeORM entity
│       │   ├── dto/             # OtpSendDto & OtpVerifyDto
│       │   ├── otp.controller.ts
│       │   ├── otp.service.ts
│       │   └── otp.module.ts
│       ├── templates/           # Reusable user templates and prebuilt designs
│       ├── upload/              # Cloudinary, S3, and local upload service layers
│       └── users/               # Core user entity, service lookup operations
├── test/                        # Jest E2E integration test suites
└── scripts/                     # Standalone helper scripts for database reset/setup
```

---

## 3. Frontend App Layout

```
frontend/
├── index.html                   # Dashboard shell and GrapesJS target
├── package.json                 # Dependency definitions
├── vite.config.js               # React & Tailwind v4 plugin compilation paths
├── src/
│   ├── app/                     # App.jsx route navigator, main.jsx entry
│   ├── assets/                  # Public assets, images, icons
│   ├── context/                 # AuthContext and ThemeContext definitions
│   ├── styles/                  # Tailwind configurations and variables
│   ├── theme/                   # Aesthetic color tokens, dark mode systems
│   ├── hooks/                   # Custom debounce/selector hooks
│   ├── utils/                   # Storage helpers, zip creators, button utilities
│   ├── components/              # Shared React Components
│   │   ├── auth/                # RequireAuth router route guards
│   │   ├── common/              # ErrorBoundary, Modal, Announcer, ThemeToggle, Toast
│   │   ├── dashboard/           # ApiConfigModal, CreateCampaignModal
│   │   └── ui/                  # Cards, Badges, Device switcher, input controls
│   ├── pages/                   # High-level views
│   │   ├── CampaignsPage.jsx    # User dashboard listing campaigns
│   │   ├── CampaignDetailPage.jsx # Lists pages of campaign and configuration links
│   │   ├── CampaignBuilder.jsx  # Wrapper page launching visual editor
│   │   ├── SubscriptionPage.jsx # Public runtime container with styling isolation
│   │   └── LoginPage.jsx        # Admin sign-in screen
│   ├── services/
│   │   ├── api/                 # Axios-fetch wrappers (client, auth, campaigns, flow)
│   │   └── flow/                # Phone number header and search resolver hooks
│   ├── store/                   # Zustand global state manager
│   │   ├── useStore.js          # Unified client store
│   │   ├── adapters/            # LocalStorage persistence layers
│   │   └── slices/              # campaignSlice and uiSlice
│   └── editor/                  # GrapesJS Custom Visual Builder
│       ├── gjs.css              # Custom styling for visual editing shell
│       ├── grapesConfig.ts      # Builder settings, devices, layers append-to
│       ├── TemplateEditor.tsx   # React binding instantiating and destroying grapesjs
│       ├── blocks/              # Drag-drop blocks definitions (components, registry)
│       ├── plugins/             # GrapesJS customizations (dragDnD, assetUpload)
│       ├── services/            # Load, save, export site zips, page snapshots
│       ├── shell/               # Custom panels (rawHtml, properties, sidebars)
│       └── utils/               # Selection locks, section ID validation hooks
└── tests/                       # Playwright browser integration E2E test files
```
