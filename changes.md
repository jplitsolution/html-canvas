# Project Memory Changes Log

## Phase 1

### Added
- **Pages Module**: Manages project-level landing pages with page types (`LOADING`, `PLAN`, `THANKYOU`, `BLOCKED`, `ERROR`) linked to projects and reusable templates.
- **Blocklist Module**: Implements verification rules and lists of phone numbers that should be blocked from entering campaigns.
- **Subscriptions Module**: Tracks active, pending, and cancelled billing statuses of phone numbers.
- **API Config Module**: Allows configuring external endpoints for partner APIs (blocklist verify, subscribe charges).
- **Analytics Module**: Adds high-frequency tracking entities (`Visit`, `VisitEvent`) to generate real-time metrics and funnel conversion rates.
- **Routing Module**: Consolidates routing decision checks and processes dynamic page template variable replacements.
- **Publish Module**: Exposes public REST endpoints (`GET /p/:slug` and `POST /public/subscribe`) to handle traffic routing and subscription submissions.

### Modified
- **Project Entity**: Extended `projects` table to support unique, indexed URLs `slug` and associated `service_id` for subscriptions.
- **AppModule**: Wires all new modules and implements dynamic TypeORM dialect configuration supporting PostgreSQL and MySQL.

### Migrations
- `1719323719000-InitialMigration.ts`: Automatically handles adding `slug` and `service_id` to projects table, and creates all tables (`pages`, `blocklist_entries`, `subscriptions`, `api_configs`, `visits`, `visit_events`) with dialect-specific constraints.
