import { RESPONSIVE_STYLE_RULES } from '../services/flowRuntimeCss'
import { safeGetWrapper } from '../utils/editorUtils'
import {
  applyTextSizeAlignment,
  configureFlowButtonResizable,
  healFlowButtonsInEditor,
  keepFlowButtonInFlow,
  isFlowLayoutButton,
  wasIntentionallyAbsolute,
  TEXT_SIZE_ALIGN_CANVAS_CSS,
} from '../utils/textSizeAlign'
import { OVERLAY_STACKING_CANVAS_CSS, healEditorHotspot } from '../utils/overlayStacking'

function getCanvasFrameEl(editor) {
  if (!editor?.Canvas?.getFrameEl) return null
  return editor.Canvas.getFrameEl()
}

/**
 * Clean & standard viewport adjustment for GrapesJS devices.
 * Sets standard CSS overrides inside iframe without breaking outer canvas transforms.
 */
export function applyDeviceViewport(editor, deviceName) {
  const frameEl = getCanvasFrameEl(editor)
  if (!frameEl) return

  const frameDoc = frameEl.contentDocument
  if (!frameDoc) return

  let metaVP = frameDoc.getElementById('tc-viewport-meta')
  if (!metaVP) {
    metaVP = frameDoc.createElement('meta')
    metaVP.id = 'tc-viewport-meta'
    metaVP.name = 'viewport'
    const existing = frameDoc.querySelector('meta[name="viewport"]')
    if (existing) existing.remove()
    frameDoc.head?.appendChild(metaVP)
  }

  const targetWidths = { Mobile: '375', Tablet: '768' }
  const vpWidth = targetWidths[deviceName] ?? ''
  metaVP.content = vpWidth
    ? `width=${vpWidth}, initial-scale=1.0`
    : 'width=device-width, initial-scale=1.0'

  let deviceOverride = frameDoc.getElementById('tc-device-override')
  if (!deviceOverride) {
    deviceOverride = frameDoc.createElement('style')
    deviceOverride.id = 'tc-device-override'
    frameDoc.head?.appendChild(deviceOverride)
  }

  if (deviceName === 'Mobile') {
    deviceOverride.textContent = `
      .tc-nav-hamburger {
        display: flex !important;
        font-size: 24px !important;
        cursor: pointer !important;
      }
      header, [data-tc-type="section"] > header {
        position: relative !important;
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 12px 16px !important;
      }
      header nav, header > nav,
      header nav[style], header > nav[style] {
        display: none !important;
        flex-direction: column !important;
        width: 100% !important;
        order: 3 !important;
        background: #fff !important;
        padding: 12px 16px !important;
        border-top: 1px solid #e2e8f0 !important;
        gap: 8px !important;
      }
      header nav a, header > nav a {
        width: 100% !important;
        text-align: center !important;
        padding: 10px 16px !important;
        display: block !important;
        white-space: normal !important;
      }
      .tc-nav-toggle:checked ~ nav,
      .tc-nav-toggle:checked ~ nav[style] {
        display: flex !important;
      }
      h1 { font-size: clamp(24px, 8vw, 32px) !important; }
      h2 { font-size: clamp(20px, 6vw, 26px) !important; }
    `
  } else if (deviceName === 'Tablet') {
    deviceOverride.textContent = `
      header, [data-tc-type="section"] > header {
        padding: 16px 20px !important;
      }
      header nav { gap: 16px !important; }
      section { padding: 48px 24px !important; }
    `
  } else {
    deviceOverride.textContent = `html, body { overflow-x: hidden; max-width: 100%; }`
  }

  const frameBody = frameDoc.body
  if (frameBody) {
    frameBody.classList.add('tc-device-repaint')
    requestAnimationFrame(() => frameBody.classList.remove('tc-device-repaint'))
  }

  // Auto align components & keep images responsive for selected device
  autoAlignCanvasComponents(editor, deviceName)
}

/**
 * Automatically adjusts element alignment and images when device mode switches.
 * Ensures absolute-positioned elements (buttons, cards, hotspots) and images
 * stay within visible bounds and scale responsively on Mobile/Tablet screens.
 */
export function autoAlignCanvasComponents(editor, deviceName) {
  const frameEl = getCanvasFrameEl(editor)
  const doc = frameEl?.contentDocument
  if (!doc || !doc.body) return

  const isMobile = deviceName === 'Mobile'
  const isTablet = deviceName === 'Tablet'
  const targetWidth = isMobile ? 375 : isTablet ? 768 : 0

  // 1. Ensure global image responsiveness inside canvas
  const images = doc.querySelectorAll('img')
  images.forEach((img) => {
    img.style.maxWidth = '100%'
    img.style.height = 'auto'
    img.style.objectFit = 'contain'
  })

  // 2. Adjust absolute positioned components (buttons, cards, hotspots, etc.)
  const absElements = doc.querySelectorAll(
    '[style*="position: absolute"], [style*="position:absolute"], [data-tc-type="hotspot"]'
  )

  absElements.forEach((el) => {
    if (deviceName === 'Desktop' || deviceName === 'Custom' || targetWidth === 0) {
      // Restore desktop original style
      if (el.dataset.tcDesktopLeft !== undefined) {
        el.style.left = el.dataset.tcDesktopLeft
      }
      if (el.dataset.tcDesktopMaxWidth !== undefined) {
        el.style.maxWidth = el.dataset.tcDesktopMaxWidth
      }
      return
    }

    // Cache initial desktop style
    if (el.dataset.tcDesktopLeft === undefined) {
      el.dataset.tcDesktopLeft = el.style.left || ''
    }
    if (el.dataset.tcDesktopMaxWidth === undefined) {
      el.dataset.tcDesktopMaxWidth = el.style.maxWidth || ''
    }

    const origLeftStr = el.dataset.tcDesktopLeft || el.style.left || ''
    if (origLeftStr && origLeftStr.endsWith('px')) {
      const origLeft = parseFloat(origLeftStr)
      if (!isNaN(origLeft) && origLeft > 0) {
        const desktopBaseline = 1200
        const ratio = origLeft / desktopBaseline
        let newLeft = Math.round(ratio * targetWidth)
        const elWidth = el.offsetWidth || 100

        if (newLeft + elWidth > targetWidth - 12) {
          newLeft = Math.max(12, targetWidth - elWidth - 12)
        }
        el.style.left = `${newLeft}px`
      }
    }

    el.style.maxWidth = `calc(${targetWidth}px - 24px)`
  })
}

let heightSyncTimer = null

/** Standard canvas height sync */
export function syncCanvasFrameHeight(editor) {
  if (heightSyncTimer) clearTimeout(heightSyncTimer)
  heightSyncTimer = setTimeout(() => {
    heightSyncTimer = null
    requestAnimationFrame(() => {
      const frameEl = getCanvasFrameEl(editor)
      const doc = frameEl?.contentDocument
      if (!frameEl || !doc?.body) return

      const wrapperEl = doc.querySelector('[data-gjs-type="wrapper"]')

      const naturalH = Math.max(
        wrapperEl?.scrollHeight ?? 0,
        doc.body.scrollHeight,
        doc.documentElement.scrollHeight,
        720,
      )

      const pageFrame = document.querySelector('.tc-page-frame')
      const isFixedHeight = !!(pageFrame?.style.height && pageFrame.style.height !== 'auto')

      if (isFixedHeight) {
        frameEl.style.height = '100%'
        frameEl.style.minHeight = '100%'
        return
      }

      const h = Math.ceil(naturalH) + 2
      frameEl.style.height = `${h}px`
      frameEl.style.minHeight = `${h}px`

      if (pageFrame) {
        pageFrame.style.minHeight = `${Math.max(h, 400)}px`
        const outerWrapper = pageFrame.parentElement
        if (outerWrapper && outerWrapper !== document.body) {
          outerWrapper.style.minHeight = ''
        }
      }

      const frameWrapper = frameEl.parentElement
      const cvCanvas = frameWrapper?.parentElement
      if (cvCanvas) {
        cvCanvas.style.height = ''
        cvCanvas.style.top = '0px'
      }
      if (frameWrapper) frameWrapper.style.top = '0px'
    })
  }, 80)
}

export function setupCanvasEnhancements(editor, onEmptyChange) {
  let alive = true

  const checkEmpty = () => {
    setTimeout(() => {
      if (!alive || !editor?.Pages?.getSelected()) return
      const wrapper = safeGetWrapper(editor)
      const count = wrapper?.components().length || 0
      onEmptyChange?.(count === 0)
    }, 0)
  }

  editor.on('load', checkEmpty)
  editor.on('component:add', checkEmpty)
  editor.on('component:remove', checkEmpty)
  editor.on('page:select', checkEmpty)
  editor.on('canvas:frame:load', checkEmpty)

  const injectCanvasStyles = (frameWin) => {
    if (!frameWin) return
    const doc = frameWin.document
    let canvasStyles = doc.getElementById('tc-canvas-styles')
    if (!canvasStyles) {
      canvasStyles = doc.createElement('style')
      canvasStyles.id = 'tc-canvas-styles'
      doc.head.appendChild(canvasStyles)
    }
    canvasStyles.textContent = `
        html, body { scroll-behavior: smooth !important; }
        body { margin: 0; background: #f4f6fb; }
        [data-gjs-type="wrapper"] { min-height: 0; }
        *:hover { outline: 1px dashed rgba(79, 70, 229, 0.35); outline-offset: 2px; }
        .gjs-selected { outline: 2px solid #2563eb !important; outline-offset: 2px; }
        ${TEXT_SIZE_ALIGN_CANVAS_CSS}
        ${OVERLAY_STACKING_CANVAS_CSS}
        /* Same responsive rules as live SubscriptionPage shadow (WYSIWYG) */
        ${RESPONSIVE_STYLE_RULES}
      `
  }

  editor.on('canvas:frame:load', ({ window: frameWin }) => {
    injectCanvasStyles(frameWin)

    const currentDevice = editor.Devices.getSelected()
    const afterLoad = () => {
      if (!alive) return
      const frame = editor.Canvas.getFrameEl?.()
      if (frame?.contentWindow) injectCanvasStyles(frame.contentWindow)
      const devName = currentDevice ? String(currentDevice.get('name')) : 'Desktop'
      applyDeviceViewport(editor, devName)
      syncCanvasFrameHeight(editor)
    }
    setTimeout(afterLoad, 60)
    setTimeout(afterLoad, 350)
  })

  // Ensure styles exist even if frame:load already fired before this plugin bound
  try {
    const existing = editor.Canvas.getFrameEl?.()
    if (existing?.contentWindow) injectCanvasStyles(existing.contentWindow)
  } catch (_) {
    /* noop */
  }

  const isLiveDrag = () => {
    try {
      if (typeof document !== 'undefined' && document.body.classList.contains('tc-is-dragging')) {
        return true
      }
      if (editor.Commands?.isActive?.('core:component-drag')) return true
      if (editor.Commands?.isActive?.('core:component-resize')) return true
    } catch (_) {
      /* noop */
    }
    return false
  }

  const syncHeightIfIdle = () => {
    if (isLiveDrag()) return
    syncCanvasFrameHeight(editor)
  }

  editor.on('component:add', syncHeightIfIdle)
  editor.on('component:remove', syncHeightIfIdle)
  editor.on('component:update', syncHeightIfIdle)

  editor.on('device:select', (device) => {
    if (!device) return
    const deviceName = String(device.get('name'))

    setTimeout(() => {
      if (!alive) return
      applyDeviceViewport(editor, deviceName)
      autoAlignCanvasComponents(editor, deviceName)
      syncCanvasFrameHeight(editor)
      setTimeout(() => {
        try { editor.Canvas.refresh() } catch (_) { /* noop */ }
      }, 100)
    }, 50)
  })

  getCanvasFrameEl(editor)?.classList.add('tc-canvas-frame')

  let rafHandlesPending = false
  const refreshHandles = () => {
    if (rafHandlesPending) return
    rafHandlesPending = true
    requestAnimationFrame(() => {
      rafHandlesPending = false
      try { editor.Canvas.refresh() } catch (_) { /* noop */ }
    })
  }

  const attachScrollSync = () => {
    const frameEl = editor.Canvas?.getFrameEl?.()
    const frameWin = frameEl?.contentWindow
    if (frameWin) {
      frameWin.addEventListener('scroll', refreshHandles, { passive: true })
    }
  }

  editor.on('canvas:frame:load', attachScrollSync)
  editor.on('page:select', () => setTimeout(attachScrollSync, 100))
  setTimeout(attachScrollSync, 500)

  // NEVER Canvas.refresh during live drag/resize — that freezes Grapes sorter
  editor.on('component:drag:end', refreshHandles)
  editor.on('component:resize:end', refreshHandles)
  editor.on('undo', refreshHandles)
  editor.on('redo', refreshHandles)

  const resolveComponent = (payload) =>
    payload?.component ||
    (payload?.getStyle ? payload : null) ||
    editor.getSelected?.()

  // Flow CTAs: only heal on resize end / select — NOT on drag end
  // (absolute drag mode must be free to move them without snapping back)
  const protectFlowButton = (payload) => {
    if (!alive) return
    const component = resolveComponent(payload)
    if (!component) return
    try {
      if (wasIntentionallyAbsolute(component)) {
        configureFlowButtonResizable(component)
        return
      }
      if (!isFlowLayoutButton(component)) return
      keepFlowButtonInFlow(component)
      configureFlowButtonResizable(component)
    } catch (_) {
      /* noop */
    }
  }

  const alignSizedText = (payload) => {
    if (!alive) return
    const component = resolveComponent(payload)
    if (!component) return
    try {
      if (isFlowLayoutButton(component) && !wasIntentionallyAbsolute(component)) {
        keepFlowButtonInFlow(component)
        return
      }
      applyTextSizeAlignment(component)
    } catch (_) {
      /* noop */
    }
  }

  editor.on('component:selected', (component) => {
    if (!alive || !component) return
    configureFlowButtonResizable(component)
  })

  editor.on('component:resize:end', protectFlowButton)
  editor.on('component:resize:end', (component) => {
    if (!alive) return
    const cmp = resolveComponent(component)
    if (cmp?.getAttributes?.()?.['data-tc-type'] !== 'hotspot') return
    try {
      const style = cmp.getStyle?.() || {}
      const w = String(style.width || '')
      const h = String(style.height || '')
      if (w !== '100%' || h !== '100%') {
        const attrs = { ...(cmp.getAttributes?.() || {}) }
        if (attrs['data-tc-cover-full']) {
          delete attrs['data-tc-cover-full']
          cmp.setAttributes(attrs)
        }
      }
      healEditorHotspot(cmp, editor)
    } catch (_) {
      /* noop */
    }
  })
  editor.on('component:styleUpdate', (component) => {
    if (!component) return
    // Never mutate layout mid-drag/resize — fights Grapes absolute sorter
    if (isLiveDrag()) return
    if (isFlowLayoutButton(component) && !wasIntentionallyAbsolute(component)) {
      protectFlowButton(component)
      return
    }
    const style = component.getStyle?.() || {}
    if (style.width || style.height || style['min-height']) alignSizedText(component)
  })

  editor.on('load', () => {
    setTimeout(() => {
      if (!alive) return
      healFlowButtonsInEditor(editor)
    }, 100)
  })
  editor.on('page:select', () => {
    setTimeout(() => {
      if (!alive) return
      healFlowButtonsInEditor(editor)
    }, 80)
  })

  return () => {
    alive = false
  }
}

export function setCanvasZoom(editor, zoom) {
  editor.Canvas?.setZoom(zoom)
}

export function getCanvasZoom(editor) {
  return editor.Canvas?.getZoom() ?? 100
}
