# Frontend Architecture Specification

The frontend is a React 19 single-page application built on Vite and styled with Tailwind CSS v4. It contains two functional zones: the **Admin Campaign Dashboard** and the **Public Funnel Runtime**.

---

## 1. Component & Application Layout

```
[ Index.html Entry ]
         │
         ▼
[ App.jsx Router ] ────► (Global Context: Auth & Dark/Light Theme)
         │
         ├──► [ /login ] ─────────► (Admin Authentication Screen)
         ├──► [ /campaigns ] ──────► (RequireAuth: Admin Dashboard listing campaigns)
         ├──► [ /campaigns/:id ] ──► (RequireAuth: Campaign detail slot manager & API settings)
         ├──► [ /campaigns/:id/edit/:pageType ] ──► (RequireAuth: Visual Template Editor)
         └──► [ /subscription ] ──► (Public traffic consumer page)
```

---

## 2. Global State Management (Zustand)

Global state is centralized in a single Zustand store (`useStore.js`) composed of modular slices:

- **`campaignSlice.js`**:
  - Manages lists of campaigns and details.
  - Handles page content loading (`loadCampaignPage`) and async canvas saves (`saveCampaignPageContent`).
  - Coordinates template updates and applying campaign defaults.
- **`uiSlice.js`**:
  - Handles notifications / visual toasts (`addToast`).
  - Tracks screen reader announcements (`announce`) for accessibility.
  - Manages editor previews and device viewport configurations.
- **Adapters (`persistence.js` & `localStorageAdapter.js`)**:
  - Automatically serializes metrics and session events to the browser's `localStorage` for analysis.

---

## 3. GrapesJS Visual Editor Integration (`TemplateEditor.tsx`)

The visual page builder integrates GrapesJS into React using a target DOM mounting node:

- **Lifecycle Management**: The editor is instantiated inside a React `useEffect` callback hook and cleanly destroyed (`editor.destroy()`) on component unmount, preventing memory leaks and StrictMode duplication.
- **Custom Blocks Registry (`blocks/`)**: Custom sections, cards, forms, and headers are registered inside GrapesJS.
- **Style Isolation**: Host stylesheets and icon sets (FontAwesome, Tabler, Inter fonts) are dynamically injected directly into the editor's iframe canvas.
- **Custom Plugins**:
  - **`dragAndDrop.ts`**: Replaces the native HTML5 drag-and-drop mechanism (which is buggy inside iframes) with GrapesJS's custom mousedown ComponentSorter.
  - **`assetUpload.ts` & `assetDrag.ts`**: Intercept image drags and coordinate S3/Cloudinary file uploads.
  - **`canvasEnhancements.ts`**: Provides editor zoom adjustments and viewport emulations.
  - **`pagesManager.ts`**: Syncs pages inside the project manager.
  - **`textEditing.ts`**: Manages inline text formatting.

---

## 4. Public Funnel Runtime (`SubscriptionPage.jsx`)

The end-user subscription flow must render and execute user templates fast, securely, and without CSS pollution.

- **Shadow DOM Isolation**: The landing page HTML and CSS are loaded into a dynamically attached **Shadow Root** (`attachShadow({ mode: 'open' })`). This ensures that the outer React dashboard styles do not interfere with the custom campaign template designs.
- **Header Phone Detection**: Intercepts carrier proxy headers (`X-MSISDN`, `msisdn`) using `resolvePhoneNumber.js` to determine identity.
- **Funnel Transition Interception**: Click events inside the shadow root are intercepted by traversing the composition path (`composedPath()`). Actions like click buttons containing `data-action` or selection of packs (`data-pack`) are captured and routed to the backend `/flow/transition` endpoint.
