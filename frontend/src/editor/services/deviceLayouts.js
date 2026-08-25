import { getActivePageSnapshot } from './exportSite'

export const LAYOUT_DESKTOP = 'desktop'
export const LAYOUT_MOBILE = 'mobile'
export const MOBILE_LAYOUT_MEDIA = '(max-width: 767px)'
export const MOBILE_LAYOUT_WIDTH = '375'

export function layoutKeyForDevice(deviceName) {
  return String(deviceName || '') === 'Mobile' ? LAYOUT_MOBILE : LAYOUT_DESKTOP
}

export function isMobileViewport(width = typeof window !== 'undefined' ? window.innerWidth : 1024) {
  return Number(width) <= 767
}

function normalizeLayout(raw) {
  if (!raw || typeof raw !== 'object') return null
  const html = typeof raw.html === 'string' ? raw.html : ''
  if (!html.trim()) return null
  return {
    html,
    css: typeof raw.css === 'string' ? raw.css : '',
    customWidth: raw.customWidth != null ? String(raw.customWidth) : '',
    customHeight: raw.customHeight != null ? String(raw.customHeight) : '',
  }
}

export function cloneLayout(layout, overrides = {}) {
  if (!layout?.html) return null
  return {
    html: layout.html,
    css: layout.css || '',
    customWidth: overrides.customWidth != null ? String(overrides.customWidth) : layout.customWidth || '',
    customHeight: overrides.customHeight != null ? String(overrides.customHeight) : layout.customHeight || '',
  }
}

/** Read saved variants; old pages without deviceLayouts become desktop-only. */
export function parseDeviceLayouts(projectData, fallbackHtml, fallbackCss) {
  const stored = projectData?.deviceLayouts && typeof projectData.deviceLayouts === 'object'
    ? projectData.deviceLayouts
    : {}
  const fromStoreDesktop = normalizeLayout(stored.desktop)
  const fromStoreMobile = normalizeLayout(stored.mobile)
  const fallback = normalizeLayout({
    html: fallbackHtml,
    css: fallbackCss,
    customWidth: projectData?.customWidth,
    customHeight: projectData?.customHeight,
  })
  return {
    [LAYOUT_DESKTOP]: fromStoreDesktop || fallback,
    [LAYOUT_MOBILE]: fromStoreMobile,
  }
}

export function snapshotLayout(editor, deviceName, customWidth, customHeight) {
  const { html, css } = getActivePageSnapshot(editor)
  const mobile = layoutKeyForDevice(deviceName) === LAYOUT_MOBILE
  return {
    html,
    css,
    customWidth: mobile ? MOBILE_LAYOUT_WIDTH : customWidth != null ? String(customWidth) : '',
    customHeight: customHeight != null ? String(customHeight) : '',
  }
}

/**
 * Persist both layouts. Top-level html/css stay desktop so older clients
 * and the editor's first open still have a canonical page.
 */
export function buildSavePayload(editor, layouts, currentKey, currentSnapshot, customWidth, customHeight) {
  const next = {
    desktop: layouts?.desktop || null,
    mobile: layouts?.mobile || null,
  }
  if (currentKey === LAYOUT_MOBILE || currentKey === LAYOUT_DESKTOP) {
    next[currentKey] = currentSnapshot
  }
  if (!next.desktop && currentKey === LAYOUT_DESKTOP) {
    next.desktop = currentSnapshot
  }
  const desktop = next.desktop || currentSnapshot
  const grapes = editor.getProjectData() || {}
  delete grapes.deviceLayouts
  delete grapes.activeDeviceLayout
  grapes.customWidth = desktop?.customWidth || customWidth || grapes.customWidth
  grapes.customHeight = desktop?.customHeight || customHeight || grapes.customHeight
  grapes.deviceLayouts = {
    desktop: next.desktop || null,
    mobile: next.mobile || null,
  }
  grapes.activeDeviceLayout = currentKey

  return {
    projectData: grapes,
    html: desktop?.html || currentSnapshot.html || '',
    css: desktop?.css || currentSnapshot.css || '',
  }
}

/** Live / Preview: phone gets the mobile HTML when it was saved. */
export function pickLivePageData(pageData, mobile = false) {
  if (!pageData) return pageData
  const layouts = pageData.projectData?.deviceLayouts
  const chosen = mobile
    ? normalizeLayout(layouts?.mobile)
    : normalizeLayout(layouts?.desktop)

  if (!chosen) {
    return pageData
  }

  return {
    ...pageData,
    html: chosen.html,
    css: chosen.css || pageData.css || '',
    projectData: {
      ...(pageData.projectData || {}),
      customWidth: chosen.customWidth || (mobile ? MOBILE_LAYOUT_WIDTH : pageData.projectData?.customWidth),
      customHeight: chosen.customHeight || pageData.projectData?.customHeight,
    },
  }
}
