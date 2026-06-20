import type { Editor } from 'grapesjs'
import { configureAsTextComponent, ensureAllTextEditable } from '../utils/textContent'

/** Sync sidebar with canvas edits; enable double-click inline text editing */
export function setupTextEditing(editor: Editor, onContentChange?: () => void) {
  const notify = () => onContentChange?.()

  editor.on('load', () => {
    ensureAllTextEditable(editor)
  })

  editor.on('project:load', () => {
    setTimeout(() => ensureAllTextEditable(editor), 0)
  })

  editor.on('component:add', (component) => {
    // Defer until nested children are parsed (avoids converting layout shells to text)
    requestAnimationFrame(() => configureAsTextComponent(component))
  })

  editor.on('component:selected', () => {
    const placer = editor.Canvas.getPlacerEl()
    placer?.classList.remove('tc-placer-active')
  })

  editor.on('component:update:content', notify)
  editor.on('rte:disable', notify)
  editor.on('component:update', (component) => {
    if (editor.getSelected() === component) notify()
  })
}
