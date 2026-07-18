import type { Editor } from 'grapesjs'
import { buildImageHtml } from './imageHtml'
import { canInsert } from './insertionLock'

/** Insert a new <img> on the canvas. Always adds a new component (never replaces). */
export function insertImageComponent(editor: Editor, src: string, alt = 'Image') {
  if (!src?.trim()) return null
  if (!canInsert()) {
    console.log('[TC Lock] Image insertion blocked by lock')
    return null
  }

  const wrapper = editor.getWrapper()
  if (!wrapper) return null

  const selected = editor.getSelected()
  const content = buildImageHtml(src, alt)

  let target = wrapper
  let at: number | undefined

  if (selected) {
    const tagName = (selected.get('tagName') || '').toLowerCase()
    const type = selected.get('type') || ''
    
    // If the selected component is a container (section, row, column, div, cell),
    // insert the image INSIDE it (append to the end of the container)
    const isContainer = ['section', 'header', 'footer', 'div', 'main', 'article'].includes(tagName) || 
                        ['row', 'column', 'cell', 'wrapper'].includes(type)
    
    if (isContainer && type !== 'wrapper') {
      target = selected
      at = undefined
    } else {
      // Otherwise, insert it as a sibling (after the selected component)
      const parent = selected.parent()
      if (parent) {
        target = parent
        at = selected.index() + 1
      }
    }
  }

  const added = target.append(content, at !== undefined ? { at } : undefined)
  const component = Array.isArray(added) ? added[0] : added
  if (component) editor.select(component)
  return component ?? null
}
