import { lazy, Suspense, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useStore from '../store/useStore'
import { PAGE_TYPE_LABELS, getCampaignPagePreviewUrl } from '../services/api/campaigns'
import Button from '../components/ui/Button'
import { saveCampaignPage } from '../editor/services/saveCampaignPage'
import { validateFunnelPage } from '../editor/utils/funnelGuide'
import {
  campaignDetailPath,
  resolveMarketCodes,
} from '../utils/routes'

const TemplateEditor = lazy(() => import('../editor/TemplateEditor'))

function BuilderFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-bg-canvas">
      <div className="text-sm text-fg-muted animate-pulse">Loading editor...</div>
    </div>
  )
}

export default function CampaignBuilder() {
  const { id, pageType, countryCode: routeCountry, operatorCode: routeOperator } = useParams()
  const navigate = useNavigate()
  const campaign = useStore((s) => s.campaign)
  const campaignPage = useStore((s) => s.campaignPage)
  const loading = useStore((s) => s.loading)
  const error = useStore((s) => s.error)
  const loadCampaign = useStore((s) => s.loadCampaign)
  const loadCampaignPage = useStore((s) => s.loadCampaignPage)
  const afterPageSaved = useStore((s) => s.afterPageSaved)

  useEffect(() => {
    if (id) loadCampaign(id)
  }, [id, loadCampaign])

  useEffect(() => {
    if (id && pageType) loadCampaignPage(id, pageType)
  }, [id, pageType, loadCampaignPage])

  const pageLabel = PAGE_TYPE_LABELS[pageType] || pageType
  const { countryCode, operatorCode } = resolveMarketCodes(
    { countryCode: routeCountry, operatorCode: routeOperator },
    campaign,
  )
  const detailHref = campaignDetailPath(countryCode, operatorCode, id)

  const saveHandler = useCallback(
    async (editor, meta) => {
      if (!id || !pageType) return null

      const { ok, missing } = validateFunnelPage(editor, pageType)
      if (!ok) {
        useStore.getState().addToast(
          `Warning: missing ${missing.map((m) => m.label).join(', ')}. Save anyway — subscription may not work until you restore them.`,
          'warning',
        )
      }

      const saved = await saveCampaignPage(editor, id, pageType, meta?.customWidth, meta?.customHeight)
      await afterPageSaved(id, pageType, saved)
      return { id, pageType }
    },
    [id, pageType, afterPageSaved],
  )

  const handleEditorSave = useCallback(() => {
    useStore.getState().addToast('Page saved successfully', 'success')
  }, [])

  const handlePreview = useCallback(() => {
    if (!campaign) return
    const url = getCampaignPagePreviewUrl(campaign, pageType)
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [campaign, pageType])

  const initialData = useMemo(
    () => ({
      projectData: campaignPage?.projectData || {},
      html: campaignPage?.html || '',
      css: campaignPage?.css || '',
    }),
    [campaignPage, id, pageType],
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
        <Button variant="outline" onClick={() => navigate(detailHref || '/markets')}>
          Back to campaign
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-bg-canvas safe-top overflow-hidden">
      <Suspense fallback={<BuilderFallback />}>
        <TemplateEditor
          projectId={`${id}-${pageType}`}
          projectTitle={pageLabel}
          breadcrumbLabel={`${campaign.country} / ${campaign.operator}`}
          breadcrumbHref={detailHref}
          initialData={initialData}
          funnelPageType={pageType}
          onSave={handleEditorSave}
          onPreview={handlePreview}
          saveHandler={saveHandler}
        />
      </Suspense>
    </div>
  )
}
