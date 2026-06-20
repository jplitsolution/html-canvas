import type { Editor } from 'grapesjs'
import type { Block } from 'grapesjs'

type OverCanvasListener = (over: boolean) => void

let previewEl: HTMLDivElement | null = null
let placerLabelEl: HTMLDivElement | null = null
let activeBlock: Block | null = null
let onOverCanvas: OverCanvasListener | null = null

function isPointOverCanvas(editor: Editor, x: number, y: number): boolean {
  const frame = editor.Canvas.getFrameEl()
  if (!frame) return false
  const rect = frame.getBoundingClientRect()
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function movePreview(editor: Editor, clientX: number, clientY: number) {
  if (previewEl) {
    previewEl.style.transform = `translate(${clientX + 14}px, ${clientY + 14}px)`
  }

  const over = isPointOverCanvas(editor, clientX, clientY)
  document.body.classList.toggle('tc-canvas-drop-over', over)
  onOverCanvas?.(over)
}

function enhanceCanvasPlacer(editor: Editor, block: Block) {
  const label = String(block.get('label') || block.get('id') || 'Block')
  const media = block.get('media') as string | undefined
  const placer = editor.Canvas.getPlacerEl()
  if (!placer) return

  placer.classList.add('tc-placer-active')
  const inner = placer.querySelector('.gjs-placeholder-int') as HTMLElement | null
  if (!inner) return

  if (!placerLabelEl) {
    placerLabelEl = document.createElement('div')
    placerLabelEl.className = 'tc-placer-preview'
    inner.appendChild(placerLabelEl)
  }

  placerLabelEl.innerHTML = `
    ${media ? `<div class="tc-placer-preview__media">${media}</div>` : ''}
    <div class="tc-placer-preview__label">${label}</div>
  `
}

function clearCanvasPlacer(editor: Editor) {
  const placer = editor.Canvas.getPlacerEl()
  placer?.classList.remove('tc-placer-active')
  placerLabelEl?.remove()
  placerLabelEl = null
}

function createFloatingPreview(block: Block) {
  const label = String(block.get('label') || block.get('id') || 'Block')
  const media = block.get('media') as string | undefined

  previewEl = document.createElement('div')
  previewEl.className = 'tc-drag-preview'
  previewEl.innerHTML = `
    ${media ? `<div class="tc-drag-preview__media">${media}</div>` : ''}
    <div class="tc-drag-preview__label">${label}</div>
  `
  previewEl.style.transform = 'translate(-9999px, -9999px)'
  document.body.appendChild(previewEl)
}

function cleanupPreview(editor: Editor) {
  previewEl?.remove()
  previewEl = null
  activeBlock = null
  clearCanvasPlacer(editor)
  document.body.classList.remove('tc-canvas-drop-over')
  document.querySelectorAll('.tc-blocks-mount .gjs-block.__dragging').forEach((el) => {
    el.classList.remove('__dragging')
  })
  onOverCanvas?.(false)
}

/** Cursor-following ghost + in-canvas drop preview (GrapesJS only shows a thin line by default) */
export function setupDragPreview(editor: Editor, onOverCanvasChange?: OverCanvasListener) {
  onOverCanvas = onOverCanvasChange ?? null

  const onPointerMove = (e: PointerEvent) => {
    movePreview(editor, e.clientX, e.clientY)
  }

  const onMouseMove = (e: MouseEvent) => {
    movePreview(editor, e.clientX, e.clientY)
  }

  const stopTracking = () => {
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('mousemove', onMouseMove)
  }

  editor.on('block:drag:start', (block) => {
    cleanupPreview(editor)
    activeBlock = block
    createFloatingPreview(block)
    enhanceCanvasPlacer(editor, block)

    const blockId = block.get('id')
    document.querySelectorAll('.tc-blocks-mount .gjs-block').forEach((el) => {
      el.classList.toggle('__dragging', el.getAttribute('data-block-id') === blockId)
    })

    document.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('mousemove', onMouseMove, { passive: true })
  })

  editor.on('block:drag', () => {
    if (activeBlock) enhanceCanvasPlacer(editor, activeBlock)
  })

  editor.on('block:drag:stop', () => {
    stopTracking()
    cleanupPreview(editor)
  })

  editor.on('component:selected', () => {
    if (!activeBlock) clearCanvasPlacer(editor)
  })

  editor.on('sorter:drag', () => {
    if (activeBlock) enhanceCanvasPlacer(editor, activeBlock)
  })

  const onAssetDragStart = (e: Event) => {
    const src = (e as CustomEvent<{ src: string }>).detail?.src
    if (!src) return
    cleanupPreview(editor)
    previewEl = document.createElement('div')
    previewEl.className = 'tc-drag-preview tc-drag-preview--asset'
    previewEl.innerHTML = `<img src="${src.replace(/"/g, '&quot;')}" alt="" class="tc-drag-preview__photo" /><div class="tc-drag-preview__label">Image</div>`
    previewEl.style.transform = 'translate(-9999px, -9999px)'
    document.body.appendChild(previewEl)
    document.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('mousemove', onMouseMove, { passive: true })
  }

  const onAssetDragStop = () => {
    stopTracking()
    cleanupPreview(editor)
  }

  window.addEventListener('tc-asset-drag-start', onAssetDragStart)
  window.addEventListener('tc-asset-drag-stop', onAssetDragStop)
}
