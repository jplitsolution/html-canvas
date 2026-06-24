import type { Editor } from 'grapesjs'
import { setupDragPreview } from './dragPreview'

export interface DragDebugState {
  draggedItem: string | null
  selectedItem: string | null
  editorState: string
  componentCount: number
  lastEvent: string
  dropSuccess: boolean
  isDragging: boolean
  isOverCanvas: boolean
}

const defaultDebug: DragDebugState = {
  draggedItem: null,
  selectedItem: null,
  editorState: 'idle',
  componentCount: 0,
  lastEvent: '—',
  dropSuccess: false,
  isDragging: false,
  isOverCanvas: false,
}

type DebugListener = (state: DragDebugState) => void

let debugListener: DebugListener | null = null
let debugState: DragDebugState = { ...defaultDebug }

function log(stage: string, detail?: unknown) {
  if (detail !== undefined) {
    console.log(`[TC DnD] ${stage}`, detail)
  } else {
    console.log(`[TC DnD] ${stage}`)
  }
}

function patchDebug(patch: Partial<DragDebugState>) {
  debugState = { ...debugState, ...patch }
  debugListener?.(debugState)
}

function getComponentCount(editor: Editor): number {
  return editor.getWrapper()?.components().length ?? 0
}

function getSelectedLabel(editor: Editor): string | null {
  const sel = editor.getSelected()
  if (!sel || sel.get('type') === 'wrapper') return null
  const tag = (sel.get('tagName') || sel.get('type') || 'component').toLowerCase()
  return tag
}

const DROPPABLE_CONTAINER_TAGS = ['section', 'header', 'footer', 'nav', 'main', 'div', 'article']

type BlockManagerInternal = Editor['BlockManager'] & {
  blocksView?: { sorter?: unknown }
}

/** GrapesJS caches the iframe body inside BlocksView.sorter — reset when the active page changes */
export function refreshBlockSorter(editor: Editor) {
  const view = (editor.BlockManager as BlockManagerInternal).blocksView
  if (!view?.sorter) return
  delete view.sorter
  log('block sorter reset for active page frame')
}

function ensureDroppableTargets(editor: Editor) {
  const wrapper = editor.getWrapper()
  if (!wrapper) return

  wrapper.set({
    droppable: true,
    draggable: false,
    highlightable: true,
    selectable: true,
    hoverable: true,
  })

  wrapper.components().forEach((cmp) => {
    const type = cmp.get('type') || ''
    const tag = (cmp.get('tagName') || '').toLowerCase()
    if (type === 'page' || tag === 'body' || DROPPABLE_CONTAINER_TAGS.includes(tag)) {
      cmp.set({
        droppable: true,
        draggable: tag !== 'body' && type !== 'page',
        selectable: true,
        hoverable: true,
      })
    }
  })

  log('droppable targets configured', {
    wrapperDroppable: wrapper.get('droppable'),
    childCount: wrapper.components().length,
  })
}

function onActivePageFrameReady(editor: Editor) {
  refreshBlockSorter(editor)
  ensureDroppableTargets(editor)
  patchDebug({ componentCount: getComponentCount(editor), lastEvent: 'page frame ready' })
}

/** Ensure canvas accepts drops and components can be moved */
export function setupDragAndDrop(editor: Editor, onDebug?: DebugListener) {
  debugListener = onDebug ?? null
  debugState = { ...defaultDebug, componentCount: getComponentCount(editor) }
  patchDebug({})

  editor.on('load', () => {
    ensureDroppableTargets(editor)
    patchDebug({ componentCount: getComponentCount(editor), editorState: 'loaded' })
  })

  editor.on('component:add', (component) => {
    const type = component.get('type')
    const tag = (component.get('tagName') || '').toLowerCase()
    if (type === 'wrapper') return

    log('component:add', { type, tag, id: component.getId() })
    patchDebug({
      componentCount: getComponentCount(editor),
      lastEvent: `component:add (${tag || type})`,
      editorState: 'component added',
    })

    // Defer modifications to prevent layout conflicts during the initial add/render lifecycle
    setTimeout(() => {
      if (!editor.getWrapper()) return
      component.set({
        draggable: true,
        droppable: ['section', 'header', 'footer', 'nav', 'main', 'div'].includes(tag),
        removable: true,
        copyable: true,
        selectable: true,
        hoverable: true,
        stylable: true,
      })
    }, 0)
  })

  editor.on('component:remove', () => {
    patchDebug({ componentCount: getComponentCount(editor), lastEvent: 'component:remove' })
  })

  editor.on('component:selected', () => {
    patchDebug({ selectedItem: getSelectedLabel(editor) })
  })

  editor.on('component:deselected', () => {
    patchDebug({ selectedItem: null })
  })

  // Block drag lifecycle (GrapesJS native events)
  editor.on('block:drag:start', (block) => {
    const label = block.get('label') || block.get('id')
    log('drag start', { block: label })
    document.body.classList.add('tc-is-dragging')
    patchDebug({
      draggedItem: String(label),
      isDragging: true,
      dropSuccess: false,
      isOverCanvas: false,
      lastEvent: 'block:drag:start',
      editorState: 'dragging',
    })
  })

  const cleanupPreview = setupDragPreview(editor, (over) => {
    patchDebug({ isOverCanvas: over, lastEvent: over ? 'over canvas' : 'off canvas' })
  })

  editor.on('block:drag', () => {
    patchDebug({ lastEvent: 'block:drag' })
  })

  editor.on('block:drag:stop', (component, block) => {
    const label = block?.get('label') || block?.get('id') || 'unknown'
    const success = !!component
    log('drag stop', { block: label, success, component: component?.get('tagName') })
    setTimeout(() => {
      document.body.classList.remove('tc-is-dragging')
    }, 50)
    document.body.classList.remove('tc-canvas-drop-over')

    patchDebug({
      draggedItem: null,
      isDragging: false,
      isOverCanvas: false,
      dropSuccess: success,
      componentCount: getComponentCount(editor),
      selectedItem: success ? getSelectedLabel(editor) : debugState.selectedItem,
      lastEvent: success ? 'block:drag:stop ✓' : 'block:drag:stop ✗',
      editorState: success ? 'drop success' : 'drop failed',
    })

    if (success) {
      window.dispatchEvent(new CustomEvent('tc-drop-success', { detail: { label } }))
      // Force immediate canvas update
      editor.Canvas.refresh()
    }
  })

  // Canvas droppable lifecycle
  editor.on('canvas:dragenter', () => {
    log('canvas drag enter')
    document.body.classList.add('tc-canvas-drop-over')
    patchDebug({ isOverCanvas: true, lastEvent: 'canvas:dragenter' })
  })

  editor.on('canvas:dragover', () => {
    patchDebug({ isOverCanvas: true, lastEvent: 'canvas:dragover' })
  })

  editor.on('canvas:dragleave', () => {
    log('canvas drag leave')
    document.body.classList.remove('tc-canvas-drop-over')
    patchDebug({ isOverCanvas: false, lastEvent: 'canvas:dragleave' })
  })

  editor.on('canvas:drop', (_dt, model) => {
    log('canvas drop', { model: model?.get('tagName') })
    document.body.classList.remove('tc-canvas-drop-over')
    patchDebug({
      isOverCanvas: false,
      lastEvent: 'canvas:drop',
      editorState: 'canvas dropped',
    })
  })

  editor.on('canvas:dragend', () => {
    document.body.classList.remove('tc-canvas-drop-over')
    patchDebug({ isOverCanvas: false, lastEvent: 'canvas:dragend' })
  })

  // Block sorter + droppable targets must target the newly selected page iframe
  editor.on('page:select', () => onActivePageFrameReady(editor))
  editor.on('canvas:frame:load', () => onActivePageFrameReady(editor))

  return () => {
    cleanupPreview?.()
  }
}

/** GrapesJS init runs before React renders #tc-blocks-mount — mount on first use */
export function ensureBlockManagerMounted(editor: Editor) {
  const mount = document.getElementById('tc-blocks-mount')
  if (!mount) return false

  if (!mount.querySelector('.gjs-block')) {
    editor.BlockManager.render()
  }

  return mount.querySelectorAll('.gjs-block').length > 0
}

export function ensureLayerManagerMounted(editor: Editor) {
  const mount = document.getElementById('tc-layers-panel')
  if (!mount) return false

  if (!mount.querySelector('.gjs-layer')) {
    editor.LayerManager.render()
  }

  return true
}

export function filterBlockElements(
  editor: Editor | null,
  tab: 'sections' | 'components',
  query: string
) {
  if (!editor) return

  ensureBlockManagerMounted(editor)

  const mount = document.getElementById('tc-blocks-mount')
  if (!mount) return

  const catClass = tab === 'sections' ? 'tc-cat-section' : 'tc-cat-component'
  const q = query.trim().toLowerCase()

  mount.querySelectorAll('.gjs-block').forEach((el) => {
    const htmlEl = el as HTMLElement
    const isCategory = htmlEl.classList.contains(catClass)
    const label = htmlEl.querySelector('.gjs-block-label')?.textContent?.toLowerCase() || ''
    const matchesSearch = !q || label.includes(q)
    htmlEl.style.display = isCategory && matchesSearch ? '' : 'none'
  })
}

export function getDragDebugState(): DragDebugState {
  return debugState
}
