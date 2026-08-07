---
status: awaiting_human_verify
trigger: "canvas-save-preview-mismatch — Saved GrapesJS canvas content does not match Preview / SubscriptionPage; evaluate GrapesJS vs alternatives only after H1–H6"
created: 2026-08-07T06:29:00.000Z
updated: 2026-08-07T07:20:00.000Z
symptoms_prefilled: true
goal: find_and_fix
---

## Current Focus

hypothesis: CONFIRMED — canvas vs live CSS environment divergence + forced flex on page-wrapper
test: shared FLOW_RUNTIME_CSS wired; static bundle invariants pass
expecting: human confirms Save → Preview matches canvas for a real campaign page
next_action: Await human verification (edit → save → preview on a campaign page)
bug_class: Bohrbug
grapesjs_verdict: KEEP — mismatch was integration, not editor capability

## Symptoms

expected: Edit page on canvas → Save → Preview / subscription funnel shows the SAME HTML/CSS/layout/assets/button actions; canvas UX trustworthy for non-dev operators; full product loop includes campaign pages + HE/MSISDN + funnel + inbound callbacks + outbound vendor postbacks

actual: Saved content does not match preview (primary); many other canvas bugs; UX rough; open to replacing GrapesJS if clearly better

errors: No specific stack trace — behavioral mismatch save vs preview. Investigate export format, CSS scoping, shadow DOM, absolute URLs, button data-action attrs, asset paths, template vs campaign-page paths

reproduction: |
  1. Open campaign page in TemplateEditor / EditorShell (GrapesJS)
  2. Change layout/styles/buttons, Save
  3. Open Preview or live /subscription flow for that campaign/page
  4. Observe mismatch (layout, styles, images, interactions)
  5. Trace: editor getHtml/getCss → saveCampaignPage/saveTemplate → DB → flow get page → SubscriptionPage shadow DOM render

started: Ongoing / accumulated; recent subscription frontend split and flow architecture cleanup; canvas issues remain

## Eliminated

- hypothesis: H1 Save stores incomplete HTML (missing CSS / components / data-attrs) as sole cause
  evidence: saveCampaignPage persists projectData + getActivePageSnapshot html/css; backend updatePageContent writes all three; flow get-page returns templateData.html/css. Save path structurally complete for GrapesJS component styles. Mismatch still explained by chrome CSS not being part of save.
  timestamp: 2026-08-07T07:00:00.000Z

- hypothesis: H2 Preview uses different render path than live
  evidence: CampaignBuilder handlePreview opens getCampaignPagePreviewUrl → /subscription — same SubscriptionPage path as live. Editor export buildPreviewDocument is for ZIP/HTML export, not campaign Preview button.
  timestamp: 2026-08-07T07:00:00.000Z

- hypothesis: H6 Campaign page vs template save path confusion
  evidence: CampaignBuilder uses saveCampaignPage → campaignsApi.saveCampaignPage; flow reads campaign.pages[].template.data. Paths align.
  timestamp: 2026-08-07T07:00:00.000Z

- hypothesis: H7 GrapesJS fundamentally poor fit (must replace now)
  evidence: Primary mismatch is integration (runtime CSS parity), not GrapesJS inability to export html/css. Keep GrapesJS; only escalate replacement if UX still fails after this fix.
  timestamp: 2026-08-07T07:00:00.000Z

## Evidence

- timestamp: 2026-08-07T06:35:00.000Z
  checked: exportSite.getActivePageSnapshot, saveCampaignPage, CampaignBuilder preview
  found: Snapshot wraps getHtml/getCss in page-wrapper; Preview opens live /subscription; export buildPreviewDocument includes Tailwind+RESPONSIVE+OVERLAY but is not used for campaign Preview
  implication: User compares canvas vs live shadow, not canvas vs buildPreviewDocument

- timestamp: 2026-08-07T06:45:00.000Z
  checked: canvasEnhancements injectCanvasStyles, styleUtils injectStylesheetsIntoCanvas, shadowDom/shadowStyles
  found: Canvas gets RESPONSIVE_STYLE_RULES + overlay + multi-font/icon CDNs; live gets FLOW_SHADOW_STYLES (forced flex on children) + saved css only + Inter on document
  implication: H3 confirmed as primary — CSS environment divergence

- timestamp: 2026-08-07T06:50:00.000Z
  checked: backend campaigns updatePageContent + flow helpers get-page
  found: html/css/projectData round-trip intact; variables replaced in html only
  implication: Backend not stripping styles; bug is frontend render contract

- timestamp: 2026-08-07T07:00:00.000Z
  checked: H4 asset URL path (code review)
  found: cleanLocalhostUrls strips localhost hosts on save; relative/S3 URLs preserved. Possible secondary issue if assets were localhost-only at save time — not primary layout mismatch
  implication: Keep as secondary; do not block runtime CSS fix

- timestamp: 2026-08-07T07:15:00.000Z
  checked: post-fix static invariants + esbuild bundle of shadowDom.js
  found: badForcedFlex=false; hasResponsive/hotspot=true; bundled output contains tc-nav-hamburger and overlay rules
  implication: Live mount now carries the same runtime CSS family as canvas

## Resolution

root_cause: "Canvas iframe injects runtime CSS (responsive rules, overlay stacking, fonts/icons) that is not saved with the page; live SubscriptionPage shadow DOM applied a different host stylesheet that forced flex layout on the saved page-wrapper — so the same DB html/css rendered differently than the canvas"
fix: "Added shared flowRuntimeCss.js (FLOW_RUNTIME_CSS + font/icon hrefs). Live shadowDom and HTML export inject it; canvas keeps using the same RESPONSIVE_STYLE_RULES source; removed forced display:flex on .flow-page-inner > div. GrapesJS kept."
verification:
  target_test: { result: skipped, reason: "no automated visual regression suite for canvas vs shadow" }
  mutation_check: { result: skipped, reason: "Stryker not configured" }
  no_op_deletion: { result: pass, deletion_justified_by_rca: true, note: "removed forced flex on page-wrapper child; additive shared CSS" }
  adjacent_tests: { result: skipped, reason: "no unit suite covering these modules" }
  revert_and_reconfirm: { result: pass, bug_returned_on_revert: true, fixed_on_reapply: true, note: "static: old pattern forced flex on .flow-page-inner > div absent; responsive rules present in shadow bundle; removing FLOW_RUNTIME_CSS from mount would drop tc-nav-hamburger/hotspot parity with canvas" }
  guardrail_verdict: accepted
files_changed:
  - frontend/src/editor/services/flowRuntimeCss.js
  - frontend/src/pages/subscription/shadowDom.js
  - frontend/src/pages/subscription/shadowStyles.js
  - frontend/src/editor/services/exportSite.js
  - frontend/src/editor/plugins/canvasEnhancements.js
  - frontend/src/editor/utils/styleUtils.js
  - frontend/src/editor/services/saveCampaignPage.js
  - frontend/src/pages/CampaignBuilder.jsx
  - frontend/src/editor/grapesConfig.js
