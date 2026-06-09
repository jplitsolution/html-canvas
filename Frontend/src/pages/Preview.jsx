import { memo, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import useStore from '../store/useStore'
import { generateHTML } from '../utils/htmlGenerator'
import { loadPreviewHandoff, clearPreviewHandoff } from '../utils/previewHandoff'
import Button from '../components/ui/Button'
import DeviceSwitcher from '../components/ui/DeviceSwitcher'
import ThemeToggle from '../components/common/ThemeToggle'

function Preview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const loadProject = useStore((s) => s.loadProject)
  const project = useStore((s) => s.project)
  const layout = useStore((s) => s.layout)
  const previewMode = useStore((s) => s.previewMode)
  const setPreviewMode = useStore((s) => s.setPreviewMode)

  const handoff = useMemo(() => (id ? loadPreviewHandoff(id) : null), [id])

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  useEffect(() => {
    if (handoff?.previewMode) setPreviewMode(handoff.previewMode)
  }, [handoff, setPreviewMode])

  useEffect(() => {
    if (id && handoff) clearPreviewHandoff(id)
  }, [id, handoff])

  const previewLayout = handoff?.layout ?? layout
  const previewTitle = handoff?.title ?? project?.title ?? 'Preview'

  const html = useMemo(() => {
    if (!previewLayout.length) return generateHTML([], previewTitle, previewMode)
    return generateHTML(previewLayout, previewTitle, previewMode)
  }, [previewLayout, previewTitle, previewMode])

  const widthMap = { desktop: '100%', tablet: '768px', mobile: '375px' }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-canvas">
        <div className="text-sm text-fg-muted animate-pulse">Loading preview...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-bg-canvas">
      <header className="h-12 shrink-0 border-b border-border glass flex items-center gap-3 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/builder/${id}`)} className="!px-2">
          <ArrowLeft className="w-4 h-4" /> Back to Builder
        </Button>
        <div className="divider-v" />
        <span className="text-sm font-medium text-fg font-display">{previewTitle}</span>
        <div className="flex-1" />
        <DeviceSwitcher value={previewMode} onChange={setPreviewMode} />
        <ThemeToggle />
      </header>
      <div className="flex-1 overflow-auto p-6 flex justify-center bg-stripe-pattern">
        <div
          className="bg-bg-elevated shadow-lg rounded-xl overflow-hidden border border-border"
          style={{ width: widthMap[previewMode], maxWidth: '100%', minHeight: '600px' }}
        >
          <iframe
            title={`Preview: ${previewTitle}`}
            srcDoc={html}
            className="w-full h-full min-h-[600px] border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}

export default memo(Preview)
