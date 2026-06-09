import { memo, Suspense } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Loader2 } from 'lucide-react'
import { getChildBlocks } from '../utils/blockUtils'
import useStore from '../store/useStore'
import { useBlockStyles } from '../hooks/useBlockStyles'
import BlockWrapper from '../builder/BlockWrapper'

function ContainerBlock({ block }) {
  const layout = useStore((s) => s.layout)
  const children = getChildBlocks(layout, block.id)
  const style = useBlockStyles(block)
  const cols = block.content.columns || 2

  const { setNodeRef, isOver } = useDroppable({ id: `container-${block.id}` })

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '16px',
        minHeight: children.length === 0 ? '120px' : undefined,
        outline: isOver ? '2px dashed var(--accent)' : undefined,
        outlineOffset: '4px',
      }}
    >
      {children.length === 0 ? (
        <div className="col-span-full flex items-center justify-center py-8 border-2 border-dashed border-border-strong rounded-lg text-fg-subtle text-sm" style={{ gridColumn: '1 / -1' }}>
          Grid Container (Drop items inside)
        </div>
      ) : (
        <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {children.map((child) => (
            <Suspense key={child.id} fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>}>
              <BlockWrapper block={child} isChild />
            </Suspense>
          ))}
        </SortableContext>
      )}
    </div>
  )
}

export default memo(ContainerBlock)
