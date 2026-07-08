# Project Memory Changes Log

## Phase 1

### Added
- **Campaigns Module**: Manages campaigns mapped to country and operator (with unique compound index) along with associated campaign pages.
- **Templates Module**: Manages template layouts customized with visual GrapesJS editor.
- **API Config Module**: Allows configuring external endpoints for partner APIs (blocklist check, subscription status verify, and charging API).
- **Analytics Module**: Adds high-frequency tracking entities (`Visit`, `VisitEvent`) to generate real-time metrics and funnel conversion rates.
- **Flow Module**: Consolidates routing decision checks (MSISDN header checks, partner API proxy calls) and processes dynamic page template variable replacements.
- **Upload Module**: Handles asset uploads supporting local, S3, and Cloudinary backends.

### Migrations
- `1730000000000-InitialSchema.ts`: Creates the initial schema with tables (`users`, `templates`, `campaigns`, `campaign_pages`, `api_configs`, `visits`, `visit_events`) and dialect-specific constraints.

