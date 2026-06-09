import { memo, useCallback, Suspense } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Copy, Trash2, Loader2 } from 'lucide-react'
import useStore from '../store/useStore'
import ErrorBoundary from '../components/common/ErrorBoundary'
import { getBlockComponent } from '../registry/index'
import { BLOCK_LABELS } from '../constants/blocks'

function BlockWrapper({ block, isChild = false }) {
  const selectedBlocks = useStore((s) => s.selectedBlocks)
  const toggleBlockSelection = useStore((s) => s.toggleBlockSelection)
  const removeBlock = useStore((s) => s.removeBlock)
  const duplicateBlock = useStore((s) => s.duplicateBlock)

  const isSelected = selectedBlocks.includes(block.id)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { type: block.type, parentId: block.parentId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const handleSelect = useCallback((e) => {
    e.stopPropagation()
    toggleBlockSelection(block.id, e.shiftKey)
  }, [block.id, toggleBlockSelection])

  const handleDelete = useCallback((e) => {
    e.stopPropagation()
    removeBlock(block.id)
  }, [block.id, removeBlock])

  const handleDuplicate = useCallback((e) => {
    e.stopPropagation()
    duplicateBlock(block.id)
  }, [block.id, duplicateBlock])

  const BlockComponent = getBlockComponent(block.type)

  const toolbarBtn = 'p-1 bg-bg-elevated rounded shadow-sm border border-border'

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      className={`group relative rounded-lg transition-all ${
        isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-canvas' : 'hover:ring-1 hover:ring-border-strong'
      } ${isChild ? '' : 'mb-2'}`}
      onClick={handleSelect}
    >
      <div className="absolute -top-3 left-3 z-10 px-2 py-0.5 bg-accent text-accent-fg text-xs font-medium rounded capitalize">
        {BLOCK_LABELS[block.type] || block.type}
      </div>
      <div className="absolute -top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button {...attributes} {...listeners} className={`${toolbarBtn} cursor-grab active:cursor-grabbing`} aria-label="Drag block">
          <GripVertical className="w-4 h-4" />
        </button>
        <button onClick={handleDuplicate} className={toolbarBtn} aria-label="Duplicate block">
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={handleDelete} className={`${toolbarBtn} text-danger`} aria-label="Delete block">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="border border-transparent group-hover:border-border rounded-lg overflow-hidden">
        <ErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>}>
            {BlockComponent && <BlockComponent block={block} />}
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default memo(BlockWrapper)
