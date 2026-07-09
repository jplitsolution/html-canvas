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
} from 'lucide-react'
import { RawHtmlPanel } from './RawHtmlPanel'
import { useEditor } from '../context/EditorContext'
import { TemplateCard } from './BlockCard'
import { STARTER_TEMPLATES, OTP_STARTER_TEMPLATES, CONFIRM_STARTER_TEMPLATES } from '../templates/starterTemplates'
import { applyStarterHtml } from '../utils/blockActions'
import { ensureLayerManagerMounted, filterBlockElements } from '../plugins/dragAndDrop'
import { startAssetDrag } from '../plugins/assetDrag'
import { insertImageComponent } from '../utils/insertImage'
import { insertBackgroundWithText } from '../utils/insertBackground'
import { uploadImage } from '../../services/api/upload'
import { PlacementModal } from '../components/PlacementModal'
import { FUNNEL_PAGE_GUIDES, type FunnelPageType } from '../utils/funnelGuide'

type SidebarTab = 'flow' | 'layouts' | 'sections' | 'parts' | 'photos' | 'structure'

const TABS: { id: SidebarTab; label: string; hint: string; icon: typeof Boxes }[] = [
  { id: 'flow', label: 'Required parts', hint: 'Re-add flow buttons & fields the page needs', icon: ShieldCheck },
  { id: 'layouts', label: 'Ready layouts', hint: 'Start with a full page design', icon: LayoutTemplate },
  { id: 'sections', label: 'Sections', hint: 'Drag big blocks onto the page', icon: Layers },
  { id: 'parts', label: 'Parts', hint: 'Buttons, text, images & more', icon: Puzzle },
  { id: 'photos', label: 'Your photos', hint: 'Upload and add images', icon: ImageIcon },
  { id: 'structure', label: 'Page outline', hint: 'See everything on the page', icon: Boxes },
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
    hasFlowParts ? 'flow' : isFunnelPage ? 'sections' : 'layouts',
  )
  const [search, setSearch] = useState('')
  const [assetSearch, setAssetSearch] = useState('')
  const [assets, setAssets] = useState<Array<{ src: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [placementModal, setPlacementModal] = useState<{ src: string } | null>(null)

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

  const handlePlacementConfirm = useCallback(
    (placement: 'inline' | 'background', overlayText?: string) => {
      if (!editor || !placementModal) return
      insertAsset(placementModal.src, placement, overlayText)
      setPlacementModal(null)
      refreshAssets()
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
    const file = e.target.files[0]
    e.target.value = ''
    setUploading(true)
    setUploadError(null)
    try {
      const result = await uploadImage(file)
      editor.AssetManager.add({ src: result.url, type: 'image', name: file.name })
      refreshAssets()
      setPlacementModal({ src: result.url })
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

  return (
    <>
      <aside className="tc-sidebar shrink-0 flex border-r border-border bg-bg-elevated min-h-0">
        {/* Icon rail */}
        <nav className="w-14 shrink-0 flex flex-col items-center py-3 gap-1 border-r border-border bg-bg-subtle/50">
          {TABS.filter(
            (t) => !(isFunnelPage && t.id === 'layouts' && funnelPageType !== 'OTP' && funnelPageType !== 'CONFIRM') && !(t.id === 'flow' && !hasFlowParts),
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              title={label}
              className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
                tab === id
                  ? 'bg-accent text-accent-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg hover:bg-bg-muted'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="w-64 flex flex-col min-h-0 min-w-0">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold text-fg">{activeTab?.label}</h2>
            <p className="text-xs text-fg-muted mt-0.5">{activeTab?.hint}</p>
          </div>

          {showBlocks && (
            <div className="px-3 py-3 border-b border-border shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-muted" />
                <input
                  type="search"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-border bg-bg-subtle text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <p className="text-[11px] text-fg-muted mt-2">Drag onto the page in the center →</p>
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
                  if (funnelPageType === 'OTP') {
                    list = OTP_STARTER_TEMPLATES;
                  } else if (funnelPageType === 'CONFIRM') {
                    list = CONFIRM_STARTER_TEMPLATES;
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
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
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
                  {filteredAssets.map((a) => (
                    <button
                      key={a.src}
                      type="button"
                      title="Click to add to page"
                      className="aspect-square rounded-lg overflow-hidden border border-border hover:border-accent hover:ring-2 hover:ring-accent/20 cursor-pointer"
                      onMouseDown={(e) => {
                        if (!editor) return
                        if (!startAssetDrag(editor, a.src, e.nativeEvent)) {
                          insertImageComponent(editor, a.src)
                        }
                      }}
                      onClick={() => openPlacementForAsset(a.src)}
                    >
                      <img src={a.src} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                    </button>
                  ))}
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
          </div>

          {/* Advanced code — hidden by default */}
          <div className="shrink-0 border-t border-border">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
            >
              <span>For developers: edit code</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showAdvanced && (
              <div className="h-48 px-3 pb-3 overflow-hidden">
                <RawHtmlPanel editor={editor} active={showAdvanced} />
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
      />
    </>
  )
}

export default EditorSidebar
