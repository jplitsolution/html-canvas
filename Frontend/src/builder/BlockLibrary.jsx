import { memo, useState, useEffect, useCallback } from 'react'
import { Bookmark, Trash2, Plus, LayoutTemplate } from 'lucide-react'
import useStore from '../store/useStore'


function BlockLibrary() {
  const layout = useStore((s) => s.layout)
  const addToast = useStore((s) => s.addToast)
  const updateLayoutState = useStore((s) => s.updateLayoutState)
  const setSelectedBlockId = useStore((s) => s.setSelectedBlockId)

  const [savedBlocks, setSavedBlocks] = useState([])
  const [savedTemplates, setSavedTemplates] = useState([])

  const loadSavedItems = useCallback(() => {
    const blocks = []
    const templates = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('saved-blocks/')) {
        try {
          const item = JSON.parse(localStorage.getItem(key))
          blocks.push(item)
        } catch (e) {
          console.error(e)
        }
      } else if (key.startsWith('templates/')) {
        try {
          const item = JSON.parse(localStorage.getItem(key))
          templates.push(item)
        } catch (e) {
          console.error(e)
        }
      }
    }
    setSavedBlocks(blocks.sort((a, b) => b.savedAt - a.savedAt))
    setSavedTemplates(templates.sort((a, b) => b.savedAt - a.savedAt))
  }, [])

  useEffect(() => {
    loadSavedItems()
    
    // Listen for custom save events
    const handleStorageUpdate = () => {
      loadSavedItems()
    }
    window.addEventListener('storage-blocks-updated', handleStorageUpdate)
    return () => window.removeEventListener('storage-blocks-updated', handleStorageUpdate)
  }, [loadSavedItems])

  const handleDeleteBlock = useCallback((id, prefix = 'saved-blocks/') => {
    localStorage.removeItem(prefix + id)
    loadSavedItems()
    addToast('Deleted custom item', 'info')
  }, [loadSavedItems, addToast])

  const handleUseBlock = useCallback((savedItem) => {
    const { subtree } = savedItem
    if (!subtree || !subtree.length) return

    // Map old IDs to new UUIDs
    const idMap = {}
    subtree.forEach((b) => {
      idMap[b.id] = crypto.randomUUID()
    })

    // Create cloned blocks with fresh IDs
    const clonedSubtree = subtree.map((b) => {
      const cloned = {
        ...b,
        id: idMap[b.id],
        parentId: b.parentId ? idMap[b.parentId] : null,
      }
      if (b.children) {
        cloned.children = b.children.map((cid) => idMap[cid]).filter(Boolean)
      }
      // Remove locked/hidden states when reusing
      if (cloned.content) {
        cloned.content = {
          ...cloned.content,
          locked: false,
          hidden: false,
        }
      }
      return cloned
    })

    // Root block of the subtree
    const rootBlock = clonedSubtree.find((b) => !b.parentId || !idMap[b.parentId])
    if (!rootBlock) return

    const nextLayout = [...layout, ...clonedSubtree]
    updateLayoutState(nextLayout, 'addBlock')
    setSelectedBlockId(rootBlock.id)
    addToast('Inserted custom block', 'success')
  }, [layout, updateLayoutState, setSelectedBlockId, addToast])

  const handleUseTemplate = useCallback((savedTemplate) => {
    if (!confirm('Replace current canvas layout with this template?')) return
    updateLayoutState(savedTemplate.layout, 'update')
    addToast('Loaded custom template', 'success')
  }, [updateLayoutState, addToast])

  const handleSavePageAsTemplate = useCallback(() => {
    if (layout.length === 0) {
      addToast('Cannot save an empty layout', 'warning')
      return
    }
    const name = prompt('Enter a name for this custom layout template:')
    if (!name) return

    const id = crypto.randomUUID()
    const templateData = {
      id,
      name,
      layout: structuredClone(layout),
      savedAt: Date.now()
    }

    localStorage.setItem('templates/' + id, JSON.stringify(templateData))
    loadSavedItems()
    addToast('Layout template saved successfully!', 'success')
  }, [layout, loadSavedItems, addToast])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-elevated">
      <div className="p-3 border-b border-border shrink-0 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Reusable Library</h3>
        <button
          type="button"
          onClick={handleSavePageAsTemplate}
          className="text-[10px] bg-accent/10 border border-accent/25 hover:bg-accent/20 text-accent font-semibold px-2 py-1 rounded transition-colors"
        >
          Save Layout
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin">
        {/* Custom blocks list */}
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider flex items-center gap-1">
            <Bookmark className="w-3 h-3 text-accent" />
            <span>Saved Blocks</span>
          </h4>

          {savedBlocks.length === 0 ? (
            <div className="text-center text-xs text-fg-subtle/80 bg-bg-subtle/50 py-6 rounded-lg border border-dashed border-border/40 select-none">
              Save elements by clicking the bookmark icon in the canvas toolbars.
            </div>
          ) : (
            <div className="space-y-1.5">
              {savedBlocks.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-bg-subtle hover:border-accent/30 transition-all group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-medium text-fg truncate">{item.name}</p>
                    <p className="text-[9px] text-fg-subtle truncate capitalize">
                      {item.subtree?.[0]?.type || 'block'} • {item.subtree?.length || 1} elements
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUseBlock(item)}
                      className="p-1 hover:bg-accent/15 hover:text-accent rounded text-fg-subtle"
                      title="Insert block"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(item.id, 'saved-blocks/')}
                      className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded text-fg-subtle"
                      title="Delete block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom templates list */}
        <div className="space-y-2.5 pt-4 border-t border-border/40">
          <h4 className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider flex items-center gap-1">
            <LayoutTemplate className="w-3 h-3 text-accent" />
            <span>My Templates</span>
          </h4>

          {savedTemplates.length === 0 ? (
            <div className="text-center text-xs text-fg-subtle/80 bg-bg-subtle/50 py-6 rounded-lg border border-dashed border-border/40 select-none">
              No saved page layouts.
            </div>
          ) : (
            <div className="space-y-1.5">
              {savedTemplates.map((template) => (
                <div 
                  key={template.id} 
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-bg-subtle hover:border-accent/30 transition-all group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-medium text-fg truncate">{template.name}</p>
                    <p className="text-[9px] text-fg-subtle truncate">
                      {template.layout?.length || 0} blocks
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(template)}
                      className="p-1 hover:bg-accent/15 hover:text-accent rounded text-fg-subtle"
                      title="Apply template layout"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(template.id, 'templates/')}
                      className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded text-fg-subtle"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(BlockLibrary)
