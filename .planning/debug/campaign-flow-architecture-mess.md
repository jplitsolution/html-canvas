---
status: awaiting_human_verify
trigger: "campaign-flow-architecture-mess — overlapping flow builder vs canvas button routing vs detect/funnel; want mental model + cleanup plan"
created: 2026-08-07T05:20:00.000Z
updated: 2026-08-07T06:15:00.000Z
symptoms_prefilled: true
goal: find_and_fix
---

## Current Focus

hypothesis: CONFIRMED — triple source of truth; Option A applied
test: Human should verify Campaign Detail mode picker + path + /flow redirect
expecting: Flow understandable on Campaign Detail; no primary Flow Builder UI
next_action: Await human-verify (Campaign Detail click-through + subscription smoke)

## Symptoms

expected: Campaign create → HE/token MSISDN → redirect OR own HOME; flow understandable from campaign/pages; canvas buttons define next (URL or page); campaign detail shows flow clearly; no separate drag-drop flow builder needed; clean comments
actual: Kichdi of detect vs funnel vs flow-engine vs flow-builder vs page config; hard to explain; flow builder feels duplicate of canvas routing; recent refactor improved disk layout but not concepts
errors: No runtime error — architecture/UX/clarity problem
reproduction: Map campaign→detect→routing→page→button transitions; find flow builder vs canvas; identify duplicate sources of truth
started: Complexity accumulated; recent refactor split files but concepts still overlap

## Eliminated

- hypothesis: Flow Builder is completely unused dead code
  evidence: SUBSCRIBE/CONFIRM/OTP CONTINUE still call flowEngineService.nextPage(flowConfig, …) via /transition; verificationMode is required for null-flow and HE/OTP routing
  timestamp: 2026-08-07T05:30:00.000Z

- hypothesis: Canvas buttons alone fully replace verificationMode
  evidence: resolveHomeSubscribeNext switches on mode (OTP_ONLY / HEADER_INJECTION / BOTH / NONE); canvas "Go to page" bypasses mode for that click but SUBSCRIBE path and detect/null-flow still need mode
  timestamp: 2026-08-07T05:30:00.000Z

- hypothesis: Recent file split caused the conceptual mess
  evidence: Overlap predates split — docs and PropertyPanel already described Flow Builder vs canvas; split only redistributed files
  timestamp: 2026-08-07T05:32:00.000Z

## Evidence

- timestamp: 2026-08-07T05:22:00.000Z
  checked: docs/FLOW-ARCHITECTURE.md
  found: Already documents Detect vs Boot/funnel; flowConfig + verificationMode as config; does not clearly separate canvas button Layer C
  implication: Docs incomplete on dual authoring surfaces

- timestamp: 2026-08-07T05:24:00.000Z
  checked: flow-engine.service.js nextPage + getDefaultFlowConfig
  found: Graph is nodes/edges with conditions (HEADER_RESOLVED, OTP_VERIFIED, …); defaults generated from mode
  implication: Custom drag-drop rarely needed; mode is the real knob

- timestamp: 2026-08-07T05:26:00.000Z
  checked: useShadowInteractions.js + PropertyPanel ClickActionEditor
  found: 5 click types — flow(SUBSCRIBE→/transition), page(href=PAGE), external(URL), anchor, chain(Priority). Page/external/chain bypass flow-engine
  implication: Canvas IS a full flow authoring surface for non-SUBSCRIBE CTAs

- timestamp: 2026-08-07T05:28:00.000Z
  checked: flow-transition-home.js + flow-routing.js
  found: SUBSCRIBE uses verificationMode + flowConfig.nextPage(condition); NONE uses CG redirect
  implication: Flow Builder still load-bearing for classic signup CTA

- timestamp: 2026-08-07T05:29:00.000Z
  checked: CampaignDetailPage.jsx
  found: Lists pages + link to Flow Builder; no at-a-glance diagram of button→next or mode→path
  implication: User complaint about campaign detail not showing flow is valid UX gap

- timestamp: 2026-08-07T05:33:00.000Z
  checked: Applied clarifying comments + docs §0.1 + PropertyPanel help text
  found: Safe clarity fixes landed; no Flow Builder deletion
  implication: Ready for human decision on cleanup phase

- timestamp: 2026-08-07T06:10:00.000Z
  checked: Checkpoint response — orchestrator chose Option A
  found: Hide Flow Builder UI; mode picker + read-only path on Campaign Detail; keep engine/DB
  implication: Safe UX cleanup without engine collapse

- timestamp: 2026-08-07T06:15:00.000Z
  checked: Option A implementation
  found: /flow redirects to detail; CampaignFlowSummary mode picker + path; FlowBuilderPage retained but unlinked; shared verificationModes.js
  implication: Primary authoring is Campaign Detail + canvas; Layer B engine untouched

## Resolution

root_cause: Triple overlapping "what happens next" systems — (A) detect/HE redirects, (B) Flow Builder verificationMode+flowConfig used only on SUBSCRIBE/CONFIRM/OTP transitions, (C) canvas per-button page/URL/chain that bypasses B. Mental model kichdi because admin UI presented B and C as peers and campaign detail did not show a single obvious flow. Drag-drop edge editor was mostly a visual of mode defaults — not a separate runtime product — but verificationMode + engine remain required for classic SUBSCRIBE path.

fix: Option A — moved verification mode picker + read-only path summary to Campaign Detail; removed Flow Builder from primary UI (routes redirect); kept flow-engine + flowConfig DB; shared DEFAULT_FLOWS/VERIFICATION_MODES in verificationModes.js; docs §0.1 updated to "Option A implemented". Did NOT delete FlowBuilderPage.jsx or collapse engine (Option B deferred).

verification: Code changes applied. Awaiting human verify: open Campaign Detail → see Subscription flow card → change mode → save → confirm path updates; old /flow URL redirects; subscription smoke still works.

files_changed:
  - frontend/src/components/flow/verificationModes.js (new)
  - frontend/src/components/flow/CampaignFlowSummary.jsx (new)
  - frontend/src/pages/CampaignDetailPage.jsx
  - frontend/src/app/App.jsx
  - frontend/src/pages/FlowBuilderPage.jsx
  - frontend/src/pages/MarketCampaignsPage.jsx
  - frontend/src/utils/routes.js
  - frontend/src/store/slices/campaignSlice.js
  - docs/FLOW-ARCHITECTURE.md
  - .planning/debug/campaign-flow-architecture-mess.md
