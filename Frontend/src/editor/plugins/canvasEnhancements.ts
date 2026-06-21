import type { Editor } from 'grapesjs'
import { RESPONSIVE_STYLE_RULES } from '../services/exportSite'

export function setupCanvasEnhancements(editor: Editor, onEmptyChange?: (empty: boolean) => void) {
  const checkEmpty = () => {
    const wrapper = editor.getWrapper()
    const count = wrapper?.components().length || 0
    onEmptyChange?.(count === 0)
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
  })

  editor.Canvas.getFrameEl()?.classList.add('tc-canvas-frame')
}

export function setCanvasZoom(editor: Editor, zoom: number) {
  editor.Canvas.setZoom(zoom)
}

export function getCanvasZoom(editor: Editor) {
  return editor.Canvas.getZoom()
}
