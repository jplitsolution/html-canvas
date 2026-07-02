# TemplateCraft

Visual drag-and-drop website builder built with React, Tailwind CSS, Zustand, and DnD Kit.

## Installation

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run test` | Run Vitest unit tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run Playwright E2E tests |

## Environment Variables

No environment variables required. All data persists in localStorage:

| Key | Purpose |
|-----|---------|
| `templatecraft_projects` | Saved projects |
| `templatecraft_drafts` | Auto-save drafts (every 20s) |
| `templatecraft_theme` | Dark/light mode |
| `templatecraft_metrics` | Local usage analytics |
| `templatecraft_assets` | Uploaded images (base64) |

## Folder Structure

```
src/
├── app/           # App entry, routing, providers
├── pages/         # Route pages (Dashboard, Templates, Builder, Preview)
├── components/    # Shared UI (modals, toasts, error boundaries)
├── blocks/        # Block render components
├── builder/       # Builder UI (canvas, toolbox, properties)
├── registry/      # Plugin-based block registry
├── hooks/         # Custom React hooks
├── store/         # Zustand global state
├── utils/         # Helpers, export engine, collision detection
├── schemas/       # Zod validation schemas (v1)
├── theme/         # Design tokens
├── workers/       # Web Worker for HTML generation
├── assets/        # Asset management system
└── constants/     # Templates, defaults
tests/
├── unit/          # Vitest unit tests
└── e2e/           # Playwright E2E tests
```

## Features

- **Drag & Drop Builder** — DnD Kit powered canvas with toolbox
- **11 Block Types** — Navbar, Hero, Text, Form, Container, and more
- **Plugin Registry** — Add blocks without modifying core builder
- **Responsive Editing** — Per-device styles (desktop → tablet → mobile)
- **Multi-Select** — Shift+click, bulk move/delete/duplicate/wrap
- **Keyboard Shortcuts** — Press `?` for full list
- **Draft Recovery** — Auto-save drafts every 20 seconds
- **Export Engine** — HTML, JSON, React, ZIP, Template Package
- **Schema Validation** — Zod-powered data safety with v1 migration
- **Web Worker HTML** — Non-blocking HTML generation
- **Local Analytics** — Usage summary on dashboard

## Screenshots

_Add screenshots of Dashboard, Builder, and Preview pages here._

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+D` | Duplicate |
| `Delete` | Delete block |
| `Escape` | Deselect |
| `Arrow Up/Down` | Move block |
| `Shift+Click` | Multi-select |
| `?` | Shortcuts modal |

## Known Limitations

- No backend — all data stored in localStorage (browser storage limits apply)
- Collaboration architecture is prepared but not connected to a server
- ZIP export produces a JSON package (true ZIP compression not implemented)
- Image assets stored as base64 may increase localStorage usage
- Virtual scrolling activates only when canvas has 100+ root blocks

## Adding a New Block

```js
import { registerBlock } from './registry/index'

registerBlock({
  type: 'my-block',
  icon: MyIcon,
  category: 'Components',
  label: 'My Block',
  description: 'Custom block',
  component: lazy(() => import('./blocks/MyBlock')),
  defaultContent: { title: 'Hello' },
  defaultStyles: { /* ... */ },
  generateHTML: (block, styles) => `<div style="${styles}">${block.content.title}</div>`,
})
```

No changes to core builder required.
