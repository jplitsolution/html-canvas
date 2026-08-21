import { registerSectionBlocks } from './sections'
import { registerComponentBlocks } from './components'
import { registerFunnelBlocks } from './funnelBlocks'

export function registerAllBlocks(editor, funnelPageType, verificationMode) {
  registerSectionBlocks(editor)
  registerComponentBlocks(editor)
  registerFunnelBlocks(editor, funnelPageType, verificationMode)

  // Remove any legacy/preset blocks if they exist
  ;['link-block', 'quote', 'text-basic', 'text-section', 'link', 'quote-block'].forEach((id) => {
    if (editor.BlockManager.get(id)) editor.BlockManager.remove(id)
  })
}
