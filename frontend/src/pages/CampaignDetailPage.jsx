import { memo, useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Pencil, Settings, Power, Sparkles, FileText, User } from 'lucide-react'
import useStore from '../store/useStore'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import {
  PAGE_TYPE_LABELS,
  PAGE_TYPES,
  REQUIRED_PAGE_TYPES,
  getCampaignPreviewUrl,
  getCampaignActivityLogs,
} from '../services/api/campaigns'
import CampaignApiConfigModal from '../components/dashboard/CampaignApiConfigModal'
import ActivityLogsModal from '../components/dashboard/ActivityLogsModal'

function CampaignDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const campaign = useStore((s) => s.campaign)
  const loading = useStore((s) => s.loading)
  const error = useStore((s) => s.error)
  const loadCampaign = useStore((s) => s.loadCampaign)
  const updateCampaign = useStore((s) => s.updateCampaign)
  const applyCampaignDefaults = useStore((s) => s.applyCampaignDefaults)
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [activating, setActivating] = useState(false)
  const [applyingDefaults, setApplyingDefaults] = useState(false)
  const [showActivityLogs, setShowActivityLogs] = useState(false)
  const [recentLogs, setRecentLogs] = useState([])
  const [recentLogsLoading, setRecentLogsLoading] = useState(false)

  const fetchRecentLogs = useCallback(() => {
    if (!id) return
    setRecentLogsLoading(true)
    getCampaignActivityLogs(id, { page: 1, limit: 5 })
      .then((res) => setRecentLogs(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setRecentLogsLoading(false))
  }, [id])

  useEffect(() => {
    if (id) {
      fetchRecentLogs()
    }
  }, [id, fetchRecentLogs])

  useEffect(() => {
    if (id) loadCampaign(id)
  }, [id, loadCampaign])

  const handleToggleActive = async () => {
    if (!campaign) return
    setActivating(true)
    try {
      await updateCampaign(campaign.id, { active: !campaign.active })
    } finally {
      setActivating(false)
    }
  }

  const handleApplyDefaults = async () => {
    if (!campaign) return
    setApplyingDefaults(true)
    try {
      await applyCampaignDefaults(campaign.id)
    } finally {
      setApplyingDefaults(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <main className="page-container py-12 text-center text-fg-muted">Loading campaign...</main>
      </AppShell>
    )
  }

  if (error || !campaign) {
    return (
      <AppShell>
        <main className="page-container py-12 text-center">
          <p className="text-fg-muted mb-4">{error || 'Campaign not found'}</p>
          <Button variant="outline" onClick={() => navigate('/campaigns')}>
            Back to campaigns
          </Button>
        </main>
      </AppShell>
    )
  }

  const hasEmptyPages = campaign.pages.some(
    (p) => REQUIRED_PAGE_TYPES.includes(p.pageType) && !p.hasContent,
  )
  const previewUrl = getCampaignPreviewUrl(campaign)

  return (
    <AppShell>
      <main className="page-container max-w-4xl">
        <button
          type="button"
          onClick={() => navigate('/campaigns')}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to campaigns
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-fg font-display">
              {campaign.country} / {campaign.operator}
            </h1>
            <p className="text-sm text-fg-muted mt-1">{campaign.name}</p>
            {campaign.serviceId && (
              <p className="text-xs text-fg-subtle mt-1">Service ID: {campaign.serviceId}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {hasEmptyPages && (
              <Button variant="outline" size="sm" onClick={handleApplyDefaults} disabled={applyingDefaults}>
                <Sparkles className="w-4 h-4" />
                {applyingDefaults ? 'Applying...' : 'Use default templates'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowApiConfig(true)}>
              <Settings className="w-4 h-4" />
              API settings
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowActivityLogs(true)}>
              <FileText className="w-4 h-4" />
              Activity logs
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(previewUrl, '_blank')}>
              <ExternalLink className="w-4 h-4" />
              Preview
            </Button>
            <Button
              variant={campaign.active ? 'outline' : 'primary'}
              size="sm"
              onClick={handleToggleActive}
              disabled={activating || (!campaign.active && !campaign.requiredComplete)}
              title={
                !campaign.active && !campaign.requiredComplete
                  ? 'Complete HOME, CONFIRM, and THANKYOU pages first'
                  : undefined
              }
            >
              <Power className="w-4 h-4" />
              {campaign.active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-bg-subtle">
            <h2 className="text-sm font-semibold text-fg">Funnel pages</h2>
            <p className="text-xs text-fg-muted mt-0.5">
              Edit each step for this operator. Required: Home, Confirm, Thank you.
            </p>
          </div>
          <div className="divide-y divide-border">
            {PAGE_TYPES.map((pageType) => {
              const page = campaign.pages.find((p) => p.pageType === pageType)
              const required = REQUIRED_PAGE_TYPES.includes(pageType)
              return (
                <div key={pageType} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-fg">
                      {PAGE_TYPE_LABELS[pageType]}
                      {required && <span className="text-danger ml-1">*</span>}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {page?.hasContent ? 'Content saved' : 'Not configured yet'}
                    </p>
                  </div>
                  <Link to={`/campaigns/${campaign.id}/edit/${pageType}`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="w-4 h-4" />
                      Edit in canvas
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg border border-border bg-bg-subtle">
          <p className="text-xs font-medium text-fg-muted mb-1">Test URL</p>
          <code className="text-xs text-fg break-all block">{previewUrl}</code>
          <p className="text-xs text-fg-subtle mt-2">
            User selects Daily / Weekly / Monthly pack on the Confirm page. Backend sends{' '}
            <code className="text-fg-muted">planId</code> to the partner subscribe API.
          </p>
        </div>

        {/* Recent Activity Logs card */}
        <div className="surface-card overflow-hidden mt-6">
          <div className="px-4 py-3 border-b border-border bg-bg-subtle flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-fg flex items-center gap-1.5 font-display">
                <FileText className="w-4 h-4 text-accent" />
                Recent Activity Logs
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                Real-time tracking of visitor entry and subscription outcomes
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowActivityLogs(true)}>
              View all logs
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentLogsLoading ? (
              <div className="p-6 text-center text-xs text-fg-muted">Loading logs...</div>
            ) : recentLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-fg-muted">No interactions logged yet for this campaign.</div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-4 py-2.5 gap-4 hover:bg-bg-subtle/20 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-fg">
                      {log.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-fg-subtle" />
                          {log.phone}
                        </span>
                      ) : (
                        <span className="text-fg-subtle italic font-normal text-xs">Anonymous</span>
                      )}
                    </span>
                    <span className="text-[10px] text-fg-subtle font-mono mt-0.5">
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-bg-subtle text-fg-muted">
                      /{log.pageType || 'HOME'}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold tracking-wider ${
                        log.visitStatus === 'SUCCESS' || log.visitStatus === 'SUBSCRIBED'
                          ? 'bg-success-muted text-success'
                          : log.visitStatus === 'BLOCKED' || log.visitStatus === 'FAILED'
                          ? 'bg-warning-muted text-warning'
                          : 'bg-bg-muted text-fg-muted'
                      }`}
                    >
                      {log.visitStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <CampaignApiConfigModal
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        campaignId={campaign.id}
      />

      <ActivityLogsModal
        isOpen={showActivityLogs}
        onClose={() => {
          setShowActivityLogs(false)
          fetchRecentLogs()
        }}
        campaignId={campaign.id}
        campaignName={`${campaign.country} / ${campaign.operator}`}
      />
    </AppShell>
  )
}

export default memo(CampaignDetailPage)
