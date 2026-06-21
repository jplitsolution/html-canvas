import type { Editor } from 'grapesjs'
import type { Component } from 'grapesjs'
import { ensureBlockManagerMounted } from './dragAndDrop'
import { buildImageHtml } from '../utils/imageHtml'
import { lockInsertion, unlockInsertion } from '../utils/insertionLock'

type BlocksViewLike = {
  getSorter?: () => {
    startSort: (sources: Array<{ element: HTMLElement; dragSource: { content: string } }>) => void
    endDrag: () => void
  }
}

type BlockManagerLike = Editor['BlockManager'] & {
  blocksView?: BlocksViewLike
  endDrag: (cancel?: boolean) => void
}

function getTempDropModel(editor: Editor, content: string): Component | null {
  const comps = editor.Components.getComponents()
  const opts = {
    avoidChildren: 1,
    avoidStore: 1,
    avoidUpdateStyle: 1,
    temporary: true,
  }

  const tempModel = comps.add(content, opts)
  const removed = comps.remove(tempModel, opts)
  const dropModel = (Array.isArray(removed) ? removed[0] : removed) as Component | undefined
  if (!dropModel) return null

  const view = dropModel.view as { el?: HTMLElement; $el?: { data: (k: string, v: unknown) => void } } | undefined
  view?.$el?.data('model', dropModel)
  return dropModel
}

function getAssetSorter(editor: Editor) {
  ensureBlockManagerMounted(editor)
  const bm = editor.BlockManager as BlockManagerLike
  return bm.blocksView?.getSorter?.()
}

/** Drag uploaded asset onto canvas — drops as <img>, not plain URL text */
export function startAssetDrag(editor: Editor, src: string, ev: MouseEvent) {
  if (ev.button !== 0) return false

  lockInsertion()

  const sorter = getAssetSorter(editor)
  if (!sorter) return false

  ev.preventDefault()
  editor.refreshCanvas()

  const content = buildImageHtml(src)
  const dropModel = getTempDropModel(editor, content)
  const el = dropModel?.view?.el as HTMLElement | undefined
  if (!el) return false

  editor.em.set({
    dragResult: null,
    dragSource: { content },
  })

  sorter.startSort([{ element: el, dragSource: { content } }])
  document.body.classList.add('tc-is-dragging')
  window.dispatchEvent(new CustomEvent('tc-asset-drag-start', { detail: { src } }))

  const bm = editor.BlockManager as BlockManagerLike

  const onUp = () => {
    document.removeEventListener('mouseup', onUp)
    sorter.endDrag()
    bm.endDrag(false)
    editor.em.set({ dragResult: null, dragSource: undefined })
    unlockInsertion()
    setTimeout(() => {
      document.body.classList.remove('tc-is-dragging')
    }, 50)
    document.body.classList.remove('tc-canvas-drop-over')
    window.dispatchEvent(new CustomEvent('tc-asset-drag-stop'))
  }

  document.addEventListener('mouseup', onUp)
  return true
}

export function setupAssetCanvasDrop(editor: Editor) {
  editor.on('component:add', (component) => {
    const tag = (component.get('tagName') || '').toLowerCase()
    if (tag !== 'img') return
    component.set({ type: 'image', draggable: true, selectable: true, hoverable: true })
    const attrs = component.getAttributes() || {}
    if (attrs.src && !attrs.alt) {
      component.addAttributes({ alt: 'Image' })
    }
  })
}
