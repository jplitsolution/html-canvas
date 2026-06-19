import { memo, Suspense, useRef, useState, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { LayoutTemplate, Loader2, Compass, Move, ArrowUpRight } from 'lucide-react'
import useStore from '../store/useStore'
import { getRootBlocks } from '../utils/blockUtils'
import BlockWrapper from './BlockWrapper'

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

  // Panning State
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const canvasAreaRef = useRef(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const scrollTopRef = useRef(0)

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = e.target.tagName === 'INPUT' || 
                      e.target.tagName === 'TEXTAREA' || 
                      e.target.isContentEditable ||
                      e.target.closest('[contenteditable="true"]')
      if (e.key === ' ' && !isInput) {
        e.preventDefault()
        setIsSpacePressed(true)
      }
    }
    const handleKeyUp = (e) => {
      if (e.key === ' ') {
        setIsSpacePressed(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleMouseDown = (e) => {
    if (!isSpacePressed) return
    e.preventDefault()
    isDraggingRef.current = true
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    scrollLeftRef.current = canvasAreaRef.current.scrollLeft
    scrollTopRef.current = canvasAreaRef.current.scrollTop
    canvasAreaRef.current.classList.add('is-panning-active')
  }

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return
    e.preventDefault()
    const dx = e.clientX - startXRef.current
    const dy = e.clientY - startYRef.current
    canvasAreaRef.current.scrollLeft = scrollLeftRef.current - dx
    canvasAreaRef.current.scrollTop = scrollTopRef.current - dy
  }

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false
    if (canvasAreaRef.current) {
      canvasAreaRef.current.classList.remove('is-panning-active')
    }
  }

  return (
    <div
      ref={canvasAreaRef}
      className={`builder-canvas-area ${isSpacePressed ? 'is-panning' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onClick={(e) => {
        if (isDraggingRef.current) {
          e.stopPropagation()
          return
        }
        const editingBlockId = useStore.getState().editingBlockId
        if (editingBlockId) {
          useStore.getState().setEditingBlockId(null)
          return
        }
        deselectAll()
      }}
      role="region"
      aria-label="Canvas"
    >
      <a href="#canvas-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-fg focus:rounded-lg">
        Skip to canvas
      </a>
      {isSpacePressed && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#1e1e24]/90 border border-accent/30 px-3 py-1.5 rounded-full text-xs text-accent-subtle flex items-center gap-2 shadow-lg z-50 pointer-events-none backdrop-blur-sm animate-fade-in">
          <Move className="w-3.5 h-3.5 animate-bounce" />
          <span>Pan Mode Active: Drag to scroll canvas</span>
        </div>
      )}
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
          className={`builder-canvas-frame glass flex flex-col transition-all duration-300 overflow-x-hidden ${
            previewMode !== 'desktop' ? 'shadow-2xl border-[#333333] ring-1 ring-[#ffffff]/5' : ''
          } ${isOver ? 'border-[#6B5CE7] border-dashed bg-[#6B5CE7]/5 shadow-[0_0_20px_rgba(107,92,231,0.25)]' : ''}`}
        >
          {roots.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center select-none min-h-[460px] bg-gradient-to-b from-[#16161f]/40 to-transparent">
              <div className="mb-6 p-5 rounded-3xl bg-accent-muted border border-[#6B5CE7]/20 text-[#6B5CE7] shadow-lg relative group">
                <LayoutTemplate className="w-12 h-12 transition-transform duration-300 group-hover:scale-110" />
                <Compass className="w-5 h-5 absolute -top-1 -right-1 text-accent animate-spin-slow" style={{ animationDuration: '8s' }} />
              </div>
              <p className="text-base font-bold text-white tracking-wide font-display">Start Building Your Page</p>
              <p className="text-xs text-neutral-400 mt-2 max-w-sm leading-relaxed">
                Drag blocks from the components panel on the left, or double-click items to add them directly to the active workspace.
              </p>
              <div className="mt-8 flex items-center gap-3 bg-[#1e1e24] px-4 py-2 rounded-xl border border-border text-[11px] text-fg-subtle">
                <span className="font-semibold text-accent flex items-center gap-0.5"><ArrowUpRight className="w-3.5 h-3.5" /> Tip:</span>
                <span>Hold down <kbd className="px-1.5 py-0.5 bg-[#252530] text-fg font-mono border border-border-strong rounded text-[10px]">Space</kbd> and drag with mouse to pan workspace.</span>
              </div>
              <div className="mt-8 w-32 h-0.5 bg-gradient-to-r from-transparent via-[#6B5CE7]/20 to-transparent" />
            </div>
          ) : roots.length >= VIRTUAL_THRESHOLD ? (
            <SortableContext items={roots.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <VirtualizedBlocks blocks={roots} />
            </SortableContext>
          ) : (
            <SortableContext items={roots.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="p-4 flex flex-col gap-3">
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

