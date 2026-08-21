/**
 * Canvas ↔ Preview WYSIWYG contract
 * ─────────────────────────────────
 * One visual truth for campaign pages:
 *   Editor canvas iframe  ≈  Preview / live SubscriptionPage shadow
 *
 * Shared CSS:  flowRuntimeCss.js → FLOW_RUNTIME_CSS (+ stylesheet hrefs)
 * Save path:   heal components → snapshot HTML → sanitizeSavedPageHtml
 * Live path:   mount FLOW_RUNTIME_CSS → healLiveHotspots → healLiveFlowButtons
 *
 * Intentional difference (ONLY):
 *   Canvas uses OVERLAY_STACKING_CANVAS_CSS (no position:!important) so Grapes
 *   absolute drag works. Live uses OVERLAY_STACKING_CSS (forces absolute on
 *   data-tc-absolute / hotspot). In-card CTAs must NOT have stray absolute
 *   without data-tc-absolute — sanitize + heal enforce that.
 */

const FLOW_CTA_SELECTOR = [
  'button.flow-btn',
  '.flow-btn',
  'button[data-action]',
  'a[data-action]',
  'button[data-otp-action]',
  '[data-otp-action]',
  'button[data-dcb-action]',
  '[data-dcb-action]',
  'a[data-tc-type="button"]',
  'button[data-tc-type="button"]',
].join(',')

/** Template layout cards — must stay in flex flow for page centering across sizes. */
const FLOW_LAYOUT_CARD_SELECTOR = ['.home-card', '.otp-card', '.confirm-card'].join(',')

function isMarkedOverlay(el) {
  if (!el) return true
  if (el.getAttribute('data-tc-type') === 'hotspot') return true
  const abs = el.getAttribute('data-tc-absolute')
  return abs === '1' || abs === 'true'
}

function stripAbsoluteInline(el) {
  if (!el?.style) return false
  const pos = String(el.style.position || '').toLowerCase()
  const hasGeo = !!(el.style.top || el.style.left || el.style.right || el.style.bottom)
  if (pos !== 'absolute' && pos !== 'fixed' && !hasGeo) return false

  el.style.position = 'relative'
  el.style.top = ''
  el.style.left = ''
  el.style.right = ''
  el.style.bottom = ''
  el.style.zIndex = ''
  el.style.height = ''
  el.style.width = '100%'
  el.style.maxWidth = '100%'
  el.style.minWidth = '0'
  el.style.boxSizing = 'border-box'
  el.style.display = 'inline-flex'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  if (!el.style.minHeight) el.style.minHeight = '44px'
  return true
}

/** Put template cards back in normal flow so .home-page flex can center them. */
function stripAbsoluteLayoutCard(el) {
  if (!el?.style) return false
  const pos = String(el.style.position || '').toLowerCase()
  const hasGeo = !!(el.style.top || el.style.left || el.style.right || el.style.bottom)
  if (pos !== 'absolute' && pos !== 'fixed' && !hasGeo) return false

  el.style.position = 'relative'
  el.style.top = ''
  el.style.left = ''
  el.style.right = ''
  el.style.bottom = ''
  el.style.zIndex = ''
  el.style.height = ''
  el.style.marginLeft = 'auto'
  el.style.marginRight = 'auto'
  return true
}

/**
 * Belt-and-suspenders: after Grapes getHtml(), strip accidental absolute
 * geometry from in-card CTAs and template cards so DB HTML cannot diverge from
 * canvas intent. Real image overlays (data-tc-absolute / hotspot) are untouched.
 *
 * @param {string} html
 * @returns {string}
 */
export function sanitizeSavedPageHtml(html) {
  if (!html || typeof html !== 'string') return html || ''
  if (typeof DOMParser === 'undefined') return html

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`,
      'text/html',
    )
    let changed = false
    doc.body.querySelectorAll(FLOW_CTA_SELECTOR).forEach((el) => {
      if (isMarkedOverlay(el)) return
      if (stripAbsoluteInline(el)) changed = true
    })
    doc.body.querySelectorAll(FLOW_LAYOUT_CARD_SELECTOR).forEach((el) => {
      if (isMarkedOverlay(el)) return
      if (stripAbsoluteLayoutCard(el)) changed = true
    })
    if (!changed) return html
    return doc.body.innerHTML
  } catch (_) {
    return html
  }
}

/** Static checks used by unit tests / CI — keep canvas≠preview from regressing. */
export const WYSIWYG_INVARIANTS = {
  /** Live + export must inject this module's CSS bundle */
  runtimeCssModule: 'flowRuntimeCss.js',
  /** Must never force width on custom-sized .flow-page-inner */
  forbiddenFlowPageInnerWidthImportant: /\.flow-page-inner\s*\{[^}]*width\s*:\s*100%\s*!important/i,
  /** Save must heal flow buttons before snapshot */
  saveMustHealFlowButtons: 'healFlowButtonsInEditor',
  /** Live mount must heal stray absolute CTAs */
  liveMustHealFlowButtons: 'healLiveFlowButtons',
  /** Snapshot must sanitize HTML string */
  snapshotMustSanitize: 'sanitizeSavedPageHtml',
}
