import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import useStore from '../store/useStore'
import { loadPreviewHandoff, clearPreviewHandoff } from '../utils/previewHandoff'
import { buildPreviewDocument } from '../editor/services/exportSite'
import Button from '../components/ui/Button'
import DeviceSwitcher from '../components/ui/DeviceSwitcher'
import ThemeToggle from '../components/common/ThemeToggle'
import { runDevModeStylesValidation } from '../editor/utils/styleUtils'

// ── Module-level constants (stable across renders) ─────────────────────────
const MOBILE_OVERRIDE_STYLES = `
  <style id="tc-preview-device-styles">
    /* Preview mobile overrides — applied unconditionally in mobile mode */
    html, body { width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; }
    .tc-nav-hamburger { display: flex !important; font-size: 24px !important; cursor: pointer !important; color: #0f172a !important; }
    header, [data-tc-type="section"] > header {
      position: relative !important; display: flex !important; flex-wrap: wrap !important;
      align-items: center !important; justify-content: space-between !important; padding: 12px 16px !important;
    }
    header nav, header > nav, header nav[style], header > nav[style] {
      display: none !important; flex-direction: column !important; width: 100% !important;
      order: 3 !important; background: #fff !important; padding: 12px 16px !important;
      border-top: 1px solid #e2e8f0 !important; gap: 8px !important;
    }
    header nav a, header > nav a {
      width: 100% !important; text-align: center !important; padding: 10px 16px !important;
      display: block !important; white-space: normal !important;
    }
    .tc-nav-toggle:checked ~ nav, .tc-nav-toggle:checked ~ nav[style] { display: flex !important; }
    [data-tc-type="section"], section, footer { padding: 32px 16px !important; width: 100% !important; overflow-x: hidden !important; }
    section[style*="display:flex"], section[style*="display: flex"] { flex-direction: column !important; gap: 24px !important; }
    section > div[style*="display:flex"], section > div[style*="display: flex"] { flex-direction: column !important; align-items: stretch !important; }
    a[data-tc-type="button"] { display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
    div[style*="grid-template-columns:repeat(auto-fit"], div[style*="grid-template-columns: repeat(auto-fit"] { grid-template-columns: 1fr !important; }
    h1 { font-size: clamp(24px, 8vw, 32px) !important; } h2 { font-size: clamp(20px, 6vw, 26px) !important; }
  </style>
`

/**
 * Builds a preview srcDoc string with device-specific viewport meta and CSS overrides.
 * Must be called with the same args each time to leverage useMemo correctly.
 */
function buildDeviceAwareSrcDoc(mode, html, css, title, pgs) {
  const baseDoc = buildPreviewDocument(title, html, css, pgs)
  if (mode === 'mobile') {
    return baseDoc
      .replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<meta name="viewport" content="width=375, initial-scale=1.0">'
      )
      .replace('</head>', `${MOBILE_OVERRIDE_STYLES}</head>`)
  }
  if (mode === 'tablet') {
    return baseDoc.replace(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<meta name="viewport" content="width=768, initial-scale=1.0">'
    )
  }
  return baseDoc
}

export default function Preview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const loadProject = useStore((s) => s.loadProject)
  const project = useStore((s) => s.project)
  const previewMode = useStore((s) => s.previewMode)
  const setPreviewMode = useStore((s) => s.setPreviewMode)

  const handoff = useMemo(() => (id ? loadPreviewHandoff(id) : null), [id])
  const [activeFilename, setActiveFilename] = useState(() => handoff?.activePageFilename || 'index.html')

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  const pages = useMemo(() => handoff?.pages || [], [handoff])
  const activePage = useMemo(() => pages.find((p) => p.filename === activeFilename), [pages, activeFilename])

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'NAVIGATE_TO_PAGE') {
        const targetFilename = e.data.filename
        const targetPage = pages.find((p) => p.filename === targetFilename)
        if (targetPage) {
          setActiveFilename(targetFilename)
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [pages])

  const previewTitle = activePage ? `${handoff?.title || project?.title || 'Preview'} — ${activePage.name}` : (handoff?.title ?? project?.title ?? 'Preview')
  const previewHtml = activePage ? activePage.html : (handoff?.html ?? project?.html ?? '')
  const previewCss = activePage ? activePage.css : (handoff?.css ?? project?.css ?? '')

  const srcDoc = useMemo(
    () => buildDeviceAwareSrcDoc(previewMode, previewHtml, previewCss, previewTitle, pages),
    [previewHtml, previewCss, previewTitle, pages, previewMode]
  )

  const widthMap = { desktop: '100%', tablet: '768px', mobile: '375px' }

  const iframeRef = useRef(null)

  const handleIframeLoad = () => {
    if (import.meta.env.DEV && iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
      if (doc) {
        runDevModeStylesValidation(doc)
      }
    }
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-canvas">
        <div className="text-sm text-fg-muted animate-pulse">Loading preview...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-bg-canvas safe-top">
      <header className="shrink-0 border-b border-border glass">
        <div className="h-12 flex items-center gap-2 px-2 sm:px-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/builder/${id}`)} className="!px-2 shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Builder</span>
          </Button>
          <div className="divider-v hidden sm:block" />
          <span className="text-sm font-medium text-fg font-display truncate min-w-0 flex-1 sm:flex-none">
            {previewTitle}
          </span>
          <div className="flex-1 hidden sm:block" />
          <DeviceSwitcher value={previewMode} onChange={setPreviewMode} />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-4 lg:p-6 flex justify-center bg-stripe-pattern">
        <div
          className="bg-bg-elevated shadow-lg rounded-lg sm:rounded-xl overflow-hidden border border-border w-full preview-canvas-frame"
          style={{ width: widthMap[previewMode], maxWidth: '100%', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <iframe
            ref={iframeRef}
            onLoad={handleIframeLoad}
            title={`Preview: ${previewTitle}`}
            srcDoc={srcDoc}
            className="w-full h-full min-h-[min(400px,70vh)] sm:min-h-[min(500px,75vh)] lg:min-h-[600px] border-0"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>
    </div>
  )
}
