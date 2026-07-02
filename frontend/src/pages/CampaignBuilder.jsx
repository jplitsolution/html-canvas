import { lazy, Suspense, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import useStore from '../store/useStore'
import { PAGE_TYPE_LABELS } from '../services/api/campaigns'
import Button from '../components/ui/Button'
import { saveCampaignPage } from '../editor/services/saveCampaignPage'

const TemplateEditor = lazy(() => import('../editor/TemplateEditor'))

function BuilderFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-bg-canvas">
      <div className="text-sm text-fg-muted animate-pulse">Loading editor...</div>
    </div>
  )
}

export default function CampaignBuilder() {
  const { id, pageType } = useParams()
  const navigate = useNavigate()
  const campaign = useStore((s) => s.campaign)
  const campaignPage = useStore((s) => s.campaignPage)
  const loading = useStore((s) => s.loading)
  const error = useStore((s) => s.error)
  const loadCampaign = useStore((s) => s.loadCampaign)
  const loadCampaignPage = useStore((s) => s.loadCampaignPage)

  useEffect(() => {
    if (id) loadCampaign(id)
  }, [id, loadCampaign])

  useEffect(() => {
    if (id && pageType) loadCampaignPage(id, pageType)
  }, [id, pageType, loadCampaignPage])

  const pageLabel = PAGE_TYPE_LABELS[pageType] || pageType

  const saveHandler = useCallback(
    async (editor) => {
      if (!id || !pageType) return null
      await saveCampaignPage(editor, id, pageType)
      return { id, pageType }
    },
    [id, pageType],
  )

  const handleEditorSave = useCallback(() => {
    useStore.getState().addToast('Page saved successfully', 'success')
    if (id) loadCampaign(id)
  }, [id, loadCampaign])

  const initialData = useMemo(
    () => ({
      projectData: campaignPage?.projectData || {},
      html: campaignPage?.html || '',
      css: campaignPage?.css || '',
    }),
    [campaignPage?.pageType, id],
  )

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-canvas">
        <div className="text-sm text-fg-muted animate-pulse">Loading page editor...</div>
      </div>
    )
  }

  if (error || !campaign || !campaignPage) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-bg-canvas px-4">
        <p className="text-sm text-fg-muted text-center">{error || 'Page not found'}</p>
        <Button variant="outline" onClick={() => navigate(id ? `/campaigns/${id}` : '/campaigns')}>
          Back to campaign
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-bg-canvas safe-top overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-bg-elevated shrink-0">
        <Link
          to={`/campaigns/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="w-4 h-4" />
          {campaign.country} / {campaign.operator}
        </Link>
        <span className="text-fg-subtle">/</span>
        <span className="text-sm font-medium text-fg">{pageLabel}</span>
      </div>
      <Suspense fallback={<BuilderFallback />}>
        <TemplateEditor
          projectId={`${id}-${pageType}`}
          projectTitle={`${campaign.name} - ${pageLabel}`}
          initialData={initialData}
          onSave={handleEditorSave}
          saveHandler={saveHandler}
        />
      </Suspense>
    </div>
  )
}
