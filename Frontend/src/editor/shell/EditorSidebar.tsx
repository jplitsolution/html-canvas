import { useState, useEffect, useCallback } from 'react'
import type { Asset } from 'grapesjs'
import {
  LayoutTemplate,
  Boxes,
  Layers3,
  ImageIcon,
  FileStack,
  Search,
  Type,
  Upload,
  X,
} from 'lucide-react'
import { useEditor } from '../context/EditorContext'
import { TemplateCard } from './BlockCard'
import { STARTER_TEMPLATES } from '../templates/starterTemplates'
import { applyStarterHtml } from '../utils/blockActions'
import { selectPage, addPage, getPagesList } from '../plugins/pagesManager'
import { ensureLayerManagerMounted, filterBlockElements } from '../plugins/dragAndDrop'
import { startAssetDrag } from '../plugins/assetDrag'
import { insertImageComponent } from '../utils/insertImage'
import { insertBackgroundWithText } from '../utils/insertBackground'
import { uploadImage } from '../../services/api/upload'

type SidebarTab = 'templates' | 'components' | 'sections' | 'assets' | 'pages' | 'layers'

const TABS: { id: SidebarTab; label: string; icon: typeof Boxes }[] = [
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'components', label: 'Components', icon: Boxes },
  { id: 'sections', label: 'Sections', icon: Layers3 },
  { id: 'assets', label: 'Assets', icon: ImageIcon },
  { id: 'pages', label: 'Pages', icon: FileStack },
  { id: 'layers', label: 'Layers', icon: Layers3 },
]

// ✅ Helper function to find heading in a section (recursive search)
function findHeadingInSection(section: any): any | null {
  if (!section) return null;
  
  // Check if current component is the heading we want
  const tag = section.get('tagName');
  const gjsType = section.get('data-gjs-type');
  
  if (tag === 'h2' && gjsType === 'text') {
    return section;
  }
  
  // Recursively search children
  const children = section.components();
  for (const child of children) {
    const result = findHeadingInSection(child);
    if (result) return result;
  }
  
  return null;
}

// ✅ Helper to update text in background section
function updateBackgroundText(editor: any, text: string): void {
  if (!editor) return;
  
  const wrapper = editor.getWrapper();
  if (!wrapper) return;
  
  const components = wrapper.components();
  const lastSection = components.at(components.length - 1);
  if (!lastSection) return;
  
  const heading = findHeadingInSection(lastSection);
  if (heading) {
    heading.set('content', text);
  }
}

export function EditorSidebar() {
  const { editor } = useEditor()
  const [tab, setTab] = useState<SidebarTab>('templates')
  const [search, setSearch] = useState('')
  const [assetSearch, setAssetSearch] = useState('')
  const [pages, setPages] = useState<{ id: string; name: string }[]>([])
  const [assets, setAssets] = useState<Array<{ src: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  // Upload options state
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const [uploadPlacement, setUploadPlacement] = useState<'image' | 'background' | null>(null)
  const [overlayText, setOverlayText] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const refreshPages = useCallback(() => {
    if (!editor) return
    setPages(getPagesList(editor))
  }, [editor])

  const refreshAssets = useCallback(() => {
    if (!editor) return
    const all = editor.AssetManager.getAll()
    setAssets(
      all
        .map((asset: Asset) => ({ src: (asset.get('src') as string) || '' }))
        .filter((asset: { src: string }) => asset.src.trim().length > 0)
    )
  }, [editor])

  const handleTabChange = (id: SidebarTab) => {
    setTab(id)
    if (id === 'pages') refreshPages()
    if (id === 'assets') refreshAssets()
  }

  useEffect(() => {
    if (!editor) return
    if (tab === 'sections' || tab === 'components') {
      filterBlockElements(editor, tab, search)
    }
    if (tab === 'layers') {
      ensureLayerManagerMounted(editor)
    }
  }, [editor, tab, search])

  useEffect(() => {
    if (!editor) return

    editor.on('asset:add', refreshAssets)
    editor.on('asset:remove', refreshAssets)

    if (tab === 'assets') refreshAssets()

    return () => {
      editor.off('asset:add', refreshAssets)
      editor.off('asset:remove', refreshAssets)
    }
  }, [editor, tab, refreshAssets])

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor || !e.target.files?.length) return
    
    const files = Array.from(e.target.files)
    setPendingFiles(files)
    setShowUploadOptions(true)
    setUploadPlacement(null)
    setOverlayText('')
    setUploadError(null)
    
    // Reset input
    e.target.value = ''
  }

  // ✅ Handle actual upload with options - FIXED
  const handleUploadWithOptions = async () => {
    if (!editor || pendingFiles.length === 0) return
    
    setUploading(true)
    setUploadError(null)

    try {
      for (const file of pendingFiles) {
        const result = await uploadImage(file)
        
        // Add to asset manager
        editor.AssetManager.add({ src: result.url, type: 'image', name: file.name })
        
        // Insert based on placement
        if (uploadPlacement === 'background') {
          // Insert as background with text overlay
          insertBackgroundWithText(editor, result.url)
          
          // ✅ Update with custom text using helper function
          if (overlayText.trim()) {
            updateBackgroundText(editor, overlayText)
          }
        } else {
          // Insert as normal image
          insertImageComponent(editor, result.url)
        }
        
        refreshAssets()
      }
      
      // Reset states
      setShowUploadOptions(false)
      setPendingFiles([])
      setUploadPlacement(null)
      setOverlayText('')
      
    } catch (err) {
      console.error(err)
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // ✅ Asset click handler - FIXED
  const handleAssetClick = useCallback((src: string) => {
    if (!editor) return
    if (document.body.classList.contains('tc-is-dragging')) return
    
    // Ask user for placement
    const choice = window.confirm('Insert as Background with text overlay?\n\nClick OK for Background, Cancel for Image')
    
    if (choice) {
      // Background with text
      const text = window.prompt('Enter overlay text:', 'Your Text Here') || 'Your Text Here'
      insertBackgroundWithText(editor, src)
      
      // ✅ Update with custom text using helper function
      if (text) {
        updateBackgroundText(editor, text)
      }
    } else {
      // Inline image
      insertImageComponent(editor, src)
    }
  }, [editor])

  const filteredAssets = assets.filter((a) =>
    assetSearch ? a.src.toLowerCase().includes(assetSearch.toLowerCase()) : true
  )

  const showBlocks = tab === 'sections' || tab === 'components'

  return (
    <aside className="tc-sidebar w-72 shrink-0 flex flex-col border-r border-border bg-bg-elevated min-h-0">
      <div className="flex flex-wrap gap-1 p-2 border-b border-border shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleTabChange(id)}
            title={label}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === id
                ? 'bg-accent text-accent-fg shadow-sm'
                : 'text-fg-muted hover:text-fg hover:bg-bg-subtle'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{label}</span>
          </button>
        ))}
      </div>

      {showBlocks && (
        <div className="p-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-muted" />
            <input
              type="search"
              placeholder="Search components..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-bg-subtle text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <p className="text-[11px] text-fg-muted mt-2 px-0.5">Drag blocks onto the canvas</p>
        </div>
      )}

      <div
        id="tc-blocks-mount"
        className={`tc-blocks-mount flex-1 min-h-0 overflow-y-auto px-3 pb-3 ${showBlocks ? '' : 'hidden'}`}
      />

      <div className={`flex-1 min-h-0 overflow-y-auto p-3 ${showBlocks ? 'hidden' : ''}`}>
        {tab === 'templates' && (
          <div className="grid grid-cols-1 gap-3">
            {STARTER_TEMPLATES.map((t) => (
              <TemplateCard
                key={t.id}
                name={t.name}
                description={t.description}
                thumb={t.thumb}
                previewImage={t.previewImage}
                onApply={() => editor && applyStarterHtml(editor, t.html, t.css)}
              />
            ))}
          </div>
        )}

        {tab === 'assets' && (
          <div className="space-y-3">
            {/* Upload Button */}
            <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg border border-dashed border-border bg-bg-subtle text-sm font-medium text-fg-muted hover:border-accent hover:text-accent cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Image'}
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                className="hidden" 
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>

            {/* Upload Options Panel */}
            {showUploadOptions && !uploading && (
              <div className="space-y-3 animate-fade-in p-3 bg-bg-subtle rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-fg-muted">Choose placement:</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadOptions(false)
                      setPendingFiles([])
                      setUploadPlacement(null)
                      setOverlayText('')
                    }}
                    className="p-1 rounded-md hover:bg-bg-elevated transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-fg-muted" />
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadPlacement('image')}
                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
                      uploadPlacement === 'image' 
                        ? 'bg-accent text-accent-fg' 
                        : 'bg-bg-elevated border border-border hover:border-accent'
                    }`}
                  >
                    As Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadPlacement('background')}
                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
                      uploadPlacement === 'background' 
                        ? 'bg-accent text-accent-fg' 
                        : 'bg-bg-elevated border border-border hover:border-accent'
                    }`}
                  >
                    As Background
                  </button>
                </div>

                {uploadPlacement === 'background' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-xs font-medium text-fg-muted flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" />
                      Overlay Text
                    </label>
                    <input
                      type="text"
                      value={overlayText}
                      onChange={(e) => setOverlayText(e.target.value)}
                      placeholder="Enter text to display on image..."
                      className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-xs text-fg placeholder-fg-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                    />
                    <p className="text-[10px] text-fg-muted">Text will appear centered on the image.</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadOptions(false)
                      setPendingFiles([])
                      setUploadPlacement(null)
                      setOverlayText('')
                    }}
                    className="flex-1 py-1.5 px-3 text-xs font-medium rounded-md border border-border hover:bg-bg-elevated transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadWithOptions}
                    disabled={!uploadPlacement || (uploadPlacement === 'background' && !overlayText.trim())}
                    className="flex-1 py-1.5 px-3 text-xs font-medium rounded-md bg-accent text-accent-fg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}

            {uploadError && (
              <p className="text-xs text-danger bg-danger-muted rounded-lg px-3 py-2">{uploadError}</p>
            )}
            
            <p className="text-[11px] text-fg-muted px-0.5">Drag image onto canvas or click to insert.</p>
            
            <input
              type="search"
              placeholder="Search assets..."
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-subtle"
            />
            
            <div className="grid grid-cols-2 gap-2">
              {filteredAssets.map((a) => (
                <button
                  key={a.src}
                  type="button"
                  title="Drag to canvas or click to insert"
                  className="tc-asset-tile aspect-square rounded-lg overflow-hidden border border-border hover:border-accent hover:ring-2 hover:ring-accent/20 cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => {
                    if (!editor) return
                    if (!startAssetDrag(editor, a.src, e.nativeEvent)) {
                      insertImageComponent(editor, a.src)
                    }
                  }}
                  onClick={() => {
                    if (!editor || document.body.classList.contains('tc-is-dragging')) return
                    // ✅ Use the helper function instead of inline find()
                    const choice = window.confirm('Insert as Background with text overlay?\n\nClick OK for Background, Cancel for Image')
                    if (choice) {
                      const text = window.prompt('Enter overlay text:', 'Your Text Here') || 'Your Text Here'
                      insertBackgroundWithText(editor, a.src)
                      if (text) {
                        updateBackgroundText(editor, text)
                      }
                    } else {
                      insertImageComponent(editor, a.src)
                    }
                  }}
                >
                  <img src={a.src} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                </button>
              ))}
            </div>
            
            {filteredAssets.length === 0 && (
              <p className="text-xs text-fg-muted text-center py-6">No assets yet. Upload images to get started.</p>
            )}
          </div>
        )}

        {tab === 'pages' && (
          <div className="space-y-2">
            {pages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  selectPage(editor, p.id)
                  refreshPages()
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-border bg-bg-subtle hover:border-accent text-sm font-medium text-fg transition-colors"
              >
                {p.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const name = window.prompt('Page name', 'New Page')
                if (name) {
                  addPage(editor, name)
                  refreshPages()
                }
              }}
              className="w-full py-2.5 rounded-lg border border-dashed border-border text-sm text-fg-muted hover:text-accent hover:border-accent"
            >
              + Add page
            </button>
          </div>
        )}
      </div>

      <div
        id="tc-layers-panel"
        className={`flex-1 min-h-0 overflow-y-auto px-3 pb-3 tc-layers-host ${tab !== 'layers' ? 'hidden' : ''}`}
      />

      <div id="tc-traits-hidden" className="hidden" />
      <div id="tc-styles-hidden" className="hidden" />
    </aside>
  )
}

// ✅ Default export for compatibility
export default EditorSidebar;