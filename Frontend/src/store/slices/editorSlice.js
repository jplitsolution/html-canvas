import { createBlock } from '../../constants/blocks'
import { validateLayout } from '../../schemas/layout.schema'
import { normalizeStyles } from '../../schemas/block.schema'
import {
  removeBlockFromLayout, removeBlocksFromLayout, duplicateBlockInLayout,
  duplicateBlocksInLayout, reorderBlocks, moveBlockToParent, countBlocks,
  moveBlockByArrow, wrapBlocksInContainer,
} from '../../utils/blockUtils'
import { createHistoryEntry, pushHistory, applyHistoryEntry } from '../../utils/history'
import { trackEvent } from '../../utils/analytics'
import { createOperation, enqueueOperation, OPERATION_TYPES } from '../../utils/collaboration'

export function createEditorSlice(set, get) {
  return {
    layout: [],
    history: [],
    historyIndex: -1,

    updateLayoutState: (newLayout, action = 'update') => {
      const validated = validateLayout(newLayout)
      const entry = createHistoryEntry(action, validated)
      const { history, historyIndex } = get()
      const { history: newHistory, historyIndex: newIndex } = pushHistory(history, historyIndex, entry, action)

      set({ layout: validated, history: newHistory, historyIndex: newIndex, isDirty: true })
    },

    addBlock: (type, parentId = null, index = -1) => {
      const block = createBlock(type, parentId)
      let layout = get().layout

      if (parentId) {
        const parent = layout.find((b) => b.id === parentId)
        if (parent) {
          const children = [...(parent.children || [])]
          children.splice(index >= 0 ? index : children.length, 0, block.id)
          layout = layout.map((b) => b.id === parentId ? { ...b, children } : b)
        }
      }

      layout = validateLayout([...layout, block])
      get().updateLayoutState(layout, 'addBlock')
      get().setSelectedBlockId(block.id)
      trackEvent('blocksAdded')
      get().announce(`Added ${type} block`)

      const op = createOperation(OPERATION_TYPES.CREATE, { blockId: block.id, type })
      set({ syncQueue: enqueueOperation(get().syncQueue, op) })
      return block.id
    },

    removeBlock: (id) => {
      const layout = validateLayout(removeBlockFromLayout(get().layout, id))
      get().updateLayoutState(layout, 'removeBlock')
      set((s) => ({
        selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
        selectedBlocks: s.selectedBlocks.filter((bid) => bid !== id),
      }))
      get().announce('Block removed')
    },

    duplicateBlock: (id) => {
      const layout = validateLayout(duplicateBlockInLayout(get().layout, id))
      get().updateLayoutState(layout, 'duplicateBlock')
      get().announce('Block duplicated')
    },

    moveBlock: (activeId, overId, parentId = null) => {
      if (activeId === overId) return
      const layout = validateLayout(reorderBlocks(get().layout, activeId, overId, parentId))
      get().updateLayoutState(layout, 'dragging')
    },

    updateBlock: (id, updates, action = 'styleUpdate') => {
      const device = get().previewMode
      const historyAction = updates.content ? 'typing' : action

      const layout = get().layout.map((b) => {
        if (b.id !== id) return b
        const updated = { ...b }
        if (updates.content) updated.content = { ...b.content, ...updates.content }
        if (updates.styles) {
          const normalized = normalizeStyles(b.styles)
          normalized[device] = { ...normalized[device], ...updates.styles }
          updated.styles = normalized
        }
        return updated
      })
      get().updateLayoutState(layout, historyAction)
    },

    updateBlockImmediate: (id, updates) => {
      const device = get().previewMode
      const layout = get().layout.map((b) => {
        if (b.id !== id) return b
        const updated = { ...b }
        if (updates.content) updated.content = { ...b.content, ...updates.content }
        if (updates.styles) {
          const normalized = normalizeStyles(b.styles)
          normalized[device] = { ...normalized[device], ...updates.styles }
          updated.styles = normalized
        }
        return updated
      })
      get().updateLayoutState(layout, 'update')
    },

    undo: () => {
      const { history, historyIndex } = get()
      if (historyIndex <= 0) return
      const newIndex = historyIndex - 1
      const layout = applyHistoryEntry(get().layout, history[newIndex], 'backward')
      set({ layout, historyIndex: newIndex, isDirty: true, selectedBlockId: null, selectedBlocks: [] })
      get().announce('Undo')
    },

    redo: () => {
      const { history, historyIndex } = get()
      if (historyIndex >= history.length - 1) return
      const newIndex = historyIndex + 1
      const layout = applyHistoryEntry(get().layout, history[newIndex], 'forward')
      set({ layout, historyIndex: newIndex, isDirty: true, selectedBlockId: null, selectedBlocks: [] })
      get().announce('Redo')
    },

    deleteMultiple: () => {
      const { selectedBlocks } = get()
      if (!selectedBlocks.length) return
      const layout = validateLayout(removeBlocksFromLayout(get().layout, selectedBlocks))
      get().updateLayoutState(layout, 'removeBlock')
      set({ selectedBlockId: null, selectedBlocks: [] })
      get().announce(`${selectedBlocks.length} blocks deleted`)
    },

    duplicateMultiple: () => {
      const { selectedBlocks } = get()
      if (!selectedBlocks.length) return
      const layout = validateLayout(duplicateBlocksInLayout(get().layout, selectedBlocks))
      get().updateLayoutState(layout, 'duplicateBlock')
      get().announce(`${selectedBlocks.length} blocks duplicated`)
    },

    moveMultiple: (direction) => {
      const { selectedBlocks } = get()
      if (selectedBlocks.length !== 1) return
      const layout = validateLayout(moveBlockByArrow(get().layout, selectedBlocks[0], direction))
      get().updateLayoutState(layout, 'moveBlock')
    },

    wrapInContainer: () => {
      const { selectedBlocks } = get()
      if (selectedBlocks.length < 2) return
      const layout = validateLayout(wrapBlocksInContainer(get().layout, selectedBlocks))
      get().updateLayoutState(layout, 'wrapContainer')
      get().announce('Blocks wrapped in container')
    },

    reparentBlock: (activeId, parentId, index) => {
      const layout = validateLayout(moveBlockToParent(get().layout, activeId, parentId, index))
      get().updateLayoutState(layout, 'dragging')
    },

    getBlockCount: () => countBlocks(get().layout),
  }
}
