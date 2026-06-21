import type { Editor } from 'grapesjs'
import { buildImageHtml } from './imageHtml'
import { canInsert } from './insertionLock'

/** Insert a rendered <img> on the canvas (not a URL text node) */
export function insertImageComponent(editor: Editor, src: string, alt = 'Image') {
  if (!src?.trim()) return null
  if (!canInsert()) {
    console.log('[TC Lock] Image insertion blocked by lock')
    return null
  }

  const wrapper = editor.getWrapper()
  const selected = editor.getSelected()
  const tag = (selected?.get('tagName') || '').toLowerCase()

  // Replace src when an image is already selected
  if (tag === 'img' && selected) {
    selected.addAttributes({ src, alt })
    editor.select(selected)
    return selected
  }

  const content = buildImageHtml(src, alt)
  let target = wrapper
  let at: number | undefined

  if (selected?.parent() === wrapper) {
    target = selected.parent() || wrapper
    at = selected.index() + 1
  }

  const added = target?.append(content, at !== undefined ? { at } : undefined)
  const component = Array.isArray(added) ? added[0] : added
  if (component) editor.select(component)
  return component ?? null
}
