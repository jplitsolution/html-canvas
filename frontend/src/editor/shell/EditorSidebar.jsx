import { useState, useEffect, useCallback } from 'react'
import {
  LayoutTemplate,
  Boxes,
  Layers,
  ImageIcon,
  Search,
  Upload,
  ChevronLeft,
  Puzzle,
  ShieldCheck,
  Code2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { RawHtmlPanel } from './RawHtmlPanel'
import { useEditor } from '../context/EditorContext'
import { TemplateCard } from './BlockCard'
import { STARTER_TEMPLATES, OTP_STARTER_TEMPLATES, CONFIRM_STARTER_TEMPLATES, HOME_STARTER_TEMPLATES, THANKYOU_STARTER_TEMPLATES, INPROGRESS_STARTER_TEMPLATES, LOW_BALANCE_STARTER_TEMPLATES, BLOCKED_STARTER_TEMPLATES, ERROR_STARTER_TEMPLATES } from '../templates/starterTemplates'
import { applyStarterHtml } from '../utils/blockActions'
import { ensureLayerManagerMounted, filterBlockElements } from '../plugins/dragAndDrop'
import { startAssetDrag } from '../plugins/assetDrag'
import { insertImageComponent } from '../utils/insertImage'
import { insertBackgroundWithText } from '../utils/insertBackground'
import { unlockInsertion } from '../utils/insertionLock'
import { uploadImage } from '../../services/api/upload'
import { PlacementModal } from '../components/PlacementModal'
import { FUNNEL_PAGE_GUIDES } from '../utils/funnelGuide'

const TABS = [
  { id: 'flow', label: 'Required parts', hint: 'Re-add flow buttons & fields the page needs', icon: ShieldCheck },
  { id: 'layouts', label: 'Ready layouts', hint: 'Start with a full page design', icon: LayoutTemplate },
  { id: 'sections', label: 'Sections', hint: 'Drag big blocks onto the page', icon: Layers },
  { id: 'parts', label: 'Parts', hint: 'Buttons, text, images & more', icon: Puzzle },
  { id: 'photos', label: 'Your photos', hint: 'Upload and add images', icon: ImageIcon },
  { id: 'structure', label: 'Page outline', hint: 'See everything on the page', icon: Boxes },
  { id: 'code', label: 'Code', hint: 'Edit raw HTML and CSS of the entire page', icon: Code2 },
]

function findHeadingInSection(section) {
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

function updateBackgroundText(editor, text) {
  if (!editor) return
  const wrapper = editor.getWrapper()
  if (!wrapper) return
  const components = wrapper.components()
  const lastSection = components.at(components.length - 1)
  if (!lastSection) return
  const heading = findHeadingInSection(lastSection)
  if (heading) heading.set('content', text)
}

const SIDEBAR_COLLAPSED_KEY = 'tc-editor-sidebar-collapsed'

export function EditorSidebar() {
  const { editor, funnelPageType } = useEditor()
  const flowGuide = funnelPageType ? FUNNEL_PAGE_GUIDES[funnelPageType] : undefined
  const hasFlowParts = Boolean(flowGuide && flowGuide.required.length > 0)
  const [tab, setTab] = useState(
    hasFlowParts ? 'flow' : 'layouts',
  )
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [search, setSearch] = useState('')
  const [assetSearch, setAssetSearch] = useState('')
  const [assets, setAssets] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [placementModal, setPlacementModal] = useState(null)
  const [deletingAsset, setDeletingAsset] = useState(null)
  const [brokenAssets, setBrokenAssets] = useState([])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const selectTab = useCallback((id) => {
    setTab(id)
    setCollapsed((prev) => {
      if (!prev) return prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '0')
      } catch {
        /* ignore */
      }
      return false
    })
  }, [])

  const refreshAssets = useCallback(() => {
    if (!editor) return
    const all = editor.AssetManager.getAll()
    setAssets(
      all
        .map((asset) => ({ src: asset.get('src') || '' }))
        .filter((asset) => asset.src.trim().length > 0),
    )
  }, [editor])

  const insertAsset = useCallback(
    (src, placement, overlayText) => {
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

  const openPlacementForAsset = useCallback((src) => {
    if (document.body.classList.contains('tc-is-dragging')) return
    setPlacementModal({ src })
  }, [])

  const deleteAsset = useCallback((src, e) => {
    e.stopPropagation()
    e.preventDefault()
    if (!editor) return
    const all = editor.AssetManager.getAll()
    const asset = all.find((a) => a.get('src') === src)
    if (asset) {
      editor.AssetManager.remove(asset)
    }
    setDeletingAsset(null)
    refreshAssets()
  }, [editor, refreshAssets])

  const handlePlacementConfirm = useCallback(
    (placement, overlayText) => {
      if (!editor || !placementModal) return
      unlockInsertion()

      if (placement === 'set-background') {
        const selectedCmp = editor.getSelected() || editor.getWrapper()
        if (selectedCmp) {
          const existingStyle = selectedCmp.getStyle() || {}
          selectedCmp.setStyle({
            ...existingStyle,
            'background-image': `url("${placementModal.src}")`,
            'background-size': 'cover',
            'background-position': 'center',
            'background-repeat': 'no-repeat',
            'position': existingStyle.position || 'relative',
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

  const handleFileUpload = async (e) => {
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
      const urls = (await Promise.all(uploadPromises)).filter((url) => !!url)
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
      <aside className="tc-sidebar shrink-0 flex border-r border-gray-100 bg-white min-h-0 relative overflow-hidden">
        <nav className="w-12 shrink-0 flex flex-col items-center py-3 gap-1.5 bg-slate-50/50">
          {TABS.filter(
            (t) => !(t.id === 'flow' && !hasFlowParts),
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              title={label}
              aria-pressed={tab === id && !collapsed}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 ${
                tab === id && !collapsed
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : tab === id && collapsed
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/80'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="flex-1" />
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? 'Show panel' : 'Hide panel'}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </nav>

        <div
          className={`flex flex-col min-h-0 min-w-0 bg-white overflow-hidden transition-[width] duration-200 ease-out ${
            collapsed ? 'w-0 border-0' : 'w-60 border-l border-gray-100'
          }`}
          aria-hidden={collapsed}
        >
          <div className="px-3 py-3 border-b border-gray-100 shrink-0 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider truncate">{activeTab?.label}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{activeTab?.hint}</p>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Hide panel"
              className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
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
                  } else if (funnelPageType === 'INPROGRESS') {
                    list = INPROGRESS_STARTER_TEMPLATES;
                  } else if (funnelPageType === 'LOW_BALANCE') {
                    list = LOW_BALANCE_STARTER_TEMPLATES;
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
