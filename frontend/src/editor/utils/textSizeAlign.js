import { isOverImageContext } from './overlayStacking'

/**
 * Flow-button resize safety for in-card CTAs only.
 * Absolute overlays on images use data-tc-absolute=1 and are left alone.
 */

const TEXT_TAGS = new Set([
  'button',
  'a',
  'p',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'label',
  'li',
])

const FLOW_ACTIONS = new Set(['SUBSCRIBE', 'CONFIRM', 'CHAIN'])
const FLOW_OTP = new Set(['send', 'verify'])

export const MIN_BTN_HEIGHT = 44

function parsePx(value) {
  if (value == null || value === '') return null
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

export function isButtonLikeComponent(component) {
  if (!component) return false
  const tag = (component.get('tagName') || '').toLowerCase()
  const type = component.get('type') || ''
  const attrs = component.getAttributes?.() || {}
  const tcType = attrs['data-tc-type']
  return (
    tag === 'button' ||
    type === 'link' ||
    tcType === 'button' ||
    (tag === 'a' && tcType !== 'hotspot')
  )
}

export function isTextSizedComponent(component) {
  if (!component) return false
  const tag = (component.get('tagName') || '').toLowerCase()
  const type = component.get('type') || ''
  const attrs = component.getAttributes?.() || {}
  const tcType = attrs['data-tc-type']

  if (tcType === 'hotspot') return false
  if (isButtonLikeComponent(component)) return true
  if (TEXT_TAGS.has(tag) || type === 'text') return true
  return false
}

export function isFlowLayoutButton(component) {
  if (!component || !isButtonLikeComponent(component)) return false
  const attrs = component.getAttributes?.() || {}
  if (attrs['data-tc-type'] === 'hotspot') return false

  const action = String(attrs['data-action'] || '').toUpperCase()
  if (FLOW_ACTIONS.has(action)) return true

  const otp = String(attrs['data-otp-action'] || '').toLowerCase()
  if (FLOW_OTP.has(otp)) return true

  const el = typeof component.getEl === 'function' ? component.getEl() : null
  if (el?.classList?.contains('flow-btn')) return true

  const classes = String(attrs.class || attrs.className || '')
  if (/\bflow-btn\b/.test(classes)) return true

  return false
}

/** Hotspots, image overlays, or explicitly marked absolute widgets. */
export function wasIntentionallyAbsolute(component) {
  if (!component) return false
  const attrs = component.getAttributes?.() || {}
  if (attrs['data-tc-type'] === 'hotspot') return true
  if (attrs['data-tc-absolute'] === '1' || attrs['data-tc-absolute'] === 'true') return true
  if (isOverImageContext(component)) {
    const style = component.getStyle?.() || {}
    if (String(style.position || '').toLowerCase() === 'absolute') return true
  }
  return false
}

function stripAbsoluteFromEl(el) {
  if (!el?.style) return
  if (el.style.position === 'absolute' || el.style.position === 'fixed') {
    el.style.position = ''
    el.style.top = ''
    el.style.left = ''
    el.style.right = ''
    el.style.bottom = ''
    el.style.zIndex = ''
  }
}

function syncFlowButtonDom(el, minHeightPx) {
  if (!el?.style) return
  stripAbsoluteFromEl(el)
  el.style.position = 'relative'
  el.style.width = '100%'
  el.style.maxWidth = '100%'
  el.style.minWidth = '0'
  el.style.height = ''
  el.style.minHeight = `${minHeightPx}px`
  el.style.boxSizing = 'border-box'
  el.style.display = 'flex'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  el.style.overflow = 'visible'
  el.style.visibility = 'visible'
  if (el.style.opacity === '0') el.style.opacity = '1'
  el.style.top = ''
  el.style.left = ''
  el.style.right = ''
  el.style.bottom = ''
  el.style.margin = ''
  el.style.zIndex = ''
}

/**
 * In-card CTA only — never run on image overlays (data-tc-absolute / over image).
 */
export function keepFlowButtonInFlow(component) {
  if (!component || !isFlowLayoutButton(component)) return
  if (wasIntentionallyAbsolute(component)) return

  const prev = component.getStyle?.() || {}
  let minH = parsePx(prev['min-height']) ?? parsePx(prev.height) ?? MIN_BTN_HEIGHT
  if (!Number.isFinite(minH) || minH < MIN_BTN_HEIGHT) minH = MIN_BTN_HEIGHT

  const style = {
    position: 'relative',
    width: '100%',
    'max-width': '100%',
    'min-width': '0',
    'min-height': `${minH}px`,
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'box-sizing': 'border-box',
    overflow: 'visible',
    visibility: 'visible',
    'text-align': prev['text-align'] || 'center',
  }

  for (const key of [
    'background',
    'background-color',
    'color',
    'border',
    'border-radius',
    'padding',
    'font-size',
    'font-weight',
    'font-family',
    'box-shadow',
    'letter-spacing',
    'text-transform',
    'line-height',
  ]) {
    if (prev[key] != null && prev[key] !== '') style[key] = prev[key]
  }

  component.setStyle(style)

  const el = typeof component.getEl === 'function' ? component.getEl() : null
  syncFlowButtonDom(el, minH)
}

export function enforceFlowButtonSize(component) {
  keepFlowButtonInFlow(component)
}

/** Height-only for in-flow CTAs. Overlays use full resizer separately. */
export const FLOW_BUTTON_RESIZABLE = {
  tl: 0,
  tc: 0,
  tr: 0,
  cl: 0,
  cr: 0,
  bl: 0,
  bc: 1,
  br: 0,
  minDim: MIN_BTN_HEIGHT,
  ratioDefault: 0,
  keyHeight: 'min-height',
}

export const OVERLAY_BUTTON_RESIZABLE = {
  tl: 1,
  tc: 1,
  tr: 1,
  cl: 1,
  cr: 1,
  bl: 1,
  bc: 1,
  br: 1,
  minDim: 24,
  ratioDefault: 0,
}

export function configureFlowButtonResizable(component) {
  if (!isFlowLayoutButton(component)) return
  if (wasIntentionallyAbsolute(component)) {
    component.set('resizable', OVERLAY_BUTTON_RESIZABLE)
    return
  }
  component.set('resizable', FLOW_BUTTON_RESIZABLE)
}

export function applyTextSizeAlignment(component, opts = {}) {
  if (!component || typeof component.addStyle !== 'function') return
  if (!isTextSizedComponent(component)) return

  if (isFlowLayoutButton(component) && !wasIntentionallyAbsolute(component)) {
    keepFlowButtonInFlow(component)
    return
  }

  const style = component.getStyle?.() || {}
  const heightPx = parsePx(style.height) ?? parsePx(style['min-height'])
  if (!opts.force && (heightPx == null || heightPx <= 0)) return

  const buttonLike = isButtonLikeComponent(component)
  const patch = {
    'box-sizing': 'border-box',
    'line-height': '1.25',
    overflow: 'visible',
  }

  if (buttonLike) {
    patch.display = 'inline-flex'
    patch['align-items'] = 'center'
    patch['justify-content'] = 'center'
    patch['text-align'] = style['text-align'] || 'center'
    if (heightPx < MIN_BTN_HEIGHT) patch['min-height'] = `${MIN_BTN_HEIGHT}px`
  } else {
    patch.display = 'flex'
    patch['align-items'] = 'center'
    patch['justify-content'] =
      style['text-align'] === 'right'
        ? 'flex-end'
        : style['text-align'] === 'center'
          ? 'center'
          : 'flex-start'
  }

  component.addStyle(patch)
}

export function healFlowButtonsInEditor(editor) {
  const wrapper = editor?.getWrapper?.()
  if (!wrapper) return 0
  let healed = 0
  const walk = (cmp) => {
    if (isFlowLayoutButton(cmp)) {
      if (wasIntentionallyAbsolute(cmp)) {
        configureFlowButtonResizable(cmp)
      } else {
        keepFlowButtonInFlow(cmp)
        configureFlowButtonResizable(cmp)
        healed += 1
      }
    }
    cmp.components?.()?.forEach?.(walk)
  }
  walk(wrapper)
  return healed
}

export const TEXT_SIZE_ALIGN_CANVAS_CSS = `
  button.flow-btn:not([data-tc-absolute="1"]),
  .flow-btn:not([data-tc-absolute="1"]),
  button[data-action="SUBSCRIBE"]:not([data-tc-absolute="1"]),
  button[data-action="CONFIRM"]:not([data-tc-absolute="1"]),
  button[data-otp-action]:not([data-tc-absolute="1"]) {
    box-sizing: border-box !important;
    max-width: 100% !important;
    min-width: 0 !important;
    min-height: ${MIN_BTN_HEIGHT}px;
  }
`
