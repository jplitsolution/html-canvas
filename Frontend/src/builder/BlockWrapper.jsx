import { memo, useCallback, Suspense, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Copy, Trash2, Loader2, Lock, Unlock, EyeOff, Bookmark, Plus, Type, Image, Layout } from 'lucide-react'
import useStore from '../store/useStore'
import ErrorBoundary from '../components/common/ErrorBoundary'
import { getBlockComponent } from '../registry/index'
import { BLOCK_LABELS } from '../constants/blocks'
import { getBlockStyleObject, isDescendant } from '../utils/blockUtils'
import FloatingToolbar from './FloatingToolbar'

function getBlockSubtree(layout, blockId) {
  const block = layout.find((b) => b.id === blockId)
  if (!block) return []
  const result = [block]
  if (block.type === 'container' && block.children) {
    for (const childId of block.children) {
      result.push(...getBlockSubtree(layout, childId))
    }
  }
  return result
}

function BlockWrapper({ block, isChild = false }) {
  const selectedBlocks = useStore((s) => s.selectedBlocks)
  const toggleBlockSelection = useStore((s) => s.toggleBlockSelection)
  const removeBlock = useStore((s) => s.removeBlock)
  const duplicateBlock = useStore((s) => s.duplicateBlock)
  const updateBlock = useStore((s) => s.updateBlock)
  const previewMode = useStore((s) => s.previewMode)
  const layout = useStore((s) => s.layout)
  const addToast = useStore((s) => s.addToast)
  const activeDragId = useStore((s) => s.activeDragId)
  const setDragHoverZone = useStore((s) => s.setDragHoverZone)
  const addBlock = useStore((s) => s.addBlock)
  const editingBlockId = useStore((s) => s.editingBlockId)

  const isSelected = selectedBlocks.includes(block.id)
  const isLocked = !!block.content?.locked
  const isHidden = !!block.content?.hidden

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: block.id,
    data: { type: block.type, parentId: block.parentId },
    disabled: isLocked || editingBlockId === block.id,
  })

  const [localHoverZone, setLocalHoverZone] = useState(null)
  const [showInsertMenu, setShowInsertMenu] = useState(false)
  const [showSeparatorMenu, setShowSeparatorMenu] = useState(false)

  const isDropInvalid = activeDragId ? (activeDragId === block.id || isDescendant(layout, activeDragId, block.id)) : false

  const handleDragOver = (e) => {
    if (!activeDragId || activeDragId === block.id) return
    e.preventDefault()
    e.stopPropagation()

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const w = rect.width
    const h = rect.height
    const padX = w * 0.25
    const padY = h * 0.25

    let zone = 'center'
    if (x < padX) zone = 'left'
    else if (x > w - padX) zone = 'right'
    else if (y < padY) zone = 'top'
    else if (y > h - padY) zone = 'bottom'

    setLocalHoverZone(zone)
    setDragHoverZone(zone)
  }

  const handleDragLeave = () => {
    setLocalHoverZone(null)
    setDragHoverZone(null)
  }

  useEffect(() => {
    if (!activeDragId) {
      setLocalHoverZone(null)
    }
  }, [activeDragId])

  // Resolve styles to compute spacing guides
  const resolvedStyles = getBlockStyleObject(block.styles, previewMode)
  const paddingTop = parseInt(resolvedStyles.paddingTop, 10) || 0
  const paddingBottom = parseInt(resolvedStyles.paddingBottom, 10) || 0
  const paddingLeft = parseInt(resolvedStyles.paddingLeft, 10) || 0
  const paddingRight = parseInt(resolvedStyles.paddingRight, 10) || 0

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
    if (isLocked) return
    removeBlock(block.id)
  }, [block.id, removeBlock, isLocked])

  const handleDuplicate = useCallback((e) => {
    e.stopPropagation()
    if (isLocked) return
    duplicateBlock(block.id)
  }, [block.id, duplicateBlock, isLocked])

  const handleToggleLock = useCallback((e) => {
    e.stopPropagation()
    updateBlock(block.id, { content: { locked: !isLocked } })
  }, [block.id, isLocked, updateBlock])

  const handleSaveBlock = useCallback((e) => {
    e.stopPropagation()
    const name = prompt('Enter a name for this reusable block:')
    if (!name) return

    const id = crypto.randomUUID()
    const subtree = getBlockSubtree(layout, block.id)

    const blockData = {
      id,
      name,
      subtree: structuredClone(subtree),
      savedAt: Date.now()
    }

    localStorage.setItem('saved-blocks/' + id, JSON.stringify(blockData))
    window.dispatchEvent(new Event('storage-blocks-updated'))
    addToast('Block saved to reusable library!', 'success')
  }, [block.id, layout, addToast])

  const handleInsert = useCallback((type) => {
    const siblings = block.parentId
      ? layout.find((b) => b.id === block.parentId)?.children || []
      : layout.filter((b) => !b.parentId).map((b) => b.id)
    const idx = siblings.indexOf(block.id)
    addBlock(type, block.parentId, idx + 1)
    setShowInsertMenu(false)
    setShowSeparatorMenu(false)
    addToast(`Inserted ${type} block`, 'success')
  }, [block.id, block.parentId, layout, addBlock, addToast])

  const BlockComponent = getBlockComponent(block.type)

  const toolbarBtn = 'p-1.5 bg-[#18181b] rounded-lg shadow-md border border-[#27272a] text-neutral-400 hover:text-white hover:border-neutral-500 transition-all duration-150 flex items-center justify-center'

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      className={`group relative rounded-xl transition-all duration-200 border ${
        isSelected 
          ? 'border-2 border-[#6B5CE7] bg-[#6B5CE7]/5 shadow-[0_0_24px_rgba(107,92,231,0.25)]' 
          : 'border-transparent hover:border-[#27272a] hover:bg-white/[0.01]'
      } ${isHidden ? 'block-hidden-state' : ''} ${isChild ? '' : 'mb-4'}`}
      onClick={handleSelect}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onMouseLeave={() => {
        setShowInsertMenu(false)
        setShowSeparatorMenu(false)
      }}
    >
      {isSelected && <FloatingToolbar block={block} />}

      {/* Drop Zone Indicators */}
      {isOver && !isDropInvalid && (
        <>
          {localHoverZone === 'top' && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#6B5CE7] z-30 shadow-[0_0_8px_#6B5CE7] rounded-full pointer-events-none" />
          )}
          {localHoverZone === 'bottom' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#6B5CE7] z-30 shadow-[0_0_8px_#6B5CE7] rounded-full pointer-events-none" />
          )}
          {localHoverZone === 'left' && (
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#6B5CE7] z-30 shadow-[0_0_8px_#6B5CE7] rounded-full pointer-events-none" />
          )}
          {localHoverZone === 'right' && (
            <div className="absolute top-0 bottom-0 right-0 w-1 bg-[#6B5CE7] z-30 shadow-[0_0_8px_#6B5CE7] rounded-full pointer-events-none" />
          )}
          {localHoverZone === 'center' && (
            <div className="absolute inset-0 bg-[#6B5CE7]/10 border-2 border-dashed border-[#6B5CE7] rounded-xl z-30 pointer-events-none" />
          )}
        </>
      )}

      {/* Invalid Drop Indicator */}
      {isOver && isDropInvalid && (
        <div className="absolute inset-0 bg-red-500/10 border-2 border-dashed border-red-500 rounded-xl z-30 pointer-events-none" />
      )}

      {/* Label and Status Icon */}
      <div className={`absolute -top-3 left-3.5 z-20 px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-md shadow-md capitalize flex items-center gap-1.5 transition-all duration-200 ${
        isSelected ? 'bg-[#6B5CE7] text-white border border-[#6B5CE7]' : 'bg-[#27272a] text-neutral-400 border border-[#3f3f46] opacity-0 group-hover:opacity-100'
      }`}>
        {isHidden && <EyeOff className="w-3 h-3" />}
        {isLocked && <Lock className="w-3 h-3 text-warning-fg" />}
        <span>{BLOCK_LABELS[block.type] || block.type}</span>
      </div>

      {/* Toolbar controls */}
      <div className="absolute -top-3.5 right-3.5 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
        <button 
          onClick={handleToggleLock} 
          className={`${toolbarBtn} ${isLocked ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' : ''}`} 
          title={isLocked ? 'Unlock block' : 'Lock block'}
          aria-label={isLocked ? 'Unlock block' : 'Lock block'}
        >
          {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>

        {!isLocked && (
          <>
            <button {...attributes} {...listeners} className={`${toolbarBtn} cursor-grab active:cursor-grabbing`} aria-label="Drag block">
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleSaveBlock} className={toolbarBtn} aria-label="Save as Reusable Block" title="Save block">
              <Bookmark className="w-3.5 h-3.5 text-accent-subtle" />
            </button>
            
            {/* Quick insert button in action bar */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowInsertMenu(prev => !prev); }} 
                className={toolbarBtn} 
                aria-label="Insert sibling block" 
                title="Insert block"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {showInsertMenu && (
                <div 
                  className="absolute top-full right-0 mt-1 z-50 min-w-[130px] bg-[#18181b] border border-[#27272a] shadow-2xl rounded-xl p-1.5 flex flex-col gap-1 text-xs text-neutral-300 font-semibold" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={() => handleInsert('typography')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-neutral-800 rounded-lg text-left w-full transition">
                    <Type className="w-3.5 h-3.5 text-accent" />
                    <span>Text</span>
                  </button>
                  <button onClick={() => handleInsert('image')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-neutral-800 rounded-lg text-left w-full transition">
                    <Image className="w-3.5 h-3.5 text-accent" />
                    <span>Image</span>
                  </button>
                  <button onClick={() => handleInsert('button')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-neutral-800 rounded-lg text-left w-full transition">
                    <Bookmark className="w-3.5 h-3.5 text-accent" />
                    <span>Button</span>
                  </button>
                  <button onClick={() => handleInsert('container')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-neutral-800 rounded-lg text-left w-full transition">
                    <Layout className="w-3.5 h-3.5 text-accent" />
                    <span>Container</span>
                  </button>
                  <button onClick={() => handleInsert('divider')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-neutral-800 rounded-lg text-left w-full transition">
                    <GripVertical className="w-3.5 h-3.5 text-accent" />
                    <span>Divider</span>
                  </button>
                </div>
              )}
            </div>

            <button onClick={handleDuplicate} className={toolbarBtn} aria-label="Duplicate block">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleDelete} className={`${toolbarBtn} text-red-500 hover:text-red-400 hover:bg-red-500/10`} aria-label="Delete block">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Spacing Visual Guides (Render only when selected) */}
      {isSelected && (
        <>
          {/* Top selection corner decorations */}
          <div className="block-selection-corner block-selection-corner-tl" />
          <div className="block-selection-corner block-selection-corner-tr" />
          <div className="block-selection-corner block-selection-corner-bl" />
          <div className="block-selection-corner block-selection-corner-br" />

          {/* Padding guides */}
          {paddingTop > 0 && (
            <div className="spacing-guide-indicator" style={{ top: 0, left: 0, right: 0, height: `${paddingTop}px`, borderBottom: '1px dashed rgba(107, 92, 231, 0.45)' }}>
              pt: {paddingTop}px
            </div>
          )}
          {paddingBottom > 0 && (
            <div className="spacing-guide-indicator" style={{ bottom: 0, left: 0, right: 0, height: `${paddingBottom}px`, borderTop: '1px dashed rgba(107, 92, 231, 0.45)' }}>
              pb: {paddingBottom}px
            </div>
          )}
          {paddingLeft > 0 && (
            <div className="spacing-guide-indicator" style={{ top: 0, bottom: 0, left: 0, width: `${paddingLeft}px`, borderRight: '1px dashed rgba(107, 92, 231, 0.45)' }}>
              pl: {paddingLeft}px
            </div>
          )}
          {paddingRight > 0 && (
            <div className="spacing-guide-indicator" style={{ top: 0, bottom: 0, right: 0, width: `${paddingRight}px`, borderLeft: '1px dashed rgba(107, 92, 231, 0.45)' }}>
              pr: {paddingRight}px
            </div>
          )}
        </>
      )}

      {/* Main Block Content */}
      <div className="border border-transparent group-hover:border-[#27272a] rounded-lg overflow-hidden transition-all duration-200">
        <ErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>}>
            {BlockComponent && <BlockComponent block={block} />}
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Quick insert between blocks row indicator */}
      {!isLocked && (
        <div className="absolute -bottom-3.5 left-0 right-0 h-6 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="w-full h-[1px] bg-accent/25 absolute left-0 right-0 pointer-events-none" />
          <div className="relative pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowSeparatorMenu(prev => !prev)
              }}
              className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="Insert block here"
              aria-label="Insert block here"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {showSeparatorMenu && (
              <div 
                className="absolute top-6 left-1/2 -translate-x-1/2 z-50 min-w-[130px] bg-[#18181b] border border-[#27272a] shadow-2xl rounded-xl p-1.5 flex flex-col gap-1 text-xs text-neutral-300 font-semibold"
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => handleInsert('typography')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-neutral-800 rounded-lg text-left w-full transition">
                  <Type className="w-3.5 h-3.5 text-accent" />
                  <span>Text</span>
                </button>
                <button onClick={() => handleInsert('image')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-neutral-800 rounded-lg text-left w-full transition">
                  <Image className="w-3.5 h-3.5 text-accent" />
                  <span>Image</span>
                </button>
                <button onClick={() => handleInsert('button')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-neutral-800 rounded-lg text-left w-full transition">
                  <Bookmark className="w-3.5 h-3.5 text-accent" />
                  <span>Button</span>
                </button>
                <button onClick={() => handleInsert('container')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-neutral-800 rounded-lg text-left w-full transition">
                  <Layout className="w-3.5 h-3.5 text-accent" />
                  <span>Container</span>
                </button>
                <button onClick={() => handleInsert('divider')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-neutral-800 rounded-lg text-left w-full transition">
                  <GripVertical className="w-3.5 h-3.5 text-accent" />
                  <span>Divider</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(BlockWrapper)
