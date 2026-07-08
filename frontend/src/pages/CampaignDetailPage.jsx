import { memo, useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Settings,
  Power,
  Sparkles,
  FileText,
  User,
  CheckCircle2,
  Circle,
  Workflow,
  Copy,
  Store,
} from 'lucide-react'
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
import { listVendors, buildTrackingUrl } from '../services/api/partners'
import CampaignApiConfigModal from '../components/dashboard/CampaignApiConfigModal'
import ActivityLogsModal from '../components/dashboard/ActivityLogsModal'
import { getVisitPagePath } from '../utils/visitPagePath'

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
  const [vendors, setVendors] = useState([])
  const [assigningVendor, setAssigningVendor] = useState(false)

  useEffect(() => {
    listVendors()
      .then((res) => setVendors(res || []))
      .catch(() => setVendors([]))
  }, [])

  const handleAssignVendor = async (vendorId) => {
    if (!campaign) return
    setAssigningVendor(true)
    try {
      await updateCampaign(campaign.id, { vendorId: vendorId ? Number(vendorId) : null })
    } finally {
      setAssigningVendor(false)
    }
  }

  const copyTracking = (url) => {
    navigator.clipboard?.writeText(url).then(
      () => useStore.getState().addToast('Tracking URL copied', 'success'),
      () => useStore.getState().addToast('Copy failed', 'error'),
    )
  }

  const fetchRecentLogs = useCallback(() => {
    if (!id) return
    setRecentLogsLoading(true)
    getCampaignActivityLogs(id, { page: 1, limit: 5 })
      .then((res) => setRecentLogs(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setRecentLogsLoading(false))
  }, [id])

  useEffect(() => {
    if (id) fetchRecentLogs()
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
        <div className="page-container flex items-center justify-center min-h-[50vh]">
          <p className="text-fg-muted text-sm">Loading campaign...</p>
        </div>
      </AppShell>
    )
  }

  if (error || !campaign) {
    return (
      <AppShell>
        <div className="page-container text-center py-12">
          <p className="text-fg-muted mb-4">{error || 'Campaign not found'}</p>
          <Button variant="outline" onClick={() => navigate('/campaigns')}>
            Back to campaigns
          </Button>
        </div>
      </AppShell>
    )
  }

  const hasEmptyPages = campaign.pages.some(
    (p) => REQUIRED_PAGE_TYPES.includes(p.pageType) && !p.hasContent,
  )
  const previewUrl = getCampaignPreviewUrl(campaign)

  const pageActions = (
    <>
      {hasEmptyPages && (
        <Button variant="outline" size="sm" onClick={handleApplyDefaults} disabled={applyingDefaults}>
          <Sparkles className="w-4 h-4" />
          {applyingDefaults ? 'Applying...' : 'Use defaults'}
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => setShowApiConfig(true)}>
        <Settings className="w-4 h-4" />
        API settings
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
    </>
  )

  return (
    <AppShell actions={pageActions}>
      <div className="page-container">
        <button
          type="button"
          onClick={() => navigate('/campaigns')}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to campaigns
        </button>

        <div className="page-header flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="page-header-title">
                {campaign.country} / {campaign.operator}
              </h1>
              <span className={`badge ${campaign.active ? 'badge-success' : 'badge-muted'}`}>
                {campaign.active ? 'Active' : 'Draft'}
              </span>
            </div>
            <p className="page-header-description">{campaign.name}</p>
            {campaign.serviceId && (
              <p className="text-xs text-fg-subtle mt-1">Service ID: {campaign.serviceId}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Funnel pages */}
          <div className="lg:col-span-2 space-y-6">
            <div className="surface-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-fg">Funnel pages</h2>
                  <p className="text-xs text-fg-muted mt-0.5">
                    Required: Home, Confirm, Thank you
                  </p>
                </div>
                <Link to={`/campaigns/${campaign.id}/flow`}>
                  <Button variant="outline" size="sm">
                    <Workflow className="w-3.5 h-3.5" />
                    Flow builder
                  </Button>
                </Link>
              </div>
              <div className="divide-y divide-border">
                {PAGE_TYPES.map((pageType) => {
                  const page = campaign.pages.find((p) => p.pageType === pageType)
                  const required = REQUIRED_PAGE_TYPES.includes(pageType)
                  const hasContent = page?.hasContent
                  return (
                    <div key={pageType} className="flex items-center justify-between px-5 py-3.5 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {hasContent ? (
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-fg-subtle shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-fg">
                            {PAGE_TYPE_LABELS[pageType]}
                            {required && <span className="text-danger ml-0.5">*</span>}
                          </p>
                          <p className="text-xs text-fg-muted">
                            {hasContent ? 'Content saved' : 'Not configured'}
                          </p>
                        </div>
                      </div>
                      <Link to={`/campaigns/${campaign.id}/edit/${pageType}`}>
                        <Button variant="outline" size="sm">
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent activity */}
            <div className="surface-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-fg">Recent activity</h2>
                  <p className="text-xs text-fg-muted mt-0.5">Latest visitor interactions</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowActivityLogs(true)}>
                  <FileText className="w-3.5 h-3.5" />
                  View all
                </Button>
              </div>
              {recentLogsLoading ? (
                <div className="p-6 text-center text-xs text-fg-muted">Loading...</div>
              ) : recentLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-fg-muted">No activity yet</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Phone</th>
                      <th>Time</th>
                      <th>Path</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="font-medium">
                          {log.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-fg-subtle" />
                              {log.phone}
                            </span>
                          ) : (
                            <span className="text-fg-subtle italic">Anonymous</span>
                          )}
                        </td>
                        <td className="text-fg-muted text-xs font-mono">
                          {new Date(log.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>
                          <div className="flex flex-wrap items-center gap-1">
                            {getVisitPagePath(log).map((page, idx, pages) => (
                              <span key={`${log.id}-${page}-${idx}`} className="inline-flex items-center gap-1">
                                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-bg-muted text-fg-muted">
                                  /{page}
                                </span>
                                {idx < pages.length - 1 && (
                                  <span className="text-fg-subtle text-[10px]">→</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              log.visitStatus === 'SUCCESS' || log.visitStatus === 'SUBSCRIBED'
                                ? 'badge-success'
                                : log.visitStatus === 'BLOCKED' || log.visitStatus === 'FAILED'
                                ? 'badge-warning'
                                : log.visitStatus === 'OTP_SHOWN' || log.visitStatus === 'CONFIRM_SHOWN'
                                ? 'badge-accent'
                                : 'badge-muted'
                            }`}
                          >
                            {log.visitStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
            <div className="surface-card p-5">
              <h3 className="text-sm font-semibold text-fg mb-3">Test URL</h3>
              <code className="text-xs text-fg-muted break-all block bg-bg-muted p-3 rounded-md border border-border">
                {previewUrl}
              </code>
              <p className="text-xs text-fg-subtle mt-3 leading-relaxed">
                Users select Daily / Weekly / Monthly pack on the Confirm page. Backend sends{' '}
                <code className="text-fg-muted">planId</code> to the partner subscribe API.
              </p>
            </div>

            <div className="surface-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Store className="w-4 h-4 text-fg-subtle" />
                <h3 className="text-sm font-semibold text-fg">Attribution &amp; tracking</h3>
              </div>
              <label className="block text-xs text-fg-muted mb-1">Assigned vendor</label>
              <select
                className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-bg-base mb-3"
                value={campaign.vendorId || ''}
                onChange={(e) => handleAssignVendor(e.target.value)}
                disabled={assigningVendor}
              >
                <option value="">— No vendor —</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.code})
                  </option>
                ))}
              </select>

              {(() => {
                const vendor = vendors.find((v) => v.id === Number(campaign.vendorId))
                if (!vendor) {
                  return (
                    <p className="text-xs text-fg-subtle">
                      Assign a vendor to generate affiliate tracking links.{' '}
                      <Link to="/vendors" className="text-accent">
                        Manage vendors
                      </Link>
                    </p>
                  )
                }
                const affiliates = vendor.affiliates || []
                if (affiliates.length === 0) {
                  return (
                    <p className="text-xs text-fg-subtle">
                      No affiliates for this vendor.{' '}
                      <Link to="/vendors" className="text-accent">
                        Add affiliates
                      </Link>
                    </p>
                  )
                }
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-fg-muted">Tracking links</p>
                    {affiliates.map((aff) => {
                      const url = buildTrackingUrl({
                        campaign,
                        vendorCode: vendor.code,
                        affiliateCode: aff.code,
                      })
                      return (
                        <div key={aff.id} className="rounded-md border border-border p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-fg">{aff.name}</span>
                            <button
                              type="button"
                              onClick={() => copyTracking(url)}
                              className="text-fg-muted hover:text-fg"
                              title="Copy tracking URL"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <code className="text-[10px] text-fg-subtle break-all block">{url}</code>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            <div className="surface-card p-5">
              <h3 className="text-sm font-semibold text-fg mb-3">Quick actions</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowActivityLogs(true)}>
                  <FileText className="w-4 h-4" />
                  Activity logs
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowApiConfig(true)}>
                  <Settings className="w-4 h-4" />
                  API configuration
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => window.open(previewUrl, '_blank')}>
                  <ExternalLink className="w-4 h-4" />
                  Open preview
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
