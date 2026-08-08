---
status: resolved
trigger: "OTP Verify button looks correct on canvas but floats left / breaks in Preview"
created: 2026-08-08T07:25:00.000Z
updated: 2026-08-08T07:40:00.000Z
symptoms_prefilled: true
goal: find_and_fix
---

## Current Focus

hypothesis: CONFIRMED — stray position:absolute + px left/top on in-card Verify CTA (no data-tc-absolute) + FLOW_RUNTIME width:100%!important blowing customWidth
test: live shadow heal + unit tests; Preview remount
expecting: Verify & Continue stays inside OTP card in Preview
next_action: human verify Save → Preview on OTP page
bug_class: Bohrbug

## Symptoms

expected: Canvas OTP layout matches Preview /subscription — Verify button inside white card

actual: Canvas OK; Preview shows Verify & Continue floating left outside the card

reproduction: |
  1. Open campaign OTP page in editor (looks correct)
  2. Click Preview → /subscription?step=OTP
  3. Verify button absolute-positioned to the left of the card

## Resolution

root_cause: "Saved HTML had inline position:absolute;left:311px;top:509px on Verify without data-tc-absolute. Containing block is page-wrapper (full width), so button floats. Canvas CssComposer class still said position:relative so editor looked fine. Separately, RESPONSIVE_STYLE_RULES forced .flow-page-inner { width:100%!important } which overrode customWidth 1200px."
fix: "Tighten wasIntentionallyAbsolute to require data-tc-absolute/hotspot/over-image; healFlowButtons on save; healLiveFlowButtons on shadow mount; stop forcing width:!important on .flow-page-inner; customWidth inline uses !important."
files_changed:
  - frontend/src/editor/utils/textSizeAlign.js
  - frontend/src/pages/subscription/shadowDom.js
  - frontend/src/editor/services/saveCampaignPage.js
  - frontend/src/editor/services/flowRuntimeCss.js
  - frontend/tests/unit/canvasDragPriority.test.js
