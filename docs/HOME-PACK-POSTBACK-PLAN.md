# Implementation plan: HOME packs + postback-on-subscribe

**Status:** Complete (Phases 1–4)  
**Last updated:** 13 Aug 2026  
**Related:** [`FLOW-ARCHITECTURE.md`](./FLOW-ARCHITECTURE.md)

This is the executable plan for the client funnel:

1. Identity + partner checks happen **before HOME**. What runs, and what happens on miss, depends on `verificationMode` (see §1).
2. HOME is a **free canvas** — intro, one CTA, pack buttons, or a jump to CONFIRM are all valid. Pack/subscribe buttons work on whatever page the author puts them.
3. Postback **pending** on a conversion subscribe click (any pack CTA). Postback **fire** stays on operator `/api/flow/callback`.

---

## 0. Locked decisions

| # | Decision | Why |
|---|----------|-----|
| D1 | Partner checks (checksub + blocklist) run **after we have an MSISDN** and **before HOME**. Splash still waits on detect when HE is in the mode. | Client: no HOME until identity + checks. |
| D2 | No-MSISDN behaviour is **mode-specific** — not “always OTP”. HE-only → ERROR + configured fail redirect (never OTP). OTP-only → OTP first, then checks. BOTH → HE hit → checks; HE miss → OTP then checks. After OTP verify (when OTP is in the path) → **HOME** as the first content page, not auto-CONFIRM. | Client clarification 13 Aug. |
| D3 | HOME is a **free canvas**, not a dedicated confirm screen. Author may put intro-only, a continue CTA, pack subscribe buttons, a link to CONFIRM, or a mix. Pack/subscribe CTAs work on **any** page (HOME, CONFIRM, or other). Where a pack button exists, that click is subscribe (not “select then Confirm”). | Client: HOME pe kuch bhi ho sakta hai. |
| D4 | Pack identity = `data-pack=daily\|weekly\|monthly`. Subscribe URL = campaign `subscribeApi` with `{{planId}}` / `{{pack}}` / `{{subServiceId}}`, plus optional per-button `data-subscribe-url` override. | “Same URL, chhota sa change.” |
| D5 | Postback **register** = first conversion subscribe click (any pack CTA). Unique **event**, not unique **button**. Daily/Weekly/Monthly all register. MSISDN unique row already upserts. | Unique-checkbox-on-one-button would drop Weekly/Monthly conversions. |
| D6 | Postback **fire** is unchanged: operator hits `/api/flow/callback`. Editor never chooses fire timing. | Operator billing is the source of truth. |
| D7 | Default: do **not** register pending on HE-detect `new`, and do **not** register on OTP verify, for `packs_on_home` campaigns. | Otherwise pending is created before the user picked a pack. |
| D8 | CONFIRM page type stays. Classic campaigns keep working. New layout is opt-in per campaign. | No silent break of live funnels. |
| D9 | Conversion-CTA checkbox on a button is **optional override** (default ON for pack-subscribe actions). It is **not** a campaign-wide mutex. Soft warning if a non-pack button is also marked conversion. | Prevents Terms/Back from queuing CPA. |
| D10 | `verificationMode` stays the switch for identity: `HEADER_INJECTION` / `OTP_ONLY` / `BOTH`. `packs_on_home` changes **when identity runs relative to HOME**, not a requirement that packs live on HOME. | Reuse existing campaign setting. |

### Rejected

- One postback checkbox in the whole campaign (mutex across buttons).
- Tying postback to a page type (CONFIRM / THANKYOU).
- Three “Open a website” hrefs as the pack model (no `planId` / postback plumbing).
- “No MSISDN → always OTP” — that is only true for `OTP_ONLY` and `BOTH`. HE-only goes to ERROR + fail redirect.
- “HOME is always the confirm screen.” HOME can be anything; CONFIRM stays optional; pack buttons are opt-in on any page.

---

## 1. Identity matrix (`packs_on_home` + `verificationMode`)

This is the landing rule. The first **content** page after identity is HOME. What HOME contains is up to the author.

Once MSISDN exists, **checksub + blocklist** always run before HOME:

- blocked → `BLOCKED`
- already active → `THANKYOU` or campaign success URL
- parking / pending → `LOW_BALANCE` / `INPROGRESS`
- new → HOME (free canvas)

### HE only (`HEADER_INJECTION`)

```
splash → HE detect
  ├─ MSISDN yes → checksub + blocklist → HOME or status/success URL
  └─ MSISDN no  → ERROR page
                  + redirect to configured fail URL
                    (heConfig.failRedirectUrl, else campaign.cgRedirectUrl)
                  NEVER OTP, NEVER HOME
```

Same fail-URL order as today’s API HE. If no fail URL is set, paint the campaign `ERROR` page and stay.

### OTP only (`OTP_ONLY`)

```
no HE
  → OTP page (first paint)
  → user verifies
  → checksub + blocklist
  → HOME or status/success URL
```

Detect still creates the visit, but does **not** run checksub/blocklist without a phone. Those APIs run on OTP continue, before HOME.

### HE + OTP (`BOTH`)

```
splash → HE detect
  ├─ MSISDN yes → checksub + blocklist → HOME or status/success URL
  └─ MSISDN no  → OTP page
                  → user verifies
                  → checksub + blocklist
                  → HOME or status/success URL
```

### After HOME (author-defined)

HOME is not a fixed confirm step. Typical options, all valid:

```
A. Pack buttons on HOME
   click Daily/Weekly/Monthly
     → registerPending → subscribe API → status / outbound

B. Intro / offer only
   CTA → another campaign page (CONFIRM, or any page) → packs there

C. Mix
   some buttons subscribe, some go to a page, some are Terms/Back
```

Postback pending fires only on conversion subscribe clicks (D5 / D9), wherever those buttons sit.

Classic layout (unchanged): `HOME → OTP|CONFIRM → CONFIRM subscribe`, with the existing mode graph.

---

## 2. Compatibility

New campaign column:

```text
campaigns.funnel_layout  varchar  NOT NULL DEFAULT 'classic'
  classic       | existing graph: HOME CTA → OTP/CONFIRM; OTP → CONFIRM
  packs_on_home | mode matrix in §1; OTP (when used) → HOME; pack CTA (any page) → subscribe
```

- Existing rows default `classic`.
- New campaigns created from the packs HOME starter template set `packs_on_home`.
- Editor can toggle on Campaign Detail (with a one-line explanation).
- CONFIRM page remains editable either way.

---

## 3. Phases

Do **not** start Phase 2 until the tracer in Phase 1 is green.

### Phase 1 — Tracer (end-to-end, one pack)

**Goal:** One `packs_on_home` campaign covering the three modes: HE-only miss → ERROR/fail URL; OTP-only → OTP then checks then HOME; BOTH miss → OTP then checks then HOME. Daily button subscribes + queues postback. Callback still fires.

**Backend**

1. Migration: `funnel_layout` on `campaigns` (`classic` | `packs_on_home`). Entity + DTO + campaigns service/controller.
2. `flow-engine.service.js` default graph when `packs_on_home`:
   - OTP `OTP_VERIFIED` → `HOME` (not CONFIRM).
   - HOME pack subscribe uses CONFIRM’s subscribe outcomes (THANKYOU / INPROGRESS / …).
3. `detect.js` for `packs_on_home` + no phone:
   - `HEADER_INJECTION` → `nextPage=ERROR` + existing fail redirect (`failRedirectUrl` else `cgRedirectUrl`). Never OTP.
   - `BOTH` → `nextPage=OTP`.
   - `OTP_ONLY` → `nextPage=OTP`; skip checksub/blocklist on detect (no MSISDN yet).
   Phone + new → stay / HOME (no HE pending postback — D7). Phone + blocked/active/parking as today.
4. `get-page.js` / `useFlowPages.js`: boot uses detect `nextPage` (OTP, HOME, ERROR, or outbound). Do not flash HOME before OTP/ERROR.
5. Reuse `createHandleConfirm` from HOME when action is pack-subscribe (`data-pack` + `CONFIRM` or `SUBSCRIBE_ROUTE` with a pack). Require `planId`.
6. `transition-otp.js`: `packs_on_home` → run checksub + blocklist **before** HOME. Next page = HOME (or status). Skip `registerPending` on OTP unless campaign still has `postbackRegisterAt=otp|both` **and** layout is `classic`. HE-only campaigns must never land on this handler.
7. `shouldRegisterPostbackAt`: for `packs_on_home`, treat subscribe/confirm click as the register trigger; ignore detect HE-new.

**Frontend**

8. `useShadowInteractions.js`: allow `data-pack` on HOME (today gated to CONFIRM only). Pack button with subscribe action → send `planId` and hit subscribe (not “select only”).
9. PropertyPanel: pack select (`daily|weekly|monthly`) on a subscribe button. Tracer can skip URL override.
10. Campaign Detail: `funnel_layout` toggle.

**Tests (must pass before Phase 2)**

- `packs_on_home` + `HEADER_INJECTION` + no MSISDN → `ERROR` + fail URL; never OTP.
- `packs_on_home` + `OTP_ONLY` + no MSISDN → `OTP`; after verify → checksub/blocklist then HOME; no pending yet.
- `packs_on_home` + `BOTH` + HE hit + new → HOME, skip OTP.
- `packs_on_home` + `BOTH` + HE miss → OTP then checks then HOME.
- HOME Daily subscribe → `registerPending` + partner subscribe with `planId=daily`.
- Operator callback still forwards vendor postback (existing tests).
- `classic` campaign: OTP still goes to CONFIRM; HOME SUBSCRIBE still OTP/CONFIRM.

**Done when:** three local smokes — HE-only miss → error/redirect; OTP-only → OTP → HOME → Daily; BOTH miss → OTP → HOME → Daily.

---

### Phase 2 — Multi-pack URLs + editor

**Goal:** Weekly/Monthly work; URL is campaign template or per-button override.

1. PropertyPanel fields on pack-subscribe buttons:
   - Pack (`daily|weekly|monthly`) → `data-pack`
   - Optional Subscribe URL override → `data-subscribe-url`
   - Optional “Queue vendor postback” checkbox → `data-postback="1"` (default on)
2. `partner-api.service.js` `subscribe()`: if button override URL present, resolve placeholders against that URL; else campaign `subscribeApi`.
3. HOME starter template **example**: three pack buttons (optional pattern, not required). Set `funnel_layout=packs_on_home` when applying this template.
4. Funnel guide: HOME is free canvas; pack buttons work on HOME or CONFIRM (or any page). CONFIRM stays optional.
5. Soft editor warning: if two *kinds* of conversion triggers exist (e.g. OTP postback + pack postback), not if three pack buttons are all checked.

**Tests**

- Weekly button → `planId=weekly` / `subServiceId=HWeekly`.
- Override URL used as-is after `{{msisdn}}` / `{{pack}}` substitution.
- Button with `data-postback="0"` does not `registerPending`.

---

### Phase 3 — Postback settings UX

**Goal:** Settings match the new mental model. No “On Confirm page”.

1. `FlowCampaignSettings.jsx` for `packs_on_home`:
   - Primary: “On pack / subscribe click” (default).
   - Advanced (collapsed): also on OTP verify (legacy pin-to-bill).
   - Copy: pending is queued here; fire happens when the operator hits callback.
2. Keep `postback_register_at` for `classic` (`confirm` | `otp` | `both`).
3. Map: `packs_on_home` + default → same code path as today’s `confirm` trigger, fired from any pack-subscribe / `SUBSCRIBE_ROUTE` click (HOME, CONFIRM, or other).
4. Detect HE-new `registerPending`: skip when `funnel_layout=packs_on_home` (D7). Keep for API-HE exit campaigns (`classic` / outbound success URL).
5. Null-flow CG register: unchanged (not this funnel).

**Tests**

- `packs_on_home` detect HE-new does **not** insert pending.
- Pack click does insert pending.
- `classic` + `postbackRegisterAt=otp` still registers on OTP.

---

### Phase 4 — Docs, templates, cleanup

1. Update `docs/FLOW-ARCHITECTURE.md` §0, § funnel graph, §9 postback callers.
2. Starter templates: HOME packs variant; CONFIRM template remains for classic.
3. Session Detail: pack id on subscribe / confirm-click events (already has pack on CONFIRM_CLICK — reuse).
4. Remove or rewrite copy that says “pack picker only on CONFIRM”.

---

## 4. File map

### Must change

| Area | File |
|------|------|
| Schema | `backend/src/database/migrations/*-AddFunnelLayout.js` |
| Entity | `backend/src/database/entities/campaign.entity.js` |
| Campaign API | `backend/src/modules/campaigns/campaigns.service.js` (+ controller/DTO) |
| Graph | `backend/src/modules/flow/flow-engine.service.js` |
| Detect | `backend/src/modules/flow/helpers/detect.js` |
| OTP | `backend/src/modules/flow/helpers/transition-otp.js` |
| HOME | `backend/src/modules/flow/helpers/transition-home.js` |
| Routing | `backend/src/modules/flow/helpers/routing.js` |
| Confirm/subscribe | `backend/src/modules/flow/helpers/transition-confirm.js`, `transition-subscribe-route.js` |
| Postback gate | `backend/src/modules/flow/helpers/campaign.js` |
| Page boot | `backend/src/modules/flow/helpers/get-page.js` |
| Partner subscribe | `backend/src/modules/flow/partner-api.service.js` |
| Runtime clicks | `frontend/src/pages/subscription/useShadowInteractions.js` |
| Pack UI | `frontend/src/pages/subscription/shadowDom.js` |
| Boot wait | `frontend/src/pages/subscription/useFlowPages.js` |
| Editor | `frontend/src/editor/shell/PropertyPanel.jsx` |
| Settings | `frontend/src/components/flow/FlowCampaignSettings.jsx` |
| Templates / guide | `frontend/src/editor/templates/starterTemplates.js`, `funnelGuide.js` |
| Docs | `docs/FLOW-ARCHITECTURE.md` |

### Likely tests

- `backend/src/modules/flow/helpers/start-config.test.js` (if detect nextPage helpers extracted)
- New: `transition-otp` / detect nextPage / postback gate unit tests
- `frontend/src/pages/subscription` interaction tests if present
- `frontend/src/editor/utils/subscribeRoutes.test.js` if pack attrs parse there
- e2e: `frontend/tests/e2e/flowStartEnd.spec.js`

### Do not change (Phase 1–3)

- Vendor fire path: `postback-forward.js`, `postback-callback.js`
- Unique MSISDN index on `conversion_postbacks`
- Attribution (`rcid` / `click_id` / dual campid)
- HE providers themselves

---

## 5. Button contract (Phase 2)

```html
<button
  type="button"
  data-action="SUBSCRIBE_ROUTE"
  data-pack="weekly"
  data-subscribe-url="https://op.example/sub?msisdn={{msisdn}}&pkg=W"
  data-postback="1"
>
  Weekly
</button>
```

| Attr | Required | Meaning |
|------|----------|---------|
| `data-pack` | yes | `daily` / `weekly` / `monthly` → `planId` |
| `data-action` | yes | `SUBSCRIBE_ROUTE` (preferred) or `CONFIRM` |
| `data-subscribe-url` | no | Overrides campaign `subscribeApi` |
| `data-postback` | no | `"0"` skips pending; default treat as `"1"` for pack-subscribe |

If `data-subscribe-url` is empty, `subscribeApi` template runs with `{{planId}}`, `{{pack}}`, `{{subServiceId}}`.

---

## 6. Postback rules (implementation)

```
registerPending IF
  msisdn present
  AND not blocked
  AND button is pack-subscribe (or classic CONFIRM)
  AND data-postback !== "0"
  AND layout-specific gate:
       packs_on_home → always on subscribe click
       classic       → existing postbackRegisterAt confirm|otp|both

NEVER registerPending on detect for packs_on_home
FIRE only from /api/flow/callback (unchanged)
```

One pending row per MSISDN (existing unique index). Second pack click upserts.

---

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Live classic campaigns break if OTP→HOME is global | `funnel_layout` default `classic` |
| Double pending (detect + pack click) | D7: skip detect register on `packs_on_home` |
| Weekly/Monthly silent miss if mutex checkbox | D5: all pack CTAs register |
| HOME flash before OTP/ERROR | Boot waits on detect; detect `nextPage` must be OTP or ERROR by mode |
| HE-only accidentally shows OTP | `HEADER_INJECTION` never returns OTP; OTP page hidden in editor for that mode (already) |
| Override URL leaks `click_id` | Keep current rule: do not auto-append attribution; only substitute placeholders present in the URL |
| CONFIRM templates unused / confusing | Keep page; funnel guide explains layout |

---

## 8. Acceptance (UAT)

`packs_on_home` campaign:

**HE only**

1. HE number, new, not blocked → splash then HOME. No OTP. No pending yet.
2. No HE number → ERROR page + fail/CG redirect. Never OTP, never HOME.
3. Blocked → BLOCKED. Active → THANKYOU / success URL.

**OTP only**

4. Land → OTP (no HE). Verify → checksub/blocklist → HOME if new. No pending yet.
5. After verify, blocked/active → status page, not HOME.

**HE + OTP**

6. HE hit + new → HOME, skip OTP.
7. HE miss → OTP → verify → checks → HOME if new.

**Packs (any mode that reached HOME)**

8. Tap Daily → subscribe daily; pending row created.
9. Tap Weekly on another visit → weekly pack; pending created/upserted.
10. Operator callback → vendor URL GET (existing).

`classic` campaign: no behaviour change.

---

## 9. Suggested commit slices

1. `feat: add campaigns.funnel_layout (classic \| packs_on_home)`
2. `feat: packs_on_home identity matrix (HE-only error, OTP-only, BOTH)`
3. `feat: HOME pack CTA reuses confirm subscribe + postback`
4. `feat: per-button subscribe URL override and postback flag`
5. `feat: campaign settings copy for subscribe-click postback`
6. `docs: HOME packs funnel and postback timing`

Do not squash across phases; Phase 1 must be revertible on its own.
