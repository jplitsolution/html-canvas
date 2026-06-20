import { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import useStore from '../store/useStore'
import { loadPreviewHandoff, clearPreviewHandoff } from '../utils/previewHandoff'
import { buildPreviewDocument } from '../editor/services/exportSite'
import Button from '../components/ui/Button'
import DeviceSwitcher from '../components/ui/DeviceSwitcher'
import ThemeToggle from '../components/common/ThemeToggle'

export default function Preview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const loadProject = useStore((s) => s.loadProject)
  const project = useStore((s) => s.project)
  const previewMode = useStore((s) => s.previewMode)
  const setPreviewMode = useStore((s) => s.setPreviewMode)

  const handoff = useMemo(() => (id ? loadPreviewHandoff(id) : null), [id])

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  useEffect(() => {
    if (id && handoff) clearPreviewHandoff(id)
  }, [id, handoff])

  const previewTitle = handoff?.title ?? project?.title ?? 'Preview'
  const previewHtml = handoff?.html ?? project?.html ?? ''
  const previewCss = handoff?.css ?? project?.css ?? ''

  const srcDoc = useMemo(
    () => buildPreviewDocument(previewTitle, previewHtml, previewCss),
    [previewHtml, previewCss, previewTitle]
  )

  const widthMap = { desktop: '100%', tablet: '768px', mobile: '375px' }

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
          style={{ width: widthMap[previewMode], maxWidth: '100%' }}
        >
          <iframe
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
