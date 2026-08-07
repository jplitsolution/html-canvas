---
status: awaiting_human_verify
trigger: "fix the canvas where i can easily drag and drop and add priority channe and drag me koi issue na ho sab kuch somoothly work kare"
created: 2026-08-07T08:35:00.000Z
updated: 2026-08-07T08:55:00.000Z
symptoms_prefilled: true
goal: find_and_fix
---

## Current Focus

hypothesis: CONFIRMED — healEditorHotspot stripped HTML5 draggable so Grapes dragstart never fired (toolbar also hidden)
test: live editor CDP + unit tests
expecting: human can grab/move hotspots and blocks without stuck cursor
next_action: await human verification of grab + drag on canvas

## Symptoms

expected: On campaign page canvas, operators can smoothly drag/drop blocks and overlays; selecting a button/hotspot and adding Priority Chain (Try checks in order) is easy; no stuck cursor, frozen editor, or broken drop after drag

actual: User cannot grab elements at all ("pakad hi nahi paa raha"); drag does not start

errors: None pasted — behavioral UX/drag friction (Hinglish: "drag me koi issue na ho" / "pakad hi nahi paa raha")

reproduction: |
  1. Open campaign page in TemplateEditor / EditorShell (GrapesJS)
  2. Try to grab/drag hotspots or buttons on the image
  3. Observe: cannot grab; drag never starts

started: User rejected prior verify — grab/drag still broken; agent reproduced in browser

## Eliminated

- hypothesis: Only snap-back after drag:end (keepFlowButtonInFlow) was the sole grab blocker
  evidence: User still could not start a drag; CDP showed hotspots with htmlDraggable=null while images kept draggable=true
  timestamp: 2026-08-07T09:00:00.000Z

## Evidence

- timestamp: 2026-08-07T08:45:00.000Z
  checked: dragAndDrop.js, dragUnstick.js, overlayStacking healEditorHotspot, live campaign 8 HOME editor
  found: Grapes ComponentView.handleDragStart binds to HTML5 dragstart → tlb-move → core:component-drag in absolute mode; healEditorHotspot deleted draggable attr; .gjs-toolbar was display:none
  implication: Hotspots un-grabbable; no visible move handle fallback

- timestamp: 2026-08-07T09:05:00.000Z
  checked: CDP before/after — setAttribute('draggable','true') then dispatch dragstart
  found: Without attr, dragstart path does not move; with attr, hotspot moves and stays draggable after heal
  implication: Root cause confirmed by live mutation

- timestamp: 2026-08-07T09:10:00.000Z
  checked: canvasDragPriority.test.js after fix
  found: 6/6 pass including healEditorHotspot keeps draggable=true
  implication: Regression covered

## Resolution

root_cause: healEditorHotspot intentionally removed HTML5 draggable from hotspots (mistakenly thinking it fought absolute drag). Grapes initiates Canva absolute move via dragstart→tlb-move, so stripping the attribute made hotspots impossible to grab. Toolbar move handle was also CSS-hidden, removing the only fallback.
fix: |
  1. healEditorHotspot now sets draggable=true on model + DOM (does not strip)
  2. Show .gjs-toolbar (Move/Clone/Delete) as visible fallback
  3. Editor canvas CSS cursor:grab on hotspots; prior snap-back / Priority UX fixes kept
verification: |
  target_test: { result: pass, detail: "canvasDragPriority.test.js 6/6" }
  live_cdp: { result: pass, detail: "hotspots htmlDraggable=true after load; dragstart moves element" }
  guardrail_verdict: accepted
files_changed:
  - frontend/src/editor/utils/overlayStacking.js
  - frontend/src/editor/editor.css
  - frontend/src/editor/plugins/dragUnstick.js
  - frontend/src/editor/utils/textSizeAlign.js
  - frontend/src/editor/TemplateEditor.jsx
  - frontend/src/editor/plugins/canvasEnhancements.js
  - frontend/src/editor/shell/PriorityChainModal.jsx
  - frontend/src/editor/shell/PropertyPanel.jsx
  - frontend/tests/unit/canvasDragPriority.test.js
