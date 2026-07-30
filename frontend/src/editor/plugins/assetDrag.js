import { ensureBlockManagerMounted } from './dragAndDrop'
import { buildImageHtml } from '../utils/imageHtml'
import { lockInsertion, unlockInsertion } from '../utils/insertionLock'

function getTempDropModel(editor, content) {
  const comps = editor.Components.getComponents()
  const opts = {
    avoidChildren: 1,
    avoidStore: 1,
    avoidUpdateStyle: 1,
    temporary: true,
  }

  const tempModel = comps.add(content, opts)
  const removed = comps.remove(tempModel, opts)
  const dropModel = Array.isArray(removed) ? removed[0] : removed
  if (!dropModel) return null

  const view = dropModel.view
  view?.$el?.data('model', dropModel)
  return dropModel
}

function getAssetSorter(editor) {
  ensureBlockManagerMounted(editor)
  const bm = editor.BlockManager
  return bm.blocksView?.getSorter?.()
}

/** Drag uploaded asset onto canvas — drops as <img>, not plain URL text */
export function startAssetDrag(editor, src, ev) {
  if (ev.button !== 0) return false

  const sorter = getAssetSorter(editor)
  if (!sorter) return false

  const content = buildImageHtml(src)
  const dropModel = getTempDropModel(editor, content)
  const el = dropModel?.view?.el
  if (!el) return false

  const bm = editor.BlockManager
  const startX = ev.clientX
  const startY = ev.clientY
  let isDragStarted = false

  const onMove = (moveEv) => {
    if (!isDragStarted && (Math.abs(moveEv.clientX - startX) > 4 || Math.abs(moveEv.clientY - startY) > 4)) {
      isDragStarted = true
      lockInsertion()
      editor.Canvas.refresh()
      editor.em.set({
        dragResult: null,
        dragSource: { content },
      })
      sorter.startSort([{ element: el, dragSource: { content } }])
      document.body.classList.add('tc-is-dragging')
      window.dispatchEvent(new CustomEvent('tc-asset-drag-start', { detail: { src } }))
    }
  }

  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    if (isDragStarted) {
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
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  return true
}

export function setupAssetCanvasDrop(editor) {
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
