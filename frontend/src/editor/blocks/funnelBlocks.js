import { thumbnails } from './thumbnails'
import { FUNNEL_PAGE_GUIDES } from '../utils/funnelGuide'

/**
 * Registers required + optional flow elements of a funnel page (e.g. "Get OTP button",
 * "Subscribe button") as draggable blocks, so clients can re-add any element they
 * accidentally deleted. Blocks carry the `tc-cat-flow` class for sidebar filtering.
 */
export function registerFunnelBlocks(editor, funnelPageType) {
  if (!funnelPageType) return
  const guide = FUNNEL_PAGE_GUIDES[funnelPageType]
  if (!guide) return

  const parts = [
    ...(guide.required || []).map((req) => ({ ...req, category: 'Required parts' })),
    ...(guide.optional || []).map((opt) => ({ ...opt, category: 'Flow parts' })),
  ]
  if (parts.length === 0) return

  parts.forEach((req) => {
    const blockId = `flow-${req.id}`
    if (editor.BlockManager.get(blockId)) editor.BlockManager.remove(blockId)

    editor.BlockManager.add(blockId, {
      label: req.label,
      category: req.category,
      media: thumbnails[req.thumb] ?? thumbnails.button,
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
