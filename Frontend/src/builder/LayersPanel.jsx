import { memo, useState, useCallback, useMemo } from 'react'
import { 
  ChevronRight, ChevronDown, Eye, EyeOff, Lock, Unlock, 
  ArrowUp, ArrowDown, Type, Image, Layout, MousePointerClick, 
  Navigation, PanelTop, Sparkles, FormInput, CreditCard, Minus, Link, FileText
} from 'lucide-react'
import useStore from '../store/useStore'
import { getRootBlocks, getChildBlocks, moveBlockByArrow } from '../utils/blockUtils'
import { BLOCK_LABELS } from '../constants/blocks'

const TYPE_ICONS = {
  navbar: Navigation,
  header: PanelTop,
  hero: Sparkles,
  text: Type,
  button: MousePointerClick,
  image: Image,
  card: CreditCard,
  container: Layout,
  form: FormInput,
  divider: Minus,
  footer: Link,
}

const LayerNode = memo(function LayerNode({ 
  block, 
  depth = 0, 
  layout, 
  selectedId, 
  onSelect, 
  expanded, 
  onToggleExpand,
  onUpdateBlock,
  onUpdateLayout
}) {
  const children = block.type === 'container' ? getChildBlocks(layout, block.id) : []
  const hasChildren = children.length > 0
  const isExpanded = !!expanded[block.id]
  const isSelected = selectedId === block.id
  
  const isLocked = !!block.content?.locked
  const isHidden = !!block.content?.hidden

  const Icon = TYPE_ICONS[block.type] || FileText

  const handleSelectNode = useCallback((e) => {
    e.stopPropagation()
    onSelect(block.id)
  }, [block.id, onSelect])

  const handleToggleHide = useCallback((e) => {
    e.stopPropagation()
    onUpdateBlock(block.id, { content: { hidden: !isHidden } })
  }, [block.id, isHidden, onUpdateBlock])

  const handleToggleLock = useCallback((e) => {
    e.stopPropagation()
    onUpdateBlock(block.id, { content: { locked: !isLocked } })
  }, [block.id, isLocked, onUpdateBlock])

  const handleMoveUp = useCallback((e) => {
    e.stopPropagation()
    const nextLayout = moveBlockByArrow(layout, block.id, 'up')
    onUpdateLayout(nextLayout)
  }, [block.id, layout, onUpdateLayout])

  const handleMoveDown = useCallback((e) => {
    e.stopPropagation()
    const nextLayout = moveBlockByArrow(layout, block.id, 'down')
    onUpdateLayout(nextLayout)
  }, [block.id, layout, onUpdateLayout])

  return (
    <div className="flex flex-col">
      <div 
        onClick={handleSelectNode}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        className={`layer-node-item group flex items-center justify-between py-2 pr-2 border-b border-border/20 cursor-pointer text-xs select-none ${
          isSelected ? 'is-selected' : 'text-fg-muted'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasChildren ? (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand(block.id)
              }}
              className="p-0.5 hover:bg-neutral-800 rounded text-fg-subtle"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-4.5" />
          )}
          
          <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-accent' : 'text-fg-subtle'}`} />
          <span className={`truncate ${isSelected ? 'text-white font-medium' : 'text-fg'} ${isHidden ? 'line-through opacity-50' : ''}`}>
            {BLOCK_LABELS[block.type] || block.type}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 layer-node-actions">
          <button 
            type="button" 
            onClick={handleMoveUp} 
            className="p-1 hover:bg-neutral-800 rounded text-fg-subtle hover:text-white"
            title="Move Up"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button 
            type="button" 
            onClick={handleMoveDown} 
            className="p-1 hover:bg-neutral-800 rounded text-fg-subtle hover:text-white"
            title="Move Down"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button 
            type="button" 
            onClick={handleToggleLock} 
            className={`p-1 hover:bg-neutral-800 rounded ${isLocked ? 'text-amber-500' : 'text-fg-subtle hover:text-white'}`}
            title={isLocked ? 'Unlock layer' : 'Lock layer'}
          >
            {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>
          <button 
            type="button" 
            onClick={handleToggleHide} 
            className={`p-1 hover:bg-neutral-800 rounded ${isHidden ? 'text-red-400' : 'text-fg-subtle hover:text-white'}`}
            title={isHidden ? 'Show layer' : 'Hide layer'}
          >
            {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {children.map((child) => (
            <LayerNode 
              key={child.id}
              block={child}
              depth={depth + 1}
              layout={layout}
              selectedId={selectedId}
              onSelect={onSelect}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onUpdateBlock={onUpdateBlock}
              onUpdateLayout={onUpdateLayout}
            />
          ))}
        </div>
      )}
    </div>
  )
})

function LayersPanel() {
  const layout = useStore((s) => s.layout)
  const selectedBlockId = useStore((s) => s.selectedBlockId)
  const setSelectedBlockId = useStore((s) => s.setSelectedBlockId)
  const updateBlock = useStore((s) => s.updateBlock)
  const updateLayoutState = useStore((s) => s.updateLayoutState)

  const roots = useMemo(() => getRootBlocks(layout), [layout])
  
  const [expanded, setExpanded] = useState({})
  const [pageExpanded, setPageExpanded] = useState(true)

  const handleToggleExpand = useCallback((id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const handleUpdateLayout = useCallback((nextLayout) => {
    updateLayoutState(nextLayout, 'reorderBlock')
  }, [updateLayoutState])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-elevated">
      <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
        <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Document Tree</h3>
        <span className="text-[10px] text-fg-subtle bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
          {roots.length} Root Nodes
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
        {roots.length === 0 ? (
          <div className="text-center text-xs text-fg-subtle py-8 italic select-none">
            No layout elements found.
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Top-Level Page Node */}
            <div 
              onClick={() => setSelectedBlockId(null)}
              className={`flex items-center gap-2 py-2 px-2 hover:bg-neutral-800/40 rounded cursor-pointer text-xs select-none transition-all ${
                !selectedBlockId ? 'bg-accent/15 border border-accent/30 text-accent font-semibold' : 'text-fg hover:text-white'
              }`}
            >
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setPageExpanded(!pageExpanded)
                }}
                className="p-0.5 hover:bg-neutral-800 rounded text-fg-subtle"
              >
                {pageExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="truncate">Page (Root)</span>
            </div>

            {pageExpanded && (
              <div className="flex flex-col">
                {roots.map((block) => (
                  <LayerNode 
                    key={block.id}
                    block={block}
                    layout={layout}
                    selectedId={selectedBlockId}
                    onSelect={setSelectedBlockId}
                    expanded={expanded}
                    onToggleExpand={handleToggleExpand}
                    onUpdateBlock={updateBlock}
                    onUpdateLayout={handleUpdateLayout}
                    depth={1}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(LayersPanel)
