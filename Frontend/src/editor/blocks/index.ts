import type { Editor } from 'grapesjs'
import { registerSectionBlocks } from './sections'
import { registerComponentBlocks } from './components'

export function registerAllBlocks(editor: Editor) {
  registerSectionBlocks(editor)
  registerComponentBlocks(editor)

  // Remove any legacy/preset blocks if they exist
  ;['link-block', 'quote', 'text-basic', 'text-section', 'link', 'quote-block'].forEach((id) => {
    if (editor.BlockManager.get(id)) editor.BlockManager.remove(id)
  })
}
