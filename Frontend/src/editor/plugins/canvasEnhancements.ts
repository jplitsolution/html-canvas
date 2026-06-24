import type { Editor } from 'grapesjs'
import { RESPONSIVE_STYLE_RULES } from '../services/exportSite'

/**
 * Returns the pixel width for a device name.
 * Desktop has no constraint (returns empty string).
 */
function getDeviceViewportWidth(deviceName: string): string {
  if (deviceName === 'Mobile') return '375'
  if (deviceName === 'Tablet') return '768'
  return '' // Desktop — unconstrained
}

/**
 * Applies device-specific responsive behavior to the GrapesJS canvas iframe.
 *
 * CSS media queries inside an iframe respond to the iframe's own viewport width
 * (contentWindow.innerWidth), which equals the iframe element's rendered width.
 * GrapesJS constrains the frame via the .gjs-frame-wrapper CSS, but the actual
 * <iframe> element may remain at the full parent width.
 *
 * This function:
 * 1. Forces the iframe element's width to match the selected device.
 * 2. Updates the <meta name="viewport"> inside the iframe.
 * 3. Re-injects a device-specific @media override style for maximum compatibility.
 */
export function applyDeviceViewport(editor: Editor, deviceName: string) {
  const vpWidth = getDeviceViewportWidth(deviceName)

  // ── Step 1: Force the GrapesJS frame element to the correct pixel width ──
  // This makes contentWindow.innerWidth === device width, triggering media queries.
  const canvasBody = editor.Canvas.getBody()
  const frameEl = editor.Canvas.getFrameEl() as HTMLIFrameElement | null

  if (frameEl) {
    if (vpWidth) {
      // For mobile/tablet: set explicit pixel width on the iframe so its
      // own viewport matches the device, triggering CSS media queries correctly.
      frameEl.style.width = `${vpWidth}px`
    } else {
      // For desktop: restore auto/100% width
      frameEl.style.width = ''
    }
  }

  // ── Step 2: Inject/update the meta viewport inside the iframe ──
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

    // ── Step 3: Inject device-specific style overrides ──
    // These styles enforce the same breakpoints as RESPONSIVE_STYLE_RULES but
    // as absolute rules (without @media) when on mobile, ensuring compatibility
    // even if the iframe viewport meta doesn't work in all GrapesJS versions.
    let deviceOverride = frameDoc.getElementById('tc-device-override') as HTMLStyleElement | null
    if (!deviceOverride) {
      deviceOverride = frameDoc.createElement('style') as HTMLStyleElement
      deviceOverride.id = 'tc-device-override'
      frameDoc.head?.appendChild(deviceOverride)
    }

    if (deviceName === 'Mobile') {
      deviceOverride.textContent = `
        /* Mobile device override — applied directly (no @media needed) */
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
        /* Tablet device override */
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
      // Desktop: clear device overrides
      deviceOverride.textContent = `
        /* Desktop — no device-specific overrides */
        html, body { overflow-x: hidden; max-width: 100%; }
      `
    }

    // Force layout recalculation by briefly toggling a class on body
    const frameBody = frameDoc.body
    if (frameBody) {
      frameBody.classList.add('tc-device-repaint')
      requestAnimationFrame(() => frameBody.classList.remove('tc-device-repaint'))
    }
  }
}


export function setupCanvasEnhancements(editor: Editor, onEmptyChange?: (empty: boolean) => void) {
  const checkEmpty = () => {
    // Defer check to prevent React state update from clashing with the browser paint event
    setTimeout(() => {
      const wrapper = editor.getWrapper()
      const count = wrapper?.components().length || 0
      console.log('[TC Canvas] checkEmpty - component count:', count)
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
    if (!doc.getElementById('tc-canvas-styles')) {
      const style = doc.createElement('style')
      style.id = 'tc-canvas-styles'
      style.textContent = `
        body { margin: 0; background: #f4f6fb; }
        [data-gjs-type="wrapper"] { min-height: 100vh; }
        *:hover { outline: 1px dashed rgba(79, 70, 229, 0.35); outline-offset: 2px; }
        .gjs-selected { outline: 2px solid #4f46e5 !important; outline-offset: 2px; }
        ${RESPONSIVE_STYLE_RULES}
      `
      doc.head.appendChild(style)
    }

    // Apply device viewport on frame load (in case device was already selected)
    const currentDevice = editor.Devices.getSelected()
    if (currentDevice) {
      setTimeout(() => applyDeviceViewport(editor, String(currentDevice.get('name'))), 50)
    }
  })

  // Listen for device changes and update the iframe viewport meta immediately
  editor.on('device:select', (device) => {
    const deviceName = String(device.get('name'))
    // Slight delay to let GrapesJS resize the frame first
    setTimeout(() => applyDeviceViewport(editor, deviceName), 50)
  })

  editor.Canvas.getFrameEl()?.classList.add('tc-canvas-frame')
}

export function setCanvasZoom(editor: Editor, zoom: number) {
  editor.Canvas.setZoom(zoom)
}

export function getCanvasZoom(editor: Editor) {
  return editor.Canvas.getZoom()
}
