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

const FLOW_ACTIONS = new Set(['SUBSCRIBE', 'SUBSCRIBE_ROUTE', 'CONFIRM', 'CHAIN'])
const FLOW_OTP = new Set(['send', 'verify'])

export const MIN_BTN_HEIGHT = 44
/** Horizontal shrink floor — must stay well below typical CTA widths. */
export const MIN_BTN_WIDTH = 48

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

/**
 * Hotspots, marked image overlays, or absolute controls sitting on an image.
 *
 * IMPORTANT: bare `position:absolute` + top/left is NOT enough. Grapes Canva-drag
 * often leaves those styles on in-card OTP/SUBSCRIBE CTAs without data-tc-absolute.
 * Preview then positions them against page-wrapper (full width) → button floats
 * outside the card while the canvas still looks fine (class says relative).
 * drag:end must call markAsAbsoluteOverlay so real overlays get the flag.
 */
export function wasIntentionallyAbsolute(component) {
  if (!component) return false
  const attrs = component.getAttributes?.() || {}
  if (attrs['data-tc-type'] === 'hotspot') return true
  if (attrs['data-tc-absolute'] === '1' || attrs['data-tc-absolute'] === 'true') return true

  const style = component.getStyle?.() || {}
  const pos = String(style.position || '').toLowerCase()
  if (pos === 'absolute' && isOverImageContext(component)) return true
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

/** Clear leftover HTML style="" absolute geometry (wins over CssComposer classes). */
function stripAbsoluteStyleAttribute(component) {
  const attrs = component.getAttributes?.() || {}
  const raw = attrs.style
  if (raw == null || raw === '') return
  const next = String(raw)
    .replace(/(?:^|;)\s*position\s*:\s*absolute\s*/gi, ';')
    .replace(/(?:^|;)\s*position\s*:\s*fixed\s*/gi, ';')
    .replace(/(?:^|;)\s*top\s*:\s*[^;]+/gi, ';')
    .replace(/(?:^|;)\s*left\s*:\s*[^;]+/gi, ';')
    .replace(/(?:^|;)\s*right\s*:\s*[^;]+/gi, ';')
    .replace(/(?:^|;)\s*bottom\s*:\s*[^;]+/gi, ';')
    .replace(/(?:^|;)\s*z-index\s*:\s*[^;]+/gi, ';')
    .replace(/;;+/g, ';')
    .replace(/^;|;$/g, '')
    .trim()
  if (next === String(raw).trim()) return
  try {
    const patched = { ...attrs }
    if (next) patched.style = next
    else delete patched.style
    component.setAttributes?.(patched)
  } catch (_) {
    /* noop */
  }
}

/** Prefer an explicit resized width; default full-bleed CTA stays 100%. */
function resolveFlowButtonWidth(style = {}, el = null) {
  const raw = String(style.width || '').trim()
  if (!raw || raw === 'auto' || /^100(\.0+)?%$/.test(raw)) return '100%'

  // Grapes may leave a % width after drag; commit to px so further shrink/grow is stable.
  const px = parsePx(raw)
  if (px != null && String(raw).includes('%') && el && el.offsetWidth > 0) {
    return `${Math.max(MIN_BTN_WIDTH, Math.round(el.offsetWidth))}px`
  }
  if (px != null && String(raw).endsWith('px')) {
    return `${Math.max(MIN_BTN_WIDTH, Math.round(px))}px`
  }
  return raw
}

function syncFlowButtonDom(el, minHeightPx, width = '100%') {
  if (!el?.style) return
  stripAbsoluteFromEl(el)
  const custom = width !== '100%'
  el.style.position = 'relative'
  el.style.width = width
  el.style.maxWidth = '100%'
  // Floor only — never lock min-width to current width (that blocks shrink).
  el.style.minWidth = custom ? `${MIN_BTN_WIDTH}px` : '0'
  el.style.height = ''
  el.style.minHeight = `${minHeightPx}px`
  el.style.boxSizing = 'border-box'
  // inline-flex + align-self so parent flex stretch cannot force full row width
  el.style.display = 'inline-flex'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  el.style.alignSelf = custom ? 'center' : 'stretch'
  el.style.flexShrink = '0'
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
 * Idempotent: skip setStyle when already in-flow so component:styleUpdate cannot loop.
 * Always strips leftover style="" absolute (Grapes often keeps class=relative + attr absolute).
 */
export function keepFlowButtonInFlow(component) {
  if (!component || !isFlowLayoutButton(component)) return
  if (wasIntentionallyAbsolute(component)) return

  stripAbsoluteStyleAttribute(component)

  const prev = component.getStyle?.() || {}
  let minH = parsePx(prev['min-height']) ?? parsePx(prev.height) ?? MIN_BTN_HEIGHT
  if (!Number.isFinite(minH) || minH < MIN_BTN_HEIGHT) minH = MIN_BTN_HEIGHT

  const el = typeof component.getEl === 'function' ? component.getEl() : null
  const width = resolveFlowButtonWidth(prev, el)
  const customWidth = width !== '100%'
  // Reasonable shrink floor — never equal current width (that made handles refuse to shrink).
  const minWidth = customWidth ? `${MIN_BTN_WIDTH}px` : '0'
  const alignSelf = customWidth ? 'center' : 'stretch'

  const pos = String(prev.position || '').toLowerCase()
  const hasAbsGeo =
    pos === 'absolute' ||
    pos === 'fixed' ||
    prev.top != null ||
    prev.left != null ||
    prev.right != null ||
    prev.bottom != null

  const elPos = String(el?.style?.position || '').toLowerCase()
  const elHasAbs =
    elPos === 'absolute' ||
    elPos === 'fixed' ||
    !!(el?.style?.top || el?.style?.left || el?.style?.right || el?.style?.bottom)

  const alreadyInFlow =
    !hasAbsGeo &&
    !elHasAbs &&
    (pos === 'relative' || pos === 'static' || pos === '') &&
    String(prev.width || '') === width &&
    String(prev['min-height'] || '') === `${minH}px` &&
    String(prev['min-width'] || '') === minWidth &&
    String(prev.display || '') === 'inline-flex' &&
    String(prev['align-self'] || '') === alignSelf

  if (alreadyInFlow) return

  const style = {
    position: 'relative',
    width,
    'max-width': '100%',
    'min-width': minWidth,
    'min-height': `${minH}px`,
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'align-self': alignSelf,
    'flex-shrink': '0',
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
  try {
    component.removeStyle?.('top')
    component.removeStyle?.('left')
    component.removeStyle?.('right')
    component.removeStyle?.('bottom')
    component.removeStyle?.('z-index')
    component.removeStyle?.('height')
  } catch (_) {
    /* noop */
  }

  syncFlowButtonDom(el, minH, width)
}

export function enforceFlowButtonSize(component) {
  keepFlowButtonInFlow(component)
}

/** In-flow CTAs: width + min-height via corners and edges. Overlays use full resizer. */
export const FLOW_BUTTON_RESIZABLE = {
  tl: 1,
  tc: 1,
  tr: 1,
  cl: 1,
  cr: 1,
  bl: 1,
  bc: 1,
  br: 1,
  // minDim applies to both axes; keep near height floor (width has its own MIN_BTN_WIDTH in heal).
  minDim: MIN_BTN_WIDTH,
  ratioDefault: 0,
  // Force px — inheriting unit from width:100% made Grapes write % and fight shrink.
  unitWidth: 'px',
  unitHeight: 'px',
  currentUnit: 0,
  keyWidth: 'width',
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

const BLOCK_CONTAINER_TAGS = new Set([
  'section',
  'header',
  'footer',
  'nav',
  'main',
  'div',
  'article',
  'aside',
  'form',
])

/** In-flow blocks/sections: grow length via min-height so content is not clipped. */
export const FLOW_BLOCK_RESIZABLE = {
  tl: 1,
  tc: 1,
  tr: 1,
  cl: 1,
  cr: 1,
  bl: 1,
  bc: 1,
  br: 1,
  minDim: 40,
  ratioDefault: 0,
  keyHeight: 'min-height',
}

/** Absolute overlays keep height (not min-height) so freeform boxes resize as expected. */
export const ABSOLUTE_BLOCK_RESIZABLE = {
  tl: 1,
  tc: 1,
  tr: 1,
  cl: 1,
  cr: 1,
  bl: 1,
  bc: 1,
  br: 1,
  minDim: 40,
  ratioDefault: 0,
}

/** Sections / generic containers users expect to stretch — not text, CTAs, images, hotspots. */
export function isResizableBlockContainer(component) {
  if (!component) return false
  if (isButtonLikeComponent(component) || isFlowLayoutButton(component)) return false

  const tag = (component.get('tagName') || '').toLowerCase()
  const type = component.get('type') || ''
  const attrs = component.getAttributes?.() || {}
  const tcType = attrs['data-tc-type']

  if (type === 'wrapper' || tag === 'body' || tag === 'html') return false
  if (tcType === 'hotspot' || tcType === 'button' || tcType === 'image') return false
  if (type === 'image' || tag === 'img') return false
  if (TEXT_TAGS.has(tag) || type === 'text') return false

  if (tcType === 'section' || tcType === 'image-banner') return true
  return BLOCK_CONTAINER_TAGS.has(tag)
}

export function configureBlockResizable(component) {
  if (!isResizableBlockContainer(component)) return
  const style = component.getStyle?.() || {}
  const isAbs =
    String(style.position || '').toLowerCase() === 'absolute' ||
    component.getAttributes?.()?.['data-tc-absolute'] === '1'
  component.set('resizable', isAbs ? ABSOLUTE_BLOCK_RESIZABLE : FLOW_BLOCK_RESIZABLE)
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

/**
 * Live funnel / Preview: strip accidental absolute px boxes on in-card CTAs.
 * Real image overlays keep data-tc-absolute="1" and are left alone.
 */
export function healLiveFlowButtons(root) {
  if (!root?.querySelectorAll) return 0
  let healed = 0
  const nodes = root.querySelectorAll(
    'button.flow-btn, .flow-btn, button[data-action], a[data-action], button[data-otp-action], [data-otp-action]',
  )
  nodes.forEach((el) => {
    try {
      if (el.getAttribute('data-tc-type') === 'hotspot') return
      if (
        el.getAttribute('data-tc-absolute') === '1' ||
        el.getAttribute('data-tc-absolute') === 'true'
      ) {
        return
      }
      const cs = el.ownerDocument?.defaultView?.getComputedStyle?.(el)
      const inlinePos = String(el.style?.position || '').toLowerCase()
      const computedPos = String(cs?.position || '').toLowerCase()
      const isAbs = inlinePos === 'absolute' || inlinePos === 'fixed' || computedPos === 'absolute'
      if (!isAbs && !el.style.top && !el.style.left) return

      el.style.position = 'relative'
      el.style.top = ''
      el.style.left = ''
      el.style.right = ''
      el.style.bottom = ''
      el.style.zIndex = ''
      el.style.width = '100%'
      el.style.maxWidth = '100%'
      el.style.minWidth = '0'
      el.style.display = el.style.display || 'inline-flex'
      el.style.alignItems = el.style.alignItems || 'center'
      el.style.justifyContent = el.style.justifyContent || 'center'
      el.style.alignSelf = 'stretch'
      el.style.boxSizing = 'border-box'
      if (!el.style.minHeight) el.style.minHeight = `${MIN_BTN_HEIGHT}px`
      healed += 1
    } catch (_) {
      /* noop */
    }
  })
  return healed
}

export const TEXT_SIZE_ALIGN_CANVAS_CSS = `
  button.flow-btn:not([data-tc-absolute="1"]),
  .flow-btn:not([data-tc-absolute="1"]),
  button[data-action="SUBSCRIBE"]:not([data-tc-absolute="1"]),
  button[data-action="SUBSCRIBE_ROUTE"]:not([data-tc-absolute="1"]),
  button[data-action="CONFIRM"]:not([data-tc-absolute="1"]),
  button[data-otp-action]:not([data-tc-absolute="1"]) {
    box-sizing: border-box !important;
    max-width: 100% !important;
    /* Floor only — do not !important a large min-width (blocks shrink). */
    min-width: 0 !important;
    min-height: ${MIN_BTN_HEIGHT}px;
  }
`
