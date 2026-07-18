import { useState, useEffect, useCallback } from 'react'
import type { Asset } from 'grapesjs'
import {
  LayoutTemplate,
  Boxes,
  Layers,
  ImageIcon,
  Search,
  Upload,
  ChevronDown,
  ChevronUp,
  Puzzle,
  ShieldCheck,
  Code2,
} from 'lucide-react'
import { RawHtmlPanel } from './RawHtmlPanel'
import { useEditor } from '../context/EditorContext'
import { TemplateCard } from './BlockCard'
import { STARTER_TEMPLATES, OTP_STARTER_TEMPLATES, CONFIRM_STARTER_TEMPLATES, HOME_STARTER_TEMPLATES, THANKYOU_STARTER_TEMPLATES, BLOCKED_STARTER_TEMPLATES, ERROR_STARTER_TEMPLATES } from '../templates/starterTemplates'
import { applyStarterHtml } from '../utils/blockActions'
import { ensureLayerManagerMounted, filterBlockElements } from '../plugins/dragAndDrop'
import { startAssetDrag } from '../plugins/assetDrag'
import { insertImageComponent } from '../utils/insertImage'
import { insertBackgroundWithText } from '../utils/insertBackground'
import { unlockInsertion } from '../utils/insertionLock'
import { uploadImage } from '../../services/api/upload'
import { PlacementModal } from '../components/PlacementModal'
import { FUNNEL_PAGE_GUIDES, type FunnelPageType } from '../utils/funnelGuide'

type SidebarTab = 'flow' | 'layouts' | 'sections' | 'parts' | 'photos' | 'structure' | 'code'

const TABS: { id: SidebarTab; label: string; hint: string; icon: typeof Boxes }[] = [
  { id: 'flow', label: 'Required parts', hint: 'Re-add flow buttons & fields the page needs', icon: ShieldCheck },
  { id: 'layouts', label: 'Ready layouts', hint: 'Start with a full page design', icon: LayoutTemplate },
  { id: 'sections', label: 'Sections', hint: 'Drag big blocks onto the page', icon: Layers },
  { id: 'parts', label: 'Parts', hint: 'Buttons, text, images & more', icon: Puzzle },
  { id: 'photos', label: 'Your photos', hint: 'Upload and add images', icon: ImageIcon },
  { id: 'structure', label: 'Page outline', hint: 'See everything on the page', icon: Boxes },
  { id: 'code', label: 'Code', hint: 'Edit raw HTML and CSS of the entire page', icon: Code2 },
]

function findHeadingInSection(section: any): any | null {
  if (!section) return null
  const tag = section.get('tagName')
  const gjsType = section.get('data-gjs-type')
  if (tag === 'h2' && gjsType === 'text') return section
  for (const child of section.components()) {
    const result = findHeadingInSection(child)
    if (result) return result
  }
  return null
}

function updateBackgroundText(editor: any, text: string): void {
  if (!editor) return
  const wrapper = editor.getWrapper()
  if (!wrapper) return
  const components = wrapper.components()
  const lastSection = components.at(components.length - 1)
  if (!lastSection) return
  const heading = findHeadingInSection(lastSection)
  if (heading) heading.set('content', text)
}

export function EditorSidebar() {
  const { editor, funnelPageType } = useEditor()
  const isFunnelPage = Boolean(funnelPageType)
  const flowGuide = funnelPageType ? FUNNEL_PAGE_GUIDES[funnelPageType as FunnelPageType] : undefined
  const hasFlowParts = Boolean(flowGuide && flowGuide.required.length > 0)
  const [tab, setTab] = useState<SidebarTab>(
    hasFlowParts ? 'flow' : 'layouts',
  )
  const [search, setSearch] = useState('')
  const [assetSearch, setAssetSearch] = useState('')
  const [assets, setAssets] = useState<Array<{ src: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [placementModal, setPlacementModal] = useState<{ src: string } | null>(null)
  const [deletingAsset, setDeletingAsset] = useState<string | null>(null)
  const [brokenAssets, setBrokenAssets] = useState<string[]>([])

  const refreshAssets = useCallback(() => {
    if (!editor) return
    const all = editor.AssetManager.getAll()
    setAssets(
      all
        .map((asset: Asset) => ({ src: (asset.get('src') as string) || '' }))
        .filter((asset: { src: string }) => asset.src.trim().length > 0),
    )
  }, [editor])

  const insertAsset = useCallback(
    (src: string, placement: 'inline' | 'background', overlayText?: string) => {
      if (!editor) return
      if (placement === 'background') {
        insertBackgroundWithText(editor, src)
        if (overlayText?.trim()) updateBackgroundText(editor, overlayText.trim())
      } else {
        insertImageComponent(editor, src)
      }
    },
    [editor],
  )

  const openPlacementForAsset = useCallback((src: string) => {
    if (document.body.classList.contains('tc-is-dragging')) return
    setPlacementModal({ src })
  }, [])

  const deleteAsset = useCallback((src: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!editor) return
    // Find and remove from GrapesJS AssetManager
    const all = editor.AssetManager.getAll()
    const asset = all.find((a: Asset) => (a.get('src') as string) === src)
    if (asset) {
      editor.AssetManager.remove(asset)
    }
    setDeletingAsset(null)
    refreshAssets()
  }, [editor, refreshAssets])

  const handlePlacementConfirm = useCallback(
    (placement: 'inline' | 'background' | 'set-background', overlayText?: string) => {
      if (!editor || !placementModal) return
      unlockInsertion()

      if (placement === 'set-background') {
        // Use the currently selected component OR the wrapper as fallback
        const selectedCmp = editor.getSelected() || editor.getWrapper()
        if (selectedCmp) {
          // ── Write as inline style so it always appears in exported HTML ──
          // addStyle() writes to GrapesJS CSS manager (separate <style> block) which
          // can be overridden or lost. setStyle() merges into the element's style attr.
          const existingStyle = selectedCmp.getStyle() || {}
          selectedCmp.setStyle({
            ...existingStyle,
            'background-image': `url("${placementModal.src}")`,
            'background-size': 'cover',
            'background-position': 'center',
            'background-repeat': 'no-repeat',
            // Ensure section can contain absolutely positioned hotspots
            'position': existingStyle.position || 'relative',
            // overflow must NOT be hidden — clips both background and absolute children
            'overflow': 'visible',
          })
          console.log('[TC] set-background applied inline style to', selectedCmp.get('tagName'))
        }
      } else {
        insertAsset(placementModal.src, placement, overlayText)
        if (placement === 'background' && overlayText?.trim()) updateBackgroundText(editor, overlayText.trim())
      }

      setPlacementModal(null)
      refreshAssets()

      // Force canvas refresh and focus iframe so it draws/selects the element immediately
      setTimeout(() => {
        if (editor) {
          editor.Canvas.refresh()
          try {
            const body = editor.Canvas.getBody()
            if (body && typeof body.focus === 'function') {
              body.focus()
            }
          } catch (e) {
            console.warn('Failed to focus editor canvas:', e)
          }
        }
      }, 50)
    },
    [editor, placementModal, insertAsset, refreshAssets],
  )

  useEffect(() => {
    if (!editor) return
    if (tab === 'flow') filterBlockElements(editor, 'flow', search)
    if (tab === 'sections') filterBlockElements(editor, 'sections', search)
    if (tab === 'parts') filterBlockElements(editor, 'components', search)
    if (tab === 'structure') ensureLayerManagerMounted(editor)
  }, [editor, tab, search])

  useEffect(() => {
    if (!editor) return
    editor.on('asset:add', refreshAssets)
    editor.on('asset:remove', refreshAssets)
    if (tab === 'photos') refreshAssets()
    return () => {
      editor.off('asset:add', refreshAssets)
      editor.off('asset:remove', refreshAssets)
    }
  }, [editor, tab, refreshAssets])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor || !e.target.files?.length) return
    const files = Array.from(e.target.files)
    e.target.value = ''
    setUploading(true)
    setUploadError(null)
    try {
      const uploadPromises = files.map(async (file) => {
        if (!file.type.startsWith('image/')) return null
        const result = await uploadImage(file)
        editor.AssetManager.add({ src: result.url, type: 'image', name: file.name })
        return result.url
      })
      const urls = (await Promise.all(uploadPromises)).filter((url): url is string => !!url)
      refreshAssets()
      if (urls.length === 1) {
        setPlacementModal({ src: urls[0] })
      }
      setTab('photos')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const showBlocks = tab === 'flow' || tab === 'sections' || tab === 'parts'
  const activeTab = TABS.find((t) => t.id === tab)
  const filteredAssets = assets.filter((a) =>
    assetSearch ? a.src.toLowerCase().includes(assetSearch.toLowerCase()) : true,
  )

  // Check if a section/generic block is currently selected (for "Set as background" option)
  const selectedKind = (() => {
    if (!editor) return 'none'
    const sel = editor.getSelected()
    if (!sel) return 'none'
    const tag = (sel.get('tagName') || '').toLowerCase()
    const type = sel.get('type') || ''
    const tcType = sel.getAttributes?.()?.['data-tc-type'] || ''
    if (tcType === 'section' || ['section', 'main', 'article', 'header', 'footer', 'div'].includes(tag) || type === 'wrapper') return 'section'
    return 'other'
  })()
  const hasSelectedSection = selectedKind === 'section'

  return (
    <>
      <aside className="tc-sidebar shrink-0 flex border-r border-gray-100 bg-white min-h-0">
        {/* Icon rail */}
        <nav className="w-14 shrink-0 flex flex-col items-center py-4 gap-2 border-r border-gray-100 bg-slate-50/50">
          {TABS.filter(
            (t) => !(t.id === 'flow' && !hasFlowParts),
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              title={label}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
                tab === id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-[1.03]'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/80'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="w-64 flex flex-col min-h-0 min-w-0 bg-white">
          <div className="px-4 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{activeTab?.label}</h2>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{activeTab?.hint}</p>
          </div>

          {showBlocks && (
            <div className="px-3 py-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search parts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/30 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                />
              </div>
              <p className="text-[10px] font-semibold text-indigo-500 mt-2 flex items-center gap-1">
                <span>Drag onto the page in the center →</span>
              </p>
            </div>
          )}

          <div
            id="tc-blocks-mount"
            className={`tc-blocks-mount flex-1 min-h-0 overflow-y-auto px-3 pb-3 ${showBlocks ? '' : 'hidden'}`}
          />

          <div className={`flex-1 min-h-0 overflow-y-auto ${showBlocks ? 'hidden' : 'flex flex-col'}`}>
            {tab === 'layouts' && (
              <div className="p-3 grid grid-cols-1 gap-3">
                {(() => {
                  let list = STARTER_TEMPLATES;
                  if (funnelPageType === 'HOME') {
                    list = HOME_STARTER_TEMPLATES;
                  } else if (funnelPageType === 'OTP') {
                    list = OTP_STARTER_TEMPLATES;
                  } else if (funnelPageType === 'CONFIRM') {
                    list = CONFIRM_STARTER_TEMPLATES;
                  } else if (funnelPageType === 'THANKYOU') {
                    list = THANKYOU_STARTER_TEMPLATES;
                  } else if (funnelPageType === 'BLOCKED') {
                    list = BLOCKED_STARTER_TEMPLATES;
                  } else if (funnelPageType === 'ERROR') {
                    list = ERROR_STARTER_TEMPLATES;
                  }
                  return list.map((t) => (
                    <TemplateCard
                      key={t.id}
                      name={t.name}
                      description={t.description}
                      thumb={t.thumb}
                      previewImage={t.previewImage}
                      onApply={() => editor && applyStarterHtml(editor, t.html, t.css)}
                    />
                  ));
                })()}
              </div>
            )}

            {tab === 'photos' && (
              <div className="p-3 space-y-3 flex-1 min-h-0 overflow-y-auto">
                <label className="flex items-center justify-center gap-2 w-full py-3 px-3 rounded-lg border border-dashed border-border bg-bg-subtle text-sm font-medium text-fg-muted hover:border-accent hover:text-accent cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload a photo'}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>

                {uploadError && (
                  <p className="text-xs text-danger bg-danger-muted rounded-md px-3 py-2">{uploadError}</p>
                )}

                <p className="text-[11px] text-fg-muted">Click a photo to choose how it appears on your page.</p>

                <input
                  type="search"
                  placeholder="Search photos..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-subtle"
                />

                <div className="grid grid-cols-2 gap-2">
                  {filteredAssets.map((a) => {
                    const isBroken = brokenAssets.includes(a.src)
                    return (
                      <div
                        key={a.src}
                        className={`relative aspect-square rounded-lg overflow-hidden border border-border hover:border-accent hover:ring-2 hover:ring-accent/20 group flex flex-col items-center justify-center text-center bg-bg-subtle`}
                      >
                        {isBroken ? (
                          <div className="flex flex-col items-center justify-center p-2 text-fg-muted select-none">
                            <ImageIcon className="w-8 h-8 mb-1 text-slate-400 opacity-40" />
                            <span className="text-[10px] font-semibold tracking-wide uppercase text-slate-400">Missing</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            title="Click to add to page"
                            className="w-full h-full cursor-pointer block"
                            onMouseDown={(e) => {
                              if (editor) {
                                startAssetDrag(editor, a.src, e.nativeEvent)
                              }
                            }}
                            onClick={() => openPlacementForAsset(a.src)}
                          >
                            <img
                              src={a.src}
                              alt=""
                              className="w-full h-full object-cover pointer-events-none"
                              draggable={false}
                              onError={() => {
                                setBrokenAssets((prev) => [...prev, a.src])
                              }}
                            />
                          </button>
                        )}
                        {/* Delete button — appears on hover */}
                        <button
                          type="button"
                          title="Delete this image"
                          onClick={(e) => deleteAsset(a.src, e)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>

                {filteredAssets.length === 0 && (
                  <p className="text-xs text-fg-muted text-center py-8">No photos yet. Upload one to get started.</p>
                )}
              </div>
            )}

            {tab === 'structure' && (
              <div className="flex-1 min-h-0 flex flex-col p-3">
                <p className="text-[11px] text-fg-muted mb-2 shrink-0">
                  Click any item to select it on the page. Useful when something is hard to click.
                </p>
                <div id="tc-layers-panel" className="tc-layers-host flex-1 min-h-0 overflow-y-auto" />
              </div>
            )}

            {tab === 'code' && (
              <div className="flex-1 min-h-0 flex flex-col p-3">
                <RawHtmlPanel editor={editor} active={tab === 'code'} />
              </div>
            )}
          </div>
        </div>
      </aside>

      <div id="tc-traits-hidden" className="hidden" />
      <div id="tc-styles-hidden" className="hidden" />

      <PlacementModal
        isOpen={!!placementModal}
        imageUrl={placementModal?.src ?? null}
        uploading={uploading}
        onClose={() => setPlacementModal(null)}
        onConfirm={handlePlacementConfirm}
        hasSelectedSection={hasSelectedSection}
      />
    </>
  )
}

export default EditorSidebar
