import { memo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import CampaignFlowBuilder from '../components/flow/CampaignFlowBuilder'
import useStore from '../store/useStore'
import {
  campaignDetailPath,
  resolveMarketCodes,
} from '../utils/routes'

/**
 * Standalone /flow route — prefers Campaign Detail embed.
 * Kept for bookmarks; redirects to detail when possible, else shows builder.
 */
function FlowBuilderPage() {
  const { id, countryCode: routeCountry, operatorCode: routeOperator } = useParams()
  const navigate = useNavigate()
  const campaign = useStore((s) => s.campaign)
  const loadCampaign = useStore((s) => s.loadCampaign)

  const { countryCode, operatorCode } = resolveMarketCodes(
    { countryCode: routeCountry, operatorCode: routeOperator },
    campaign,
  )
  const detailHref = campaignDetailPath(countryCode, operatorCode, id)

  useEffect(() => {
    if (id) loadCampaign(id)
  }, [id, loadCampaign])

  useEffect(() => {
    if (detailHref) {
      navigate(`${detailHref}#flow`, { replace: true })
    }
  }, [detailHref, navigate])

  return (
    <AppShell>
      <div className="page-container">
        <button
          type="button"
          onClick={() => navigate(detailHref || '/markets')}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to campaign
        </button>
        {id && (
          <CampaignFlowBuilder
            campaignId={id}
            countryCode={countryCode}
            operatorCode={operatorCode}
          />
        )}
      </div>
    </AppShell>
  )
}

export default memo(FlowBuilderPage)
