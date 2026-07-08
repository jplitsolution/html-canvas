import type { Editor } from 'grapesjs'
import { registerSectionBlocks } from './sections'
import { registerComponentBlocks } from './components'
import { registerFunnelBlocks } from './funnelBlocks'

export function registerAllBlocks(editor: Editor, funnelPageType?: string) {
  registerSectionBlocks(editor)
  registerComponentBlocks(editor)
  registerFunnelBlocks(editor, funnelPageType)

  // Remove any legacy/preset blocks if they exist
  ;['link-block', 'quote', 'text-basic', 'text-section', 'link', 'quote-block'].forEach((id) => {
    if (editor.BlockManager.get(id)) editor.BlockManager.remove(id)
  })
}
