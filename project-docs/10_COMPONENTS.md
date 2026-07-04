# UI & Canvas Editor Components

This document catalogs and describes the React components that form the TemplateCraft administration portal and visual canvas builder.

---

## 1. Dashboard Layout & UI Widgets (`src/components/ui/`)

These form the core styling, layout, and control layer of the admin dashboard.

| Component | Purpose | Details |
| :--- | :--- | :--- |
| **`AppShell.jsx`** | Main dashboard wrapper frame. | Implements the layout shell, dark/light theme classes, top nav header, user navigation tabs, and profile card. |
| **`Button.jsx`** | Customizable button widget. | Supports `primary`, `secondary`, `outline`, and `danger` variants, matching sizes (`sm`, `md`, `lg`) and click states. |
| **`Card.jsx`** | Card surface wrapper. | Styled with subtle borders, shadows, and base colors adapted for dark/light mode toggles. |
| **`Badge.jsx`** | Pill-shaped status indicator. | Displays statuses (e.g. Active, Inactive, Complete) with dynamic styling. |
| **`DeviceSwitcher.jsx`** | Viewport scale selector. | Swaps editor viewport emulations (Desktop, Tablet, Mobile) by calling `editor.setDevice()`. |
| **`UrlsEditor.jsx`** / **`LinksEditor.jsx`** | Redirection links form editor. | Admin form component to specify destination links and custom action handlers. |
| **Form Widgets** | `Input`, `Textarea`, `ColorField`, `SliderField` | Modular validation fields mapped to forms. |

---

## 2. Common Utility Overlays (`src/components/common/`)

Shared components handling runtime warnings, overlays, and system alerts.

- **`Modal.jsx`**: Floating modal container with keyboard close listeners (`Escape`) and click-outside dismissal checks.
- **`ImageUploadModal.jsx`**: Dedicated dialog supporting media drags, uploads to `UploadService` endpoints, and asset manager sync.
- **`Toast.jsx`**: Centralized notification banner displaying success/error alert popups (Zustand-controlled).
- **`ThemeToggle.jsx`**: Switcher updating the CSS variables between dark and light modes.
- **`GlobalErrorBoundary.jsx`**: Catches React render crashes, displays fallback screens, and dispatches logs.

---

## 3. Administrative Settings Dialogs (`src/components/dashboard/`)

Forms handling campaigns configurations.

- **`CreateCampaignModal.jsx`**:
  - Modal form requiring Name, Country, Operator, and Service ID parameters.
  - Includes a "Copy from campaign" dropdown selector that clones page designs from an existing campaign.
- **`CampaignApiConfigModal.jsx`**:
  - Multi-tab config form managing campaign integrations.
  - **API Configuration Tab**: Setup endpoints for Blocklist checks, Active subscription validations, and Subscription trigger requests.
  - **Headers Configuration Tab**: Editor to define authorization tokens, client IDs, and custom HTTP headers saved as a JSON object inside the `headers_json` column.

---

## 4. Visual Canvas Editor Shell (`src/editor/shell/`)

The workspace editor layout panel wrapper files.

- **`EditorShell.tsx`**: Splashes the editor toolbar, sidebar, and page canvas panel.
- **`EditorToolbar.tsx`**: Top-bar manager hosting:
  - Back navigations.
  - Viewport scale selectors (Desktop, Tablet, Mobile).
  - Canvas Zoom settings (50% to 150%).
  - Action triggers: Save, Preview (test funnel), Publish, and ZIP Export (Current page/All pages).
- **`EditorSidebar.tsx`**: Multi-panel sidebar containing:
  - **Blocks Section**: Custom drag-drop elements cards list.
  - **Layers Section**: GrapesJS DOM element tree outline.
  - **Styles Section**: Visual CSS attributes editor.
  - **Raw HTML Section**: Text editor showing compiled page code.
- **`DragDebugPanel.tsx`**:
  - A technical overlay panel monitoring active drag states.
  - Displays coordinates, drag items, target drop success tags, component counts, and canvas status flags. Helps developers inspect GrapesJS drag-and-drop actions.
