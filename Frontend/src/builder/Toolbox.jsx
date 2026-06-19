import { memo, useState, useMemo, useDeferredValue, useTransition, useCallback, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Search, Grid, Layers, Bookmark } from 'lucide-react'
import useStore from '../store/useStore'
import { getBlocksByCategory } from '../registry/index'
import Input from '../components/ui/Input'
import LayersPanel from './LayersPanel'
import BlockLibrary from './BlockLibrary'

const DraggableTool = memo(function DraggableTool({ item, onDoubleClickAdd }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${item.type}`,
    data: { type: item.type, isToolbox: true },
  })

  const clickTimer = useRef(null)

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation()
    if (clickTimer.current) {
      clearTimeout(clickTimer.current)
      clickTimer.current = null
    }
    onDoubleClickAdd(item.type)
  }, [item.type, onDoubleClickAdd])

  const Icon = item.icon

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onDoubleClick={handleDoubleClick}
      title="Drag to canvas or double-click to add"
      className={`flex items-start gap-3 p-3 rounded-lg border border-border bg-bg-subtle cursor-grab active:cursor-grabbing hover:border-accent hover:shadow-sm transition-all ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="p-2 rounded-md bg-accent-muted text-accent shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate text-fg">{item.label}</p>
        <p className="text-xs text-fg-muted truncate">{item.description}</p>
      </div>
    </div>
  )
})

function Toolbox({ className = '', onClose }) {
  const [activeTab, setActiveTab] = useState('components') // 'components' | 'layers' | 'saved'
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [, startTransition] = useTransition()
  const addBlock = useStore((s) => s.addBlock)
  const announce = useStore((s) => s.announce)

  const handleDoubleClickAdd = useCallback((type) => {
    addBlock(type, null)
    announce(`Added ${type} block to canvas`)
  }, [addBlock, announce])

  const filtered = useMemo(() => {
    const categories = getBlocksByCategory()
    const result = []
    for (const [category, items] of categories) {
      const filteredItems = deferredSearch.trim()
        ? items.filter((item) =>
            item.label.toLowerCase().includes(deferredSearch.toLowerCase()) ||
            item.description.toLowerCase().includes(deferredSearch.toLowerCase()) ||
            category.toLowerCase().includes(deferredSearch.toLowerCase())
          )
        : items
      if (filteredItems.length) result.push({ category, items: filteredItems })
    }
    return result
  }, [deferredSearch])

  const handleSearch = (e) => {
    startTransition(() => setSearch(e.target.value))
  }

  return (
    <aside
      className={`w-full lg:w-[240px] shrink-0 border-r border-border bg-bg-elevated flex flex-col h-full min-h-0 ${className}`}
      aria-label="Toolbox"
    >
      {/* Tab switchers at the top */}
      <div className="flex border-b border-border bg-bg-muted/50 p-1 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('components')}
          className={`flex-1 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            activeTab === 'components'
              ? 'bg-bg-elevated text-accent shadow-sm border border-border/40'
              : 'text-fg-muted hover:text-fg hover:bg-bg-elevated/40'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Blocks</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            activeTab === 'layers'
              ? 'bg-bg-elevated text-accent shadow-sm border border-border/40'
              : 'text-fg-muted hover:text-fg hover:bg-bg-elevated/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Layers</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            activeTab === 'saved'
              ? 'bg-bg-elevated text-accent shadow-sm border border-border/40'
              : 'text-fg-muted hover:text-fg hover:bg-bg-elevated/40'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Saved</span>
        </button>
      </div>

      {activeTab === 'components' && (
        <>
          <div className="p-3 border-b border-border shrink-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-sm font-semibold text-fg font-display">Components</h2>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="lg:hidden text-xs font-medium text-accent hover:underline"
                >
                  Done
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
              <Input
                type="text"
                placeholder="Search components..."
                value={search}
                onChange={handleSearch}
                aria-label="Search toolbox components"
                className="pl-9"
              />
            </div>
            <p className="text-[11px] text-fg-subtle mt-2">Drag to canvas or double-click to add</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {filtered.map(({ category, items }) => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">{category}</h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <DraggableTool key={item.type} item={item} onDoubleClickAdd={handleDoubleClickAdd} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'layers' && (
        <div className="flex-1 min-h-0">
          <LayersPanel />
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="flex-1 min-h-0">
          <BlockLibrary />
        </div>
      )}
    </aside>
  )
}

export default memo(Toolbox)
