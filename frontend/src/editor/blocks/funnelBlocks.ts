import type { Editor } from 'grapesjs'
import { thumbnails } from './thumbnails'
import { FUNNEL_PAGE_GUIDES, type FunnelPageType } from '../utils/funnelGuide'

/**
 * Registers the required flow elements of a funnel page (e.g. "Get OTP button",
 * "Verify button") as draggable blocks, so clients can re-add any element they
 * accidentally deleted. Blocks carry the `tc-cat-flow` class for sidebar filtering.
 */
export function registerFunnelBlocks(editor: Editor, funnelPageType?: string) {
  if (!funnelPageType) return
  const guide = FUNNEL_PAGE_GUIDES[funnelPageType as FunnelPageType]
  if (!guide || guide.required.length === 0) return

  guide.required.forEach((req) => {
    const blockId = `flow-${req.id}`
    if (editor.BlockManager.get(blockId)) editor.BlockManager.remove(blockId)

    editor.BlockManager.add(blockId, {
      label: req.label,
      category: 'Required parts',
      media: thumbnails[(req.thumb as keyof typeof thumbnails)] ?? thumbnails.button,
      content: req.snippet,
      select: true,
      activate: true,
      attributes: {
        class: 'tc-cat-flow',
        'data-block-id': blockId,
        title: `${req.label} — ${req.why}`,
      },
    })
  })
}
