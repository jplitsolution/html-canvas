import type { Editor } from 'grapesjs'
import { RESPONSIVE_STYLE_RULES } from '../services/exportSite'
import { safeGetWrapper } from '../utils/editorUtils'

function getCanvasFrameEl(editor: Editor): HTMLIFrameElement | null {
  if (!editor?.Canvas?.getFrameEl) return null
  return editor.Canvas.getFrameEl() as HTMLIFrameElement | null
}

/**
 * Clean & standard viewport adjustment for GrapesJS devices.
 * Sets standard CSS overrides inside iframe without breaking outer canvas transforms.
 */
export function applyDeviceViewport(editor: Editor, deviceName: string) {
  const frameEl = getCanvasFrameEl(editor)
  if (!frameEl) return

  const frameDoc = frameEl.contentDocument
  if (!frameDoc) return

  let metaVP = frameDoc.getElementById('tc-viewport-meta') as HTMLMetaElement | null
  if (!metaVP) {
    metaVP = frameDoc.createElement('meta') as HTMLMetaElement
    metaVP.id = 'tc-viewport-meta'
    metaVP.name = 'viewport'
    const existing = frameDoc.querySelector('meta[name="viewport"]')
    if (existing) existing.remove()
    frameDoc.head?.appendChild(metaVP)
  }

  const targetWidths: Record<string, string> = { Mobile: '375', Tablet: '768' }
  const vpWidth = targetWidths[deviceName] ?? ''
  metaVP.content = vpWidth
    ? `width=${vpWidth}, initial-scale=1.0`
    : 'width=device-width, initial-scale=1.0'

  let deviceOverride = frameDoc.getElementById('tc-device-override') as HTMLStyleElement | null
  if (!deviceOverride) {
    deviceOverride = frameDoc.createElement('style') as HTMLStyleElement
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
export function autoAlignCanvasComponents(editor: Editor, deviceName: string) {
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
  const absElements = doc.querySelectorAll<HTMLElement>(
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
        // Assume desktop width baseline of ~1200px
        const desktopBaseline = 1200
        const ratio = origLeft / desktopBaseline
        let newLeft = Math.round(ratio * targetWidth)
        const elWidth = el.offsetWidth || 100

        // Clamp left position so it fits neatly inside device frame with 12px margin
        if (newLeft + elWidth > targetWidth - 12) {
          newLeft = Math.max(12, targetWidth - elWidth - 12)
        }
        el.style.left = `${newLeft}px`
      }
    }

    el.style.maxWidth = `calc(${targetWidth}px - 24px)`
  })
}

let heightSyncTimer: ReturnType<typeof setTimeout> | null = null

/** Standard canvas height sync */
export function syncCanvasFrameHeight(editor: Editor) {
  if (heightSyncTimer) clearTimeout(heightSyncTimer)
  heightSyncTimer = setTimeout(() => {
    heightSyncTimer = null
    requestAnimationFrame(() => {
      const frameEl = getCanvasFrameEl(editor)
      const doc = frameEl?.contentDocument
      if (!frameEl || !doc?.body) return

      const wrapperEl = doc.querySelector('[data-gjs-type="wrapper"]') as HTMLElement | null

      const naturalH = Math.max(
        wrapperEl?.scrollHeight ?? 0,
        doc.body.scrollHeight,
        doc.documentElement.scrollHeight,
        720,
      )

      const pageFrame = document.querySelector('.tc-page-frame') as HTMLElement | null
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
        const outerWrapper = pageFrame.parentElement as HTMLElement | null
        if (outerWrapper && outerWrapper !== document.body) {
          outerWrapper.style.minHeight = ''
        }
      }

      const frameWrapper = frameEl.parentElement as HTMLElement | null
      const cvCanvas = frameWrapper?.parentElement as HTMLElement | null
      if (cvCanvas) {
        cvCanvas.style.height = ''
        cvCanvas.style.top = '0px'
      }
      if (frameWrapper) frameWrapper.style.top = '0px'
    })
  }, 80)
}

export function setupCanvasEnhancements(editor: Editor, onEmptyChange?: (empty: boolean) => void) {
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

  editor.on('canvas:frame:load', ({ window: frameWin }) => {
    if (!frameWin) return
    const doc = frameWin.document
    let canvasStyles = doc.getElementById('tc-canvas-styles') as HTMLStyleElement | null
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
        ${RESPONSIVE_STYLE_RULES}
      `

    const currentDevice = editor.Devices.getSelected()
    const afterLoad = () => {
      if (!alive) return
      const devName = currentDevice ? String(currentDevice.get('name')) : 'Desktop'
      applyDeviceViewport(editor, devName)
      syncCanvasFrameHeight(editor)
    }
    setTimeout(afterLoad, 60)
    setTimeout(afterLoad, 350)
  })

  editor.on('component:add', () => syncCanvasFrameHeight(editor))
  editor.on('component:remove', () => syncCanvasFrameHeight(editor))
  editor.on('component:update', () => syncCanvasFrameHeight(editor))

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
    const frameEl = editor.Canvas?.getFrameEl?.() as HTMLIFrameElement | null
    const frameWin = frameEl?.contentWindow
    if (frameWin) {
      frameWin.addEventListener('scroll', refreshHandles, { passive: true })
    }
  }

  editor.on('canvas:frame:load', attachScrollSync)
  editor.on('page:select', () => setTimeout(attachScrollSync, 100))
  setTimeout(attachScrollSync, 500)

  editor.on('component:drag', refreshHandles)
  editor.on('component:resize', refreshHandles)
  editor.on('component:styleUpdate', refreshHandles)
  editor.on('component:update:style', refreshHandles)
  editor.on('undo', refreshHandles)
  editor.on('redo', refreshHandles)

  return () => {
    alive = false
  }
}

export function setCanvasZoom(editor: Editor, zoom: number) {
  editor.Canvas?.setZoom(zoom)
}

export function getCanvasZoom(editor: Editor) {
  return editor.Canvas?.getZoom() ?? 100
}
