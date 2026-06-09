import { memo, Suspense, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { LayoutTemplate, Loader2 } from 'lucide-react'
import useStore from '../store/useStore'
import { getRootBlocks } from '../utils/blockUtils'
import BlockWrapper from './BlockWrapper'
import EmptyState from '../components/ui/EmptyState'

const VIRTUAL_THRESHOLD = 30

function VirtualizedBlocks({ blocks }) {
  const parentRef = useRef(null)
  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  return (
    <div ref={parentRef} className="flex-1 min-h-0 overflow-auto p-2">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const block = blocks[virtualRow.index]
          return (
            <div
              key={block.id}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>}>
                <BlockWrapper block={block} />
              </Suspense>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Canvas() {
  const layout = useStore((s) => s.layout)
  const previewMode = useStore((s) => s.previewMode)
  const zoom = useStore((s) => s.zoom)
  const deselectAll = useStore((s) => s.deselectAll)

  const roots = getRootBlocks(layout)
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-root' })

  const widthMap = { desktop: '100%', tablet: '768px', mobile: '375px' }
  const canvasWidth = widthMap[previewMode] || '100%'

  return (
    <div
      className="flex-1 overflow-auto bg-bg-canvas bg-stripe-pattern p-6"
      onClick={deselectAll}
      role="region"
      aria-label="Canvas"
    >
      <a href="#canvas-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-fg focus:rounded-lg">
        Skip to canvas
      </a>
      <div
        className="mx-auto canvas-transition"
        style={{
          width: canvasWidth,
          maxWidth: '100%',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
        }}
      >
        <div
          id="canvas-content"
          ref={setNodeRef}
          className={`min-h-[600px] flex flex-col bg-bg-elevated rounded-xl shadow-md border transition-colors ${
            previewMode !== 'desktop' ? 'border-border-strong' : 'border-border'
          } ${isOver ? 'border-accent border-dashed' : ''}`}
        >
          {roots.length === 0 ? (
            <EmptyState
              icon={LayoutTemplate}
              title="Canvas is empty"
              description="Drag components from the toolbox or double-click to add"
            />
          ) : roots.length >= VIRTUAL_THRESHOLD ? (
            <SortableContext items={roots.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <VirtualizedBlocks blocks={roots} />
            </SortableContext>
          ) : (
            <SortableContext items={roots.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="p-2">
                {roots.map((block) => (
                  <Suspense key={block.id} fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>}>
                    <BlockWrapper block={block} />
                  </Suspense>
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(Canvas)
