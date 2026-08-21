import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
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
  const [loadedPageKey, setLoadedPageKey] = useState(null)

  useEffect(() => {
    if (id) loadCampaign(id)
  }, [id, loadCampaign])

  useEffect(() => {
    if (!id || !pageType) return undefined
    const key = `${id}|${String(pageType).toUpperCase()}`
    let cancelled = false
    setLoadedPageKey(null)
    loadCampaignPage(id, pageType, true).finally(() => {
      if (!cancelled) setLoadedPageKey(key)
    })
    return () => {
      cancelled = true
    }
  }, [id, pageType, loadCampaignPage])

  const verificationMode = String(campaign?.verificationMode || '').toUpperCase()
  const pageLabel =
    verificationMode === 'UNIVERSE_DCB' && String(pageType || '').toUpperCase() === 'OTP'
      ? 'Number then PIN'
      : PAGE_TYPE_LABELS[pageType] || pageType
  const { countryCode, operatorCode } = resolveMarketCodes(
    { countryCode: routeCountry, operatorCode: routeOperator },
    campaign,
  )
  const detailHref = campaignDetailPath(countryCode, operatorCode, id)

  const saveHandler = useCallback(
    async (editor, meta) => {
      if (!id || !pageType) return null

      const { ok, missing } = validateFunnelPage(editor, pageType, campaign?.verificationMode)
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
    [id, pageType, afterPageSaved, campaign?.verificationMode],
  )

  const handleEditorSave = useCallback(() => {
    useStore.getState().addToast('Page saved successfully', 'success')
  }, [])

  // Preview = live /subscription with the same shadow mount + FLOW_RUNTIME_CSS
  // as production (not a separate GrapesJS iframe). Save runs first so WYSIWYG holds.
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

  const pageKey = id && pageType ? `${id}|${String(pageType).toUpperCase()}` : null
  const pageReady =
    loadedPageKey === pageKey &&
    campaignPage &&
    String(campaignPage.pageType || '').toUpperCase() === String(pageType || '').toUpperCase() &&
    String(campaignPage.campaignId || '') === String(id || '')

  if (loading || !pageReady) {
    if (error && loadedPageKey === pageKey) {
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
      <div className="h-screen flex items-center justify-center bg-bg-canvas">
        <div className="text-sm text-fg-muted animate-pulse">Loading page editor...</div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-bg-canvas px-4">
        <p className="text-sm text-fg-muted text-center">Page not found</p>
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
          verificationMode={verificationMode}
          campaignId={id}
          countryCode={countryCode}
          operatorCode={operatorCode}
          onSave={handleEditorSave}
          onPreview={handlePreview}
          saveHandler={saveHandler}
        />
      </Suspense>
    </div>
  )
}
