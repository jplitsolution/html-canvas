# Coding Guidelines & Code Quality Standards

This document establishes development style rules, formatting scripts, styling patterns, and Git commit guidelines.

---

## 1. Code Formatting & Linting

Code quality is enforced using ESLint and Prettier formatting tools on both backend and frontend.

### 1.1 Formatting Command Scripts
- **Backend Linting & Formatting**:
  - `npm run lint` — Runs ESLint to check for typescript errors.
  - `npm run format` — Code cleanup using Prettier (`prettier --write "src/**/*.ts"`).
- **Frontend Linting & Formatting**:
  - `npm run lint` — Runs ESLint for JS/JSX code checks.
  - `npm run format` — Code cleanup using Prettier (`prettier --write "src/**/*.{js,jsx}"`).

### 1.2 Git Pre-Commit Hooks (Husky & Commitlint)
- **Husky**: Triggers automatically on git actions (e.g. checks and formats code in staging before permitting commits).
- **Commitlint**: Restricts commits to Conventional Commits standards (`commitlint.config.js`). Use prefixes:
  - `feat: ...` for new features.
  - `fix: ...` for bug fixes.
  - `docs: ...` for documentation updates.
  - `refactor: ...` for code adjustments without behavior changes.

---

## 2. Frontend Styling System (Tailwind v4)

Tailwind CSS v4 is compiled via the `@tailwindcss/vite` plugin.
- **Predefined Design System Tokens (`src/theme/tokens.js`)**: Styling must respect the design colors system:
  - Base backgrounds (`bg-base`, `bg-subtle`, `bg-elevated`, `bg-canvas`).
  - Font families (`font-sans`, `font-display`).
  - Text shades (`fg`, `fg-muted`, `fg-subtle`).
  - Primary indicators (`primary`, `primary-fg`).
  - Danger alerts (`danger`, `danger-fg`).
- **CSS Utility Rules**:
  - **Dark Mode**: Add the `dark:` selector class matching dark mode layouts.
  - **Micro-Animations**: Hover actions must have smooth transitions (e.g., `transition-all duration-200`).
  - **Focus Visibility**: Ensure all interactive controls have focus indicators (e.g. `focus:ring-2 focus:ring-accent`).
  - **Reduced Motion**: Respect system accessibility variables. Visual translations must wrap within `@media (prefers-reduced-motion: reduce)` media queries to stop transitions for sensitive users.

---

## 3. NestJS Code Architecture Conventions

- **Modular Isolation**: Group logic into distinct NestJS modules. Each folder must only house its controller, service, schema definitions, and validation DTOs.
- **Validation DTOs**: Never accept raw request parameters in controllers. Create strict classes decorated with `class-validator` attributes.
- **Type Safety**: Avoid using `any` inside backend operations. Define TypeScript types, classes, or interfaces.
- **Database Migrations**: Do NOT use synchronize configurations in TypeORM schemas. Generate migration scripts for database changes.
