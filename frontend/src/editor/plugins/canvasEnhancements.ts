import type { Editor } from 'grapesjs'
import { RESPONSIVE_STYLE_RULES } from '../services/exportSite'
import { safeGetWrapper } from '../utils/editorUtils'

/**
 * Returns the pixel width for a device name.
 * Desktop has no constraint (returns empty string).
 */
function getDeviceViewportWidth(deviceName: string): string {
  if (deviceName === 'Mobile') return '375'
  if (deviceName === 'Tablet') return '768'
  return '' // Desktop — unconstrained
}

function getCanvasFrameEl(editor: Editor): HTMLIFrameElement | null {
  if (!editor?.Canvas?.getFrameEl) return null
  return editor.Canvas.getFrameEl() as HTMLIFrameElement | null
}

/**
 * Applies device-specific responsive behavior to the GrapesJS canvas iframe.
 */
export function applyDeviceViewport(editor: Editor, deviceName: string) {
  const frameEl = getCanvasFrameEl(editor)
  if (!frameEl) return

  const vpWidth = getDeviceViewportWidth(deviceName)

  if (frameEl) {
    if (vpWidth) {
      frameEl.style.width = `${vpWidth}px`
    } else {
      frameEl.style.width = ''
    }
  }

  const frameDoc = frameEl?.contentDocument
  if (frameDoc) {
    let metaVP = frameDoc.getElementById('tc-viewport-meta') as HTMLMetaElement | null
    if (!metaVP) {
      metaVP = frameDoc.createElement('meta') as HTMLMetaElement
      metaVP.id = 'tc-viewport-meta'
      metaVP.name = 'viewport'
      const existing = frameDoc.querySelector('meta[name="viewport"]')
      if (existing) existing.remove()
      frameDoc.head?.appendChild(metaVP)
    }
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
        html, body {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
        }
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
        header nav,
        header > nav,
        header nav[style],
        header > nav[style] {
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
        [data-tc-type="section"], section, footer {
          padding: 32px 16px !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
        }
        section[style*="display:flex"],
        section[style*="display: flex"] {
          flex-direction: column !important;
          gap: 24px !important;
        }
        section > div[style*="display:flex"],
        section > div[style*="display: flex"] {
          flex-direction: column !important;
          align-items: stretch !important;
        }
        a[data-tc-type="button"] {
          display: block !important;
          width: 100% !important;
          text-align: center !important;
          box-sizing: border-box !important;
          white-space: normal !important;
        }
        div[style*="grid-template-columns:repeat(auto-fit"],
        div[style*="grid-template-columns: repeat(auto-fit"] {
          grid-template-columns: 1fr !important;
        }
        h1 { font-size: clamp(24px, 8vw, 32px) !important; }
        h2 { font-size: clamp(20px, 6vw, 26px) !important; }
      `
    } else if (deviceName === 'Tablet') {
      deviceOverride.textContent = `
        html, body {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
        }
        header, [data-tc-type="section"] > header {
          padding: 16px 20px !important;
        }
        header nav {
          gap: 16px !important;
        }
        section {
          padding: 48px 24px !important;
        }
      `
    } else {
      deviceOverride.textContent = `
        html, body { overflow-x: hidden; max-width: 100%; }
      `
    }

    const frameBody = frameDoc.body
    if (frameBody) {
      frameBody.classList.add('tc-device-repaint')
      requestAnimationFrame(() => frameBody.classList.remove('tc-device-repaint'))
    }
  }
}

let heightSyncTimer: ReturnType<typeof setTimeout> | null = null

/** Grow the preview iframe to fit page content without inflating scroll height. */
export function syncCanvasFrameHeight(editor: Editor) {
  if (heightSyncTimer) clearTimeout(heightSyncTimer)
  heightSyncTimer = setTimeout(() => {
    heightSyncTimer = null
    requestAnimationFrame(() => {
      const frameEl = getCanvasFrameEl(editor)
      const doc = frameEl?.contentDocument
      if (!frameEl || !doc?.body) return

      const wrapper = doc.querySelector('[data-gjs-type="wrapper"]') as HTMLElement | null

      // Read natural content height — do NOT temporarily set iframe to 9999px (breaks 100vh math).
      const contentHeight = Math.max(
        wrapper?.scrollHeight ?? 0,
        doc.body.scrollHeight,
        doc.documentElement.scrollHeight,
        720,
      )

      const pageFrame = document.querySelector('.tc-page-frame') as HTMLElement | null
      const isFixedHeight = pageFrame && pageFrame.style.height && pageFrame.style.height !== 'auto'

      if (isFixedHeight) {
        // If Custom Height is set, let CSS handle it
        frameEl.style.height = '100%'
        frameEl.style.minHeight = '100%'
        // don't overwrite pageFrame minHeight
      } else {
        const height = Math.ceil(contentHeight) + 2
        frameEl.style.height = `${height}px`
        frameEl.style.minHeight = `${height}px`
        if (pageFrame) {
          pageFrame.style.minHeight = `${Math.max(height, 400)}px`
        }
      }

      const frameWrapper = frameEl.closest('.gjs-frame-wrapper') as HTMLElement | null
      if (frameWrapper) {
        frameWrapper.style.top = '0px'
      }

      const canvasEl = frameEl.closest('.gjs-cv-canvas') as HTMLElement | null
      if (canvasEl) {
        canvasEl.style.top = '0px'
      }
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
        body { margin: 0; background: #f4f6fb; }
        [data-gjs-type="wrapper"] { min-height: 0; }
        *:hover { outline: 1px dashed rgba(79, 70, 229, 0.35); outline-offset: 2px; }
        .gjs-selected { outline: 2px solid #2563eb !important; outline-offset: 2px; }
        ${RESPONSIVE_STYLE_RULES}
      `

    const currentDevice = editor.Devices.getSelected()
    const afterLoad = () => {
      if (!alive) return
      if (currentDevice) {
        applyDeviceViewport(editor, String(currentDevice.get('name')))
      }
      syncCanvasFrameHeight(editor)
    }
    setTimeout(afterLoad, 50)
    setTimeout(afterLoad, 300)
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
      syncCanvasFrameHeight(editor)
    }, 50)
  })

  getCanvasFrameEl(editor)?.classList.add('tc-canvas-frame')

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
