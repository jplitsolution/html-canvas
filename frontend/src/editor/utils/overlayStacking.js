/**
 * Overlay stacking: buttons/hotspots on images must paint ABOVE the image,
 * and canvas/preview must share the same rules (WYSIWYG).
 *
 * IMPORTANT: never rewrite styles during an active GrapesJS drag/resize —
 * that freezes the sorter and leaves the component "stuck" to the cursor.
 */

export const Z_IMAGE = 1
export const Z_OVERLAY = 40
export const Z_HOTSPOT = 50

export function isImageComponent(component) {
  if (!component) return false
  const tag = (component.get('tagName') || '').toLowerCase()
  const type = component.get('type') || ''
  const tc = component.getAttributes?.()?.['data-tc-type']
  return tag === 'img' || type === 'image' || tc === 'image' || tc === 'image-banner'
}

export function isHotspotComponent(component) {
  if (!component) return false
  return component.getAttributes?.()?.['data-tc-type'] === 'hotspot'
}

/** Tight containing block so hotspot % tracks the image, not the page. */
export const IMAGE_BANNER_STYLE = {
  position: 'relative',
  display: 'block',
  width: '100%',
  'max-width': '100%',
  overflow: 'visible',
  height: 'auto',
  'max-height': 'none',
  margin: '0 auto',
  'line-height': '0',
}

export function isImageBannerHost(target) {
  if (!target) return false
  if (typeof target.getAttribute === 'function') {
    return target.getAttribute('data-tc-type') === 'image-banner'
  }
  return target.getAttributes?.()?.['data-tc-type'] === 'image-banner'
}

function directChildImageEl(parentEl) {
  if (!parentEl?.children) return null
  for (const child of parentEl.children) {
    if (child?.tagName === 'IMG') return child
  }
  return null
}

function clampPct(n, min = 0, max = 100) {
  const v = Number(n)
  if (!Number.isFinite(v)) return min
  return Math.max(min, Math.min(max, v))
}

/** Keep the user's width/height; shift left/top so the box stays on the image. */
function fitBoxPct(left, top, width, height) {
  width = clampPct(width, 4, 100)
  height = clampPct(height, 4, 100)
  left = clampPct(left, 0, 100 - width)
  top = clampPct(top, 0, 100 - height)
  return { left, top, width, height }
}

/** Rewrite hotspot geometry so % is relative to the image box, not a taller parent. */
export function remapHotspotToAnchor(hotspotEl, anchorEl) {
  if (!hotspotEl || !anchorEl) return false
  const er = hotspotEl.getBoundingClientRect?.()
  const ar = anchorEl.getBoundingClientRect?.()
  if (!er || !ar || ar.width < 8 || ar.height < 8 || er.width < 4 || er.height < 4) {
    return false
  }
  let left = ((er.left - ar.left) / ar.width) * 100
  let top = ((er.top - ar.top) / ar.height) * 100
  let width = (er.width / ar.width) * 100
  let height = (er.height / ar.height) * 100
  ;({ left, top, width, height } = fitBoxPct(left, top, width, height))
  hotspotEl.style.position = 'absolute'
  hotspotEl.style.left = `${left.toFixed(2)}%`
  hotspotEl.style.top = `${top.toFixed(2)}%`
  hotspotEl.style.width = `${width.toFixed(2)}%`
  hotspotEl.style.height = `${height.toFixed(2)}%`
  hotspotEl.style.right = ''
  hotspotEl.style.bottom = ''
  return true
}

function imageBoxReady(img) {
  if (!img) return false
  const r = img.getBoundingClientRect?.()
  if (!r || r.width < 8 || r.height < 8) return false
  if (img.tagName === 'IMG' && img.complete === false) return false
  if (img.tagName === 'IMG' && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const expectedH = r.width * (img.naturalHeight / img.naturalWidth)
    if (expectedH > 8 && Math.abs(r.height - expectedH) > Math.max(12, expectedH * 0.2)) {
      return false
    }
  }
  return true
}

function applyBannerHostStyle(el) {
  if (!el?.style) return
  el.style.position = 'relative'
  el.style.display = 'block'
  el.style.width = '100%'
  el.style.maxWidth = '100%'
  el.style.overflow = 'visible'
  el.style.height = 'auto'
  el.style.maxHeight = 'none'
  el.style.marginLeft = 'auto'
  el.style.marginRight = 'auto'
  el.style.lineHeight = '0'
}

function findHotspotImageEl(hotspotEl) {
  const parent = hotspotEl?.parentElement
  if (!parent) return null
  const direct = directChildImageEl(parent)
  if (direct) return direct
  let sib = hotspotEl.previousElementSibling
  while (sib) {
    if (sib.tagName === 'IMG') return sib
    const inner = sib.querySelector?.('img')
    if (inner) return inner
    sib = sib.previousElementSibling
  }
  sib = hotspotEl.nextElementSibling
  while (sib) {
    if (sib.tagName === 'IMG') return sib
    const inner = sib.querySelector?.('img')
    if (inner) return inner
    sib = sib.nextElementSibling
  }
  return parent.querySelector?.('img')
}

/** Live DOM: wrap image + hotspot so the hotspot stays glued on resize. */
export function pinLiveHotspotToImage(hotspotEl) {
  if (!hotspotEl?.parentElement) return hotspotEl.parentElement
  const parent = hotspotEl.parentElement
  if (isImageBannerHost(parent)) {
    applyBannerHostStyle(parent)
    if (hotspotEl.getAttribute('data-tc-pinned') === '1') return parent
    const img = parent.querySelector?.('img')
    if (img && imageBoxReady(img) && remapHotspotToAnchor(hotspotEl, img)) {
      hotspotEl.setAttribute('data-tc-pinned', '1')
    }
    return parent
  }

  const siblingBanner = Array.from(parent.children).find(
    (n) => n !== hotspotEl && isImageBannerHost(n),
  )
  if (siblingBanner) {
    const img = siblingBanner.querySelector('img') || siblingBanner
    if (!imageBoxReady(img)) return parent
    remapHotspotToAnchor(hotspotEl, img)
    siblingBanner.appendChild(hotspotEl)
    applyBannerHostStyle(siblingBanner)
    hotspotEl.setAttribute('data-tc-pinned', '1')
    return siblingBanner
  }

  const img = findHotspotImageEl(hotspotEl)
  if (!img) return parent

  const imgBanner = img.closest?.('[data-tc-type="image-banner"]')
  if (imgBanner && imgBanner !== hotspotEl) {
    remapHotspotToAnchor(hotspotEl, img)
    imgBanner.appendChild(hotspotEl)
    applyBannerHostStyle(imgBanner)
    hotspotEl.setAttribute('data-tc-pinned', '1')
    return imgBanner
  }

  if (!imageBoxReady(img)) return parent

  remapHotspotToAnchor(hotspotEl, img)

  const wrap = parent.ownerDocument.createElement('div')
  wrap.setAttribute('data-tc-type', 'image-banner')
  applyBannerHostStyle(wrap)
  const imgParent = img.parentElement || parent
  imgParent.insertBefore(wrap, img)
  wrap.appendChild(img)
  wrap.appendChild(hotspotEl)
  hotspotEl.setAttribute('data-tc-pinned', '1')
  return wrap
}

/** Scale image+hotspots together after pin, so the CTA stays in view without moving the hotspot %. */
export function fitCreativeToViewport(root) {
  if (!root?.querySelectorAll) return
  const win = root.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null)
  if (!win) return
  const maxH = Math.max(160, Math.round((win.visualViewport?.height || win.innerHeight || 800) - 4))
  const banners = root.querySelectorAll('[data-tc-type="image-banner"]')
  banners.forEach((el) => {
    el.style.transform = 'none'
    el.style.marginBottom = ''
    const h = el.scrollHeight || el.offsetHeight || 0
    if (h <= maxH + 8) return
    const scale = maxH / h
    el.style.transformOrigin = 'top center'
    el.style.transform = `scale(${scale})`
    el.style.marginBottom = `${Math.round(-h * (1 - scale))}px`
  })
}

/** GrapesJS: wrap an <img> in image-banner so hotspot % uses the image box. */
export function wrapImageAsBanner(imgCmp) {
  if (!imgCmp) return null
  const parent = imgCmp.parent?.()
  if (!parent) return imgCmp
  if (isImageBannerHost(parent)) {
    parent.addStyle?.(IMAGE_BANNER_STYLE)
    return parent
  }
  const coll = parent.components?.()
  if (!coll?.add) return parent
  const idx = typeof imgCmp.index === 'function' ? imgCmp.index() : 0
  const added = coll.add(
    {
      tagName: 'div',
      attributes: { 'data-tc-type': 'image-banner' },
      style: { ...IMAGE_BANNER_STYLE },
    },
    { at: idx },
  )
  const host = Array.isArray(added) ? added[0] : added
  if (!host) return parent
  if (typeof host.append === 'function') host.append(imgCmp)
  else host.components?.()?.add?.(imgCmp)
  return host
}

function findImageSiblingComponent(hotspotCmp) {
  const parent = hotspotCmp?.parent?.()
  const kids = parent?.components?.()
  if (!kids) return null
  const len = kids.length || 0
  for (let i = 0; i < len; i++) {
    const child = typeof kids.at === 'function' ? kids.at(i) : kids.models?.[i]
    if (child && child !== hotspotCmp && isImageComponent(child)) return child
  }
  return null
}

function syncHotspotElToModel(component, el) {
  if (!component?.addStyle || !el?.style) return
  const left = el.style.left
  const top = el.style.top
  const width = el.style.width
  const height = el.style.height
  if (!left && !top) return
  component.addStyle({
    position: 'absolute',
    left,
    top,
    width,
    height,
    display: 'block',
    'text-decoration': 'none',
    'z-index': String(Z_HOTSPOT),
    'pointer-events': 'auto',
    cursor: 'pointer',
  })
  try {
    component.removeStyle?.('right')
    component.removeStyle?.('bottom')
  } catch (_) {
    /* noop */
  }
}

/** Move hotspot onto the image banner host (Grapes), remapping % to the image. */
export function pinEditorHotspotToImage(component) {
  if (!isHotspotComponent(component)) return
  const parent = component.parent?.()
  if (!parent) return
  const hotspotEl = component.getEl?.()

  if (isImageBannerHost(parent)) {
    parent.addStyle?.(IMAGE_BANNER_STYLE)
    const imgEl = parent.getEl?.()?.querySelector?.('img')
    if (hotspotEl && imgEl && imageBoxReady(imgEl) && remapHotspotToAnchor(hotspotEl, imgEl)) {
      syncHotspotElToModel(component, hotspotEl)
    }
    return
  }

  const img = findImageSiblingComponent(component)
  if (!img) return
  const imgEl =
    String(img.get?.('tagName') || '').toLowerCase() === 'img'
      ? img.getEl?.()
      : img.getEl?.()?.querySelector?.('img') || img.getEl?.()
  if (hotspotEl && imgEl && imageBoxReady(imgEl)) {
    remapHotspotToAnchor(hotspotEl, imgEl)
    syncHotspotElToModel(component, hotspotEl)
  }
  const host = wrapImageAsBanner(img)
  if (host) host.addStyle?.(IMAGE_BANNER_STYLE)
  if (!host || component.parent?.() === host) return
  if (typeof host.append === 'function') host.append(component)
  else host.components?.()?.add?.(component)
}

function pct(n, fallback = 0) {
  const v = Math.max(0, Math.min(100, n))
  return `${Number.isFinite(v) ? v.toFixed(2) : fallback}%`
}

function defaultHotspotBox(isRight) {
  return {
    top: isRight ? '55%' : '57%',
    left: isRight ? '60%' : '8%',
    width: '30%',
    height: isRight ? '14%' : '12%',
  }
}

function hotspotChrome(extra = {}) {
  return {
    position: 'absolute',
    display: 'block',
    'text-decoration': 'none',
    'z-index': String(Z_HOTSPOT),
    'pointer-events': 'auto',
    cursor: 'pointer',
    ...extra,
  }
}

/** Parse left/top/width/height → % of parent axis. null if missing/unparseable. */
function styleToPct(raw, parentSize) {
  if (raw == null || raw === '' || !parentSize) return null
  const s = String(raw).trim()
  if (s.endsWith('%')) {
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
  }
  // px or unitless number from Grapes absolute drag
  const n = parseFloat(s)
  if (!Number.isFinite(n)) return null
  return (n / parentSize) * 100
}

/**
 * Absolute drag leaves px + cursor:move; conflicting class rules break
 * responsive preview and make hotspots unclickable / undraggable.
 * Convert the live box to % of parent and wipe drag leftovers.
 *
 * CRITICAL: never snap to template defaults when the user placed a box —
 * that made canvas placement disagree with preview (e.g. bottom hotspots
 * with top>88% were forced back to left:8%).
 */
export function normalizeHotspotBox(el, parentEl, { coverFull = false } = {}) {
  if (!el || !parentEl) return null

  // Prefer layout sizes (stable) over getBoundingClientRect (flex/transform drift)
  // offsetParent box can be taller than the image; use the larger of client vs rect
  const rect = parentEl.getBoundingClientRect()
  const pw = Math.max(parentEl.clientWidth || 0, parentEl.offsetWidth || 0, rect.width || 0)
  const ph = Math.max(parentEl.clientHeight || 0, parentEl.offsetHeight || 0, rect.height || 0)
  // Parent not laid out yet (images still loading) — skip so we don't corrupt %
  if (pw < 40 || ph < 40) return null

  if (coverFull) {
    return hotspotChrome({
      top: '0%',
      left: '0%',
      width: '100%',
      height: '100%',
      right: '0%',
      bottom: '0%',
    })
  }

  // Prefer explicit inline styles (what the editor saved) over live rects.
  // Grapes absolute drag writes px; width/height are often already %.
  let leftPct = styleToPct(el.style.left, pw)
  let topPct = styleToPct(el.style.top, ph)
  let widthPct = styleToPct(el.style.width, pw)
  let heightPct = styleToPct(el.style.height, ph)

  const pr = parentEl.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  const hasRect = pr.width > 0 && pr.height > 0 && er.width > 8 && er.height > 8

  if (leftPct == null || topPct == null || widthPct == null || heightPct == null) {
    if (!hasRect) {
      // No usable geometry — only then fall back to starter defaults
      if (leftPct == null && topPct == null && widthPct == null && heightPct == null) {
        return hotspotChrome({ ...defaultHotspotBox(false) })
      }
      return null
    }
    leftPct = leftPct ?? ((er.left - pr.left) / pr.width) * 100
    topPct = topPct ?? ((er.top - pr.top) / pr.height) * 100
    widthPct = widthPct ?? (er.width / pr.width) * 100
    heightPct = heightPct ?? (er.height / pr.height) * 100
  }

  if (widthPct > 98 && heightPct > 98) {
    const cx = (leftPct + widthPct / 2) / 100
    return hotspotChrome({ ...defaultHotspotBox(cx > 0.45) })
  }

  ;({ left: leftPct, top: topPct, width: widthPct, height: heightPct } = fitBoxPct(
    leftPct,
    topPct,
    widthPct,
    heightPct,
  ))

  return hotspotChrome({
    top: pct(topPct),
    left: pct(leftPct),
    width: pct(widthPct, 30),
    height: pct(heightPct, 12),
  })
}

function clearHotspotGeometryRules(component, editor, el) {
  const classNames = Array.from(el?.classList || []).filter((c) => !String(c).startsWith('gjs-'))
  if (!classNames.length) return
  try {
    const rules = editor?.CssComposer?.getAll?.()
    rules?.forEach?.((rule) => {
      const sel = rule.getSelectors?.()?.getFullString?.() || ''
      if (!classNames.some((c) => sel === `.${c}`)) return
      const st = rule.getStyle?.() || {}
      const next = { ...st }
      let changed = false
      for (const key of ['top', 'left', 'right', 'bottom', 'width', 'height', 'cursor']) {
        if (key in next) {
          delete next[key]
          changed = true
        }
      }
      if (changed) rule.setStyle(next)
    })
  } catch (_) {
    /* noop */
  }
}

function hrefIsNavigationTarget(href) {
  const h = String(href || '').trim()
  if (!h || h === '#') return false
  // In-page anchor, absolute URL, or campaign page token (OTP, CONFIRM, …)
  if (h.startsWith('#')) return true
  if (/^(https?:|mailto:|tel:)/i.test(h)) return true
  if (/^[A-Z][A-Z0-9_]*$/i.test(h)) return true
  return h.length > 1
}

/**
 * Repair hotspots after load / bad saves / drag-end:
 * - Ensure data-action so preview clicks fire the flow (only when no URL/page target)
 * - Keep HTML5 draggable=true — Grapes ComponentView listens to dragstart → tlb-move
 *   (absolute Canva drag). Stripping it made hotspots un-grabbable while the toolbar
 *   move handle is also hidden.
 * - Convert px geometry → % so preview stays aligned
 * - Strip cursor:move leftovers from absolute drag
 */
export function healEditorHotspot(component, editor) {
  if (!isHotspotComponent(component)) return

  const attrs = { ...(component.getAttributes?.() || {}) }
  let attrsChanged = false
  if (attrs['data-tc-absolute']) {
    delete attrs['data-tc-absolute']
    attrsChanged = true
  }

  const href = String(attrs.href || '').trim()
  const hasNav = hrefIsNavigationTarget(href)

  // "Open a website" / page / anchor clear data-action on purpose.
  // Never re-force SUBSCRIBE over that — save was resetting the dropdown to
  // "Continue signup flow".
  if (
    attrs['data-action'] === 'SUBSCRIBE' &&
    hasNav &&
    !attrs['data-actions']
  ) {
    delete attrs['data-action']
    attrsChanged = true
  } else if (!attrs['data-action'] && !attrs['data-actions'] && !hasNav) {
    // Empty hotspot with no URL — default to signup so preview clicks still work
    attrs['data-action'] = 'SUBSCRIBE'
    attrsChanged = true
  }

  if (!attrs.href) {
    attrs.href = '#'
    attrsChanged = true
  }
  if (attrsChanged) {
    try {
      component.setAttributes(attrs)
    } catch (_) {
      /* noop */
    }
  }

  try {
    component.set({
      type: 'hotspot',
      draggable: true,
      selectable: true,
      hoverable: true,
      highlightable: true,
      locked: false,
      resizable: true,
    })
  } catch (_) {
    /* noop */
  }

  try {
    pinEditorHotspotToImage(component)
  } catch (_) {
    /* noop */
  }

  const el = component.getEl?.()
  // Grapes initiates absolute drag via HTML5 dragstart → tlb-move. Must stay true.
  if (el) {
    el.setAttribute('draggable', 'true')
  }

  const parent = component.parent?.()
  const parentEl = parent?.getEl?.()
  if (parentEl) {
    const pStyle = parent.getStyle?.() || {}
    if (!['absolute', 'relative', 'fixed'].includes(String(pStyle.position || ''))) {
      parent.addStyle?.({ position: 'relative' })
    }
  }

  if (!el || !parentEl) {
    // No DOM yet — still enforce base styles on the model
    const style = component.getStyle?.() || {}
    const patch = {
      position: 'absolute',
      display: 'block',
      'text-decoration': 'none',
      'z-index': String(Z_HOTSPOT),
      'pointer-events': 'auto',
      cursor: 'pointer',
    }
    if (!style.top && !style.left) Object.assign(patch, defaultHotspotBox(false))
    component.addStyle(patch)
    return
  }

  const coverFull =
    attrs['data-tc-cover-full'] === '1' || attrs['data-tc-cover-full'] === 'true'

  // Sync model → DOM when Grapes left styles only on the component
  const modelStyle = component.getStyle?.() || {}
  for (const key of ['left', 'top', 'width', 'height']) {
    if (!el.style[key] && modelStyle[key]) {
      el.style[key] = String(modelStyle[key])
    }
  }

  // Already % of the image banner — persist to the Grapes model so Save matches canvas
  if (!coverFull && hasPercentGeometry(el) && isImageBannerHost(parent)) {
    syncHotspotElToModel(component, el)
    component.addStyle({
      position: 'absolute',
      display: 'block',
      'text-decoration': 'none',
      'z-index': String(Z_HOTSPOT),
      'pointer-events': 'auto',
      cursor: 'pointer',
    })
    return
  }

  const box = normalizeHotspotBox(el, parentEl, { coverFull })
  if (!box) return

  clearHotspotGeometryRules(component, editor, el)

  try {
    component.removeStyle?.('right')
    component.removeStyle?.('bottom')
    component.removeStyle?.('margin')
    component.removeStyle?.('margin-top')
    component.removeStyle?.('margin-left')
  } catch (_) {
    /* noop */
  }

  if (coverFull) {
    component.setStyle(box)
  } else {
    const { right: _r, bottom: _b, ...rest } = box
    component.setStyle(rest)
    try {
      component.removeStyle?.('right')
      component.removeStyle?.('bottom')
    } catch (_) {
      /* noop */
    }
  }
}

function applyHotspotChrome(el) {
  el.style.position = 'absolute'
  el.style.display = 'block'
  el.style.textDecoration = 'none'
  el.style.zIndex = String(Z_HOTSPOT)
  el.style.pointerEvents = 'auto'
  el.style.cursor = 'pointer'
}

/** True when geometry is already %-based (stable across canvas sizes). */
function hasPercentGeometry(el) {
  const l = String(el.style.left || '')
  const t = String(el.style.top || '')
  const w = String(el.style.width || '')
  const h = String(el.style.height || '')
  return l.endsWith('%') && t.endsWith('%') && w.endsWith('%') && h.endsWith('%')
}

/** Live funnel: make hotspots clickable + convert px → % once (don't re-snap). */
export function healLiveHotspots(root, pageType) {
  if (!root?.querySelectorAll) return
  const page = String(pageType || '').toUpperCase()
  const defaultAction =
    page === 'CONFIRM' ? 'CONFIRM' : page === 'HOME' ? 'SUBSCRIBE' : null

  root.querySelectorAll('[data-tc-type="hotspot"]').forEach((el) => {
    try {
      const href = (el.getAttribute('href') || '').trim()
      const hasNav = hrefIsNavigationTarget(href)

      // Don't overwrite "Open a website" / page / anchor with SUBSCRIBE
      if (
        el.getAttribute('data-action') === 'SUBSCRIBE' &&
        hasNav &&
        !el.hasAttribute('data-actions')
      ) {
        el.removeAttribute('data-action')
      } else if (
        !el.getAttribute('data-action') &&
        !el.hasAttribute('data-actions') &&
        defaultAction &&
        !hasNav
      ) {
        el.setAttribute('data-action', defaultAction)
      }
      if (!el.getAttribute('href')) el.setAttribute('href', '#')
      el.removeAttribute('draggable')

      pinLiveHotspotToImage(el)

      const parent = el.parentElement
      if (!parent) return
      const cs = parent.ownerDocument?.defaultView?.getComputedStyle?.(parent)
      if (cs && cs.position === 'static') {
        parent.style.position = 'relative'
      }

      const coverFull =
        el.getAttribute('data-tc-cover-full') === '1' ||
        el.getAttribute('data-tc-cover-full') === 'true'

      // Pinned to the image banner — keep % of the image, do not re-base on the page.
      if (!coverFull && isImageBannerHost(parent) && hasPercentGeometry(el)) {
        applyHotspotChrome(el)
        el.style.right = ''
        el.style.bottom = ''
        return
      }

      // Image not ready yet — do not convert % against the tall page wrapper.
      if (!coverFull && !isImageBannerHost(parent)) {
        applyHotspotChrome(el)
        return
      }

      const box = normalizeHotspotBox(el, parent, { coverFull })
      if (!box) {
        applyHotspotChrome(el)
        return
      }

      applyHotspotChrome(el)
      el.style.top = box.top
      el.style.left = box.left
      el.style.width = box.width
      el.style.height = box.height
      if (coverFull) {
        el.style.right = '0'
        el.style.bottom = '0'
      } else {
        el.style.right = ''
        el.style.bottom = ''
      }
    } catch (_) {
      /* noop */
    }
  })
}

/**
 * Pointer is over an <img> inside the given container.
 * clientX/Y are viewport coords (from host drag events); converted into iframe space.
 */
export function dropPointHitsImage(parentEl, clientX, clientY) {
  if (!parentEl || clientX == null || clientY == null) return false
  try {
    const doc = parentEl.ownerDocument
    const win = doc.defaultView
    const frame = win?.frameElement
    let x = clientX
    let y = clientY
    if (frame) {
      const fr = frame.getBoundingClientRect()
      x = clientX - fr.left
      y = clientY - fr.top
    }
    const stack = doc.elementsFromPoint?.(x, y) || []
    return stack.some((n) => n?.tagName === 'IMG' && parentEl.contains(n))
  } catch (_) {
    return false
  }
}

/** Parent is an image/banner, or has an image sibling of this component. */
export function parentHasImageSibling(component) {
  if (!component) return false
  const parent = component.parent?.()
  if (!parent) return false
  if (isImageComponent(parent)) return true
  const pTc = parent.getAttributes?.()?.['data-tc-type']
  if (pTc === 'image-banner' || pTc === 'image') return true
  const kids = parent.components?.()
  if (!kids?.length) return false
  for (let i = 0; i < kids.length; i++) {
    const child = typeof kids.at === 'function' ? kids.at(i) : kids.models?.[i]
    if (child && child !== component && isImageComponent(child)) return true
  }
  return false
}

/**
 * True when this component is meant to sit ON an image (not merely share a
 * parent that also contains an image — e.g. in-card Subscribe below a banner).
 */
export function isOverImageContext(component) {
  if (!component) return false
  const parent = component.parent?.()
  if (!parent) return false

  if (isImageComponent(parent)) return true
  const pTc = parent.getAttributes?.()?.['data-tc-type']
  if (pTc === 'image-banner' || pTc === 'image') return true

  const attrs = component.getAttributes?.() || {}
  const style = component.getStyle?.() || {}
  const isAbs =
    attrs['data-tc-absolute'] === '1' ||
    attrs['data-tc-absolute'] === 'true' ||
    String(style.position || '').toLowerCase() === 'absolute'

  if (!isAbs) return false
  return parentHasImageSibling(component)
}

function ensureParentRelative(component) {
  const parent = component.parent?.()
  if (!parent) return
  const pStyle = parent.getStyle?.() || {}
  if (!['absolute', 'relative', 'fixed'].includes(String(pStyle.position || ''))) {
    parent.addStyle({ position: 'relative' })
  }
  const kids = parent.components?.()
  if (!kids?.length) return
  for (let i = 0; i < kids.length; i++) {
    const child = typeof kids.at === 'function' ? kids.at(i) : kids.models?.[i]
    if (child && isImageComponent(child)) {
      const cs = child.getStyle?.() || {}
      if (String(cs['z-index'] || '') !== String(Z_IMAGE)) {
        child.addStyle({ position: 'relative', 'z-index': String(Z_IMAGE) })
      }
    }
  }
}

/**
 * Mark a freeform button/link as an image overlay.
 * Do NOT call this on hotspots — they already use data-tc-type=hotspot.
 * Do NOT call during active drag/resize moves.
 */
export function markAsAbsoluteOverlay(component, extraStyle = {}) {
  if (!component || isHotspotComponent(component)) return

  const attrs = component.getAttributes?.() || {}
  const already = attrs['data-tc-absolute'] === '1' || attrs['data-tc-absolute'] === 'true'
  const prev = component.getStyle?.() || {}
  const hasExtra = extraStyle && Object.keys(extraStyle).length > 0

  // Already locked — only apply explicit placement updates (never fight live drag)
  if (already && !hasExtra) {
    ensureParentRelative(component)
    if (String(prev['z-index'] || '') !== String(Z_OVERLAY)) {
      component.addStyle({ 'z-index': String(Z_OVERLAY) })
    }
    return
  }

  component.addAttributes({ 'data-tc-absolute': '1' })
  ensureParentRelative(component)
  try {
    component.set('draggable', true)
  } catch (_) {
    /* noop */
  }

  const patch = {
    position: 'absolute',
    'z-index': String(Z_OVERLAY),
    margin: '0',
    ...extraStyle,
  }

  // Keep existing sized box; only default to auto when width was full-bleed
  if (!extraStyle.width) {
    const w = prev.width
    if (!w || w === '100%') patch.width = 'auto'
  }
  if (!extraStyle['max-width'] && !prev['max-width']) {
    patch['max-width'] = 'calc(100% - 16px)'
  }

  component.addStyle(patch)
}

/**
 * After drag/drop END only: if this control sits on an image, lock overlay mode.
 * Returns true when it is (or becomes) an overlay. Never mutates hotspots.
 */
export function promoteOverlayIfNeeded(component) {
  if (!component) return false
  const attrs = component.getAttributes?.() || {}

  // Hotspots are already overlays — just ensure image siblings stay under
  if (attrs['data-tc-type'] === 'hotspot') {
    ensureParentRelative(component)
    return true
  }

  if (attrs['data-tc-absolute'] === '1' || attrs['data-tc-absolute'] === 'true') {
    markAsAbsoluteOverlay(component)
    return true
  }

  const style = component.getStyle?.() || {}
  const isAbs = String(style.position || '').toLowerCase() === 'absolute'
  if (!isAbs) return false

  // Absolute + shares parent with an image → always above the image
  if (parentHasImageSibling(component) || isOverImageContext(component)) {
    markAsAbsoluteOverlay(component)
    return true
  }

  try {
    const el = component.getEl?.()
    if (!el || typeof document === 'undefined') return false
    const doc = el.ownerDocument
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return false
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const stack = doc.elementsFromPoint?.(cx, cy) || []
    const hitImg = stack.some(
      (n) => n !== el && !el.contains(n) && n.tagName === 'IMG'
    )
    if (hitImg) {
      markAsAbsoluteOverlay(component)
      return true
    }
  } catch (_) {
    /* noop */
  }

  // Absolute freeform button/link — still lift z-index so canvas img{z-index:1} doesn't cover it
  const tag = (component.get('tagName') || '').toLowerCase()
  const tc = attrs['data-tc-type']
  if (tag === 'button' || tc === 'button' || (tag === 'a' && tc !== 'hotspot')) {
    const z = parseInt(String(style['z-index'] || ''), 10)
    if (!Number.isFinite(z) || z < Z_OVERLAY) {
      component.addStyle({ 'z-index': String(Z_OVERLAY) })
    }
    return true
  }

  return false
}

/**
 * Editor canvas CSS — stacking only, NO position:!important
 * (important position freezes Grapes absolute drag / leaves cursor stuck).
 *
 * Images get z-index:1 — so absolute buttons MUST get a higher z-index
 * or they paint UNDER the image.
 */
export const OVERLAY_STACKING_CANVAS_CSS = `
  [data-tc-type="image-banner"] {
    position: relative;
    display: block;
    width: 100%;
    max-width: 100%;
    overflow: visible;
    height: auto;
    max-height: none;
    line-height: 0;
  }
  [data-tc-type="image-banner"] > img {
    width: 100%;
    height: auto !important;
    max-height: none !important;
    object-fit: contain;
    display: block;
    max-width: 100%;
  }

  img,
  [data-tc-type="image"] {
    position: relative;
    z-index: ${Z_IMAGE};
  }

  /* Freeform absolute controls always above images */
  [data-tc-absolute="1"] {
    z-index: ${Z_OVERLAY};
  }
  [data-tc-type="hotspot"] {
    z-index: ${Z_HOTSPOT};
    pointer-events: auto;
    cursor: grab;
  }
  [data-tc-type="hotspot"]:active {
    cursor: grabbing;
  }

  /* Buttons on images keep content size — never stretch (exclude hotspots) */
  button[data-tc-absolute="1"],
  a[data-tc-type="button"][data-tc-absolute="1"],
  [data-tc-absolute="1"].flow-btn,
  button.flow-btn[data-tc-absolute="1"],
  .flow-btn[data-tc-absolute="1"] {
    width: auto !important;
    max-width: calc(100% - 16px) !important;
    min-width: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
`

/** Preview / export CSS — force absolute so live page matches canvas. */
export const OVERLAY_STACKING_CSS = `
  [data-tc-type="image-banner"] {
    position: relative !important;
    display: block;
    width: 100%;
    max-width: 100%;
    overflow: visible !important;
    height: auto !important;
    line-height: 0;
  }
  [data-tc-type="image-banner"] > img {
    width: 100%;
    height: auto !important;
    max-height: none !important;
    object-fit: contain;
    display: block;
    max-width: 100%;
  }

  img,
  [data-tc-type="image"] {
    position: relative;
    z-index: ${Z_IMAGE};
  }

  [data-tc-absolute="1"],
  [data-tc-type="hotspot"] {
    position: absolute !important;
    z-index: ${Z_OVERLAY} !important;
  }
  [data-tc-type="hotspot"] {
    z-index: ${Z_HOTSPOT} !important;
    pointer-events: auto !important;
    cursor: pointer !important;
  }

  button[data-tc-absolute="1"],
  a[data-tc-type="button"][data-tc-absolute="1"],
  [data-tc-absolute="1"].flow-btn,
  button.flow-btn[data-tc-absolute="1"],
  .flow-btn[data-tc-absolute="1"] {
    width: auto !important;
    max-width: calc(100% - 16px) !important;
    min-width: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
`
