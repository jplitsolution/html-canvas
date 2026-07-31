import { memo, useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Settings,
  Power,
  FileText,
  User,
  CheckCircle2,
  Circle,
  Workflow,
  Copy,
  Store,
  Plus,
  Trash2,
  Link2,
  AlertCircle,
  Check,
} from 'lucide-react'
import useStore from '../store/useStore'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import { copyToClipboard } from '../utils/clipboard'
import {
  campaignEditPath,
  campaignFlowPath,
  marketPath,
  resolveMarketCodes,
} from '../utils/routes'
import {
  PAGE_TYPE_LABELS,
  PAGE_TYPES,
  REQUIRED_PAGE_TYPES,
  getCampaignPreviewUrl,
} from '../services/api/campaigns'
import { buildTrackingUrl } from '../services/api/partners'
import CampaignApiConfigModal from '../components/dashboard/CampaignApiConfigModal'
import ActivityLogsModal from '../components/dashboard/ActivityLogsModal'
import { getVisitPagePath } from '../utils/visitPagePath'

function StatusToggle({ active, onToggle, disabled, activating, blockedReason }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">Campaign status</p>
        <p className="text-xs text-fg-muted mt-0.5">
          {active
            ? 'Live — traffic can reach this funnel'
            : blockedReason
              ? blockedReason
              : 'Draft — activate when pages are ready'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={active ? 'Deactivate campaign' : 'Activate campaign'}
        disabled={disabled || activating}
        title={blockedReason || undefined}
        onClick={onToggle}
        className={`
          relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full
          transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
          disabled:cursor-not-allowed disabled:opacity-50
          ${active ? 'bg-success' : 'bg-bg-canvas border border-border'}
        `}
      >
        <span
          className={`
            inline-block h-6 w-6 transform rounded-full bg-white shadow-sm
            transition-transform duration-200
            ${active ? 'translate-x-[1.35rem]' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  )
}

function CampaignDetailPage() {
  const { id, countryCode: routeCountry, operatorCode: routeOperator } = useParams()
  const navigate = useNavigate()
  const campaign = useStore((s) => s.campaign)
  const loading = useStore((s) => s.loading)
  const error = useStore((s) => s.error)
  const loadCampaign = useStore((s) => s.loadCampaign)
  const updateCampaign = useStore((s) => s.updateCampaign)
  const loadCampaignActivityLogs = useStore((s) => s.loadCampaignActivityLogs)
  const vendors = useStore((s) => s.vendors)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [activating, setActivating] = useState(false)
  const [showActivityLogs, setShowActivityLogs] = useState(false)
  const [recentLogs, setRecentLogs] = useState([])
  const [recentLogsLoading, setRecentLogsLoading] = useState(false)
  const [assigningVendor, setAssigningVendor] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const [selectedVendorForAdd, setSelectedVendorForAdd] = useState('')
  const [selectedAffiliateForAdd, setSelectedAffiliateForAdd] = useState('null')
  const [cgUrlDraft, setCgUrlDraft] = useState('')
  const [savingCg, setSavingCg] = useState(false)
  const [successUrlDraft, setSuccessUrlDraft] = useState('')
  const [savingSuccessUrl, setSavingSuccessUrl] = useState(false)

  useEffect(() => {
    fetchVendors().catch(() => {})
  }, [fetchVendors])

  useEffect(() => {
    setCgUrlDraft(campaign?.cgRedirectUrl || '')
  }, [campaign?.id, campaign?.cgRedirectUrl])

  useEffect(() => {
    setSuccessUrlDraft(campaign?.successRedirectUrl || '')
  }, [campaign?.id, campaign?.successRedirectUrl])

  const handleSaveCgUrl = async () => {
    if (!campaign) return
    setSavingCg(true)
    try {
      await updateCampaign(campaign.id, {
        cgRedirectUrl: cgUrlDraft.trim() || null,
      })
      useStore.getState().addToast('CG redirect URL saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingCg(false)
    }
  }

  const handleSaveSuccessUrl = async () => {
    if (!campaign) return
    setSavingSuccessUrl(true)
    try {
      await updateCampaign(campaign.id, {
        successRedirectUrl: successUrlDraft.trim() || null,
      })
      useStore.getState().addToast('Success redirect URL saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingSuccessUrl(false)
    }
  }

  const handleAddTracking = async (value) => {
    if (!campaign || !value) return
    setAssigningVendor(true)
    try {
      const [vId, aId] = value.split(':')
      const vendorId = Number(vId)
      const affiliateId = aId !== 'null' ? Number(aId) : null

      let currentTrackings = (campaign.trackings || []).map((t) => ({
        vendorId: t.vendor?.id,
        affiliateId: t.affiliate?.id || null,
        active: t.active !== false,
      }))

      if (affiliateId !== null) {
        currentTrackings = currentTrackings.filter(
          (t) => !(t.vendorId === vendorId && t.affiliateId === null),
        )
      } else {
        currentTrackings = currentTrackings.filter((t) => t.vendorId !== vendorId)
      }

      if (!currentTrackings.find((t) => t.vendorId === vendorId && t.affiliateId === affiliateId)) {
        currentTrackings.push({ vendorId, affiliateId, active: true })
        await updateCampaign(campaign.id, { trackings: currentTrackings })
        useStore.getState().addToast('Tracking assigned', 'success')
      }
    } finally {
      setAssigningVendor(false)
    }
  }

  const handleSubmitTracking = async () => {
    if (!selectedVendorForAdd) return
    await handleAddTracking(`${selectedVendorForAdd}:${selectedAffiliateForAdd}`)
    setSelectedVendorForAdd('')
    setSelectedAffiliateForAdd('null')
  }

  const handleRemoveTracking = async (vendorId, affiliateId) => {
    if (!campaign) return
    const ok = window.confirm(
      'Remove this tracking assignment? The shareable link will stop working for this vendor/affiliate.',
    )
    if (!ok) return
    setAssigningVendor(true)
    try {
      const currentTrackings = (campaign.trackings || []).map((t) => ({
        vendorId: t.vendor?.id,
        affiliateId: t.affiliate?.id || null,
        active: t.active !== false,
      }))
      const newTrackings = currentTrackings.filter(
        (t) => !(t.vendorId === vendorId && t.affiliateId === affiliateId),
      )
      await updateCampaign(campaign.id, { trackings: newTrackings })
      useStore.getState().addToast('Tracking removed', 'success')
    } finally {
      setAssigningVendor(false)
    }
  }

  const handleToggleTrackingActive = async (vendorId, affiliateId) => {
    if (!campaign) return
    setAssigningVendor(true)
    try {
      const targetVendorId = Number(vendorId)
      const targetAffiliateId = affiliateId == null ? null : Number(affiliateId)
      const currentTrackings = (campaign.trackings || []).map((t) => {
        const tVendorId = Number(t.vendor?.id)
        const tAffiliateId = t.affiliate?.id == null ? null : Number(t.affiliate.id)
        const isMatch =
          tVendorId === targetVendorId && tAffiliateId === targetAffiliateId
        const currentlyOn = t.active !== false
        return {
          vendorId: tVendorId,
          affiliateId: tAffiliateId,
          active: isMatch ? !currentlyOn : currentlyOn,
        }
      })
      await updateCampaign(campaign.id, { trackings: currentTrackings })
      const nowActive = currentTrackings.find(
        (t) =>
          t.vendorId === targetVendorId && t.affiliateId === targetAffiliateId,
      )?.active
      useStore.getState().addToast(
        nowActive
          ? 'Assignment activated'
          : 'Assignment deactivated — link will show not available',
        'success',
      )
    } finally {
      setAssigningVendor(false)
    }
  }

  const copyTracking = (url, copyKey) => {
    copyToClipboard(url).then((success) => {
      if (success) {
        setCopiedId(copyKey)
        setTimeout(() => setCopiedId(null), 2000)
        useStore.getState().addToast('Tracking URL copied', 'success')
      } else {
        useStore.getState().addToast('Copy failed', 'error')
      }
    })
  }

  const fetchRecentLogs = useCallback(() => {
    if (!id) return
    setRecentLogsLoading(true)
    loadCampaignActivityLogs(id, { page: 1, limit: 5 })
      .then((res) => setRecentLogs(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setRecentLogsLoading(false))
  }, [id, loadCampaignActivityLogs])

  useEffect(() => {
    if (id) fetchRecentLogs()
  }, [id, fetchRecentLogs])

  useEffect(() => {
    if (id) loadCampaign(id)
  }, [id, loadCampaign])

  const orderedPageTypes = useMemo(() => {
    const defaultOrder = PAGE_TYPES
    if (!campaign || !campaign.flowConfig) return defaultOrder

    const order = []
    const visited = new Set()

    const addPage = (type) => {
      if (defaultOrder.includes(type) && !visited.has(type)) {
        visited.add(type)
        order.push(type)
      }
    }

    const nodes = campaign.flowConfig.nodes || []
    const edges = campaign.flowConfig.edges || []

    const homeNode = nodes.find((n) => n.pageType === 'HOME')
    if (homeNode) {
      addPage('HOME')
      const queue = [homeNode.id]
      while (queue.length > 0) {
        const currentId = queue.shift()
        const outgoing = edges.filter((e) => e.source === currentId)
        for (const edge of outgoing) {
          const targetNode = nodes.find((n) => n.id === edge.target)
          if (targetNode) {
            const type = targetNode.pageType
            if (!visited.has(type)) {
              addPage(type)
              queue.push(edge.target)
            }
          }
        }
      }
    }

    for (const n of nodes) {
      addPage(n.pageType)
    }

    return order
  }, [campaign])

  const pagesReadyCount = useMemo(() => {
    if (!campaign) return 0
    return REQUIRED_PAGE_TYPES.filter((type) => {
      const page = campaign.pages?.find((p) => p.pageType === type)
      return page?.hasContent
    }).length
  }, [campaign])

  const handleToggleActive = async () => {
    if (!campaign) return
    setActivating(true)
    try {
      await updateCampaign(campaign.id, { active: !campaign.active })
      useStore.getState().addToast(
        campaign.active ? 'Campaign deactivated' : 'Campaign activated',
        'success',
      )
    } finally {
      setActivating(false)
    }
  }

  const activeVendors = useMemo(
    () => vendors.filter((v) => v.active !== false),
    [vendors],
  )

  const selectedVendorAffiliates = useMemo(() => {
    if (!selectedVendorForAdd) return []
    const vendor = vendors.find((v) => String(v.id) === selectedVendorForAdd)
    return (vendor?.affiliates || []).filter((a) => a.active !== false)
  }, [vendors, selectedVendorForAdd])

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
          <Button variant="outline" onClick={() => navigate('/markets')}>
            Back to markets
          </Button>
        </div>
      </AppShell>
    )
  }

  const previewUrl = getCampaignPreviewUrl(campaign)
  const { countryCode, operatorCode } = resolveMarketCodes(
    { countryCode: routeCountry, operatorCode: routeOperator },
    campaign,
  )
  const backToMarket = marketPath(countryCode, operatorCode)
  const editBase = (pageType) =>
    campaignEditPath(countryCode, operatorCode, campaign.id, pageType)
  const flowHref = campaignFlowPath(countryCode, operatorCode, campaign.id)
  const canActivate = campaign.requiredComplete
  const activateBlockedReason =
    !campaign.active && !canActivate
      ? 'Complete HOME, CONFIRM, and THANKYOU pages first'
      : null
  const trackings = campaign.trackings || []

  const pageActions = (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowApiConfig(true)}>
        <Settings className="w-4 h-4" />
        API settings
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(previewUrl, '_blank')}
        title="Open live funnel without a fake MSISDN. Localhost HE usually finds nothing → OTP path."
      >
        <ExternalLink className="w-4 h-4" />
        Preview
      </Button>
    </>
  )

  return (
    <AppShell actions={pageActions}>
      <div className="page-container">
        <button
          type="button"
          onClick={() => navigate(backToMarket)}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to market
        </button>

        <div className="page-header mb-6">
          <p className="text-xs text-fg-subtle mb-1">
            <Link to="/markets" className="hover:text-fg">
              Markets
            </Link>
            {' / '}
            <Link to={backToMarket} className="hover:text-fg">
              {campaign.country} / {campaign.operator}
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-header-title">{campaign.name}</h1>
            <span className={`badge ${campaign.active ? 'badge-success' : 'badge-muted'}`}>
              {campaign.active ? 'Active' : 'Draft'}
            </span>
          </div>
          {campaign.trackingId && (
            <p className="text-xs text-fg-subtle mt-1.5">
              Tracking ID{' '}
              <code className="font-mono text-fg-muted bg-bg-muted px-1.5 py-0.5 rounded">
                {campaign.trackingId}
              </code>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Status + readiness */}
            <div className="surface-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <StatusToggle
                  active={!!campaign.active}
                  onToggle={handleToggleActive}
                  disabled={!campaign.active && !canActivate}
                  activating={activating}
                  blockedReason={activateBlockedReason}
                />
              </div>
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-bg-muted/60 border border-border px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-fg-subtle font-medium">
                    Required pages
                  </p>
                  <p className="text-lg font-semibold text-fg mt-1 tabular-nums">
                    {pagesReadyCount}/{REQUIRED_PAGE_TYPES.length}
                  </p>
                </div>
                <div className="rounded-lg bg-bg-muted/60 border border-border px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-fg-subtle font-medium">
                    Tracking links
                  </p>
                  <p className="text-lg font-semibold text-fg mt-1 tabular-nums">
                    {trackings.length}
                  </p>
                </div>
                <div className="rounded-lg bg-bg-muted/60 border border-border px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-fg-subtle font-medium">
                    Readiness
                  </p>
                  <p
                    className={`text-sm font-semibold mt-1.5 ${
                      canActivate ? 'text-success' : 'text-warning'
                    }`}
                  >
                    {canActivate ? 'Ready to go live' : 'Pages incomplete'}
                  </p>
                </div>
              </div>
              {!canActivate && (
                <div className="px-5 pb-4">
                  <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning-muted/40 px-3.5 py-2.5 text-xs text-fg-muted">
                    <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                    <span>
                      Finish editing HOME, CONFIRM, and THANKYOU before you can activate this
                      campaign.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="surface-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-fg">CG redirect URL</h2>
                <p className="text-xs text-fg-muted mt-1">
                  With flow mode <strong>None</strong> and this URL set, users are redirected here
                  on landing. HE/OTP is not required.{' '}
                  <code className="font-mono">{'{{click_id}}'}</code> = our generated id;{' '}
                  <code className="font-mono">{'{rcid}'}</code> = affiliate original (otherwise auto{' '}
                  <code className="font-mono">?click_id=</code> with our id).
                </p>
              </div>
              <div className="px-5 py-4 flex flex-col sm:flex-row gap-2">
                <input
                  className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
                  value={cgUrlDraft}
                  onChange={(e) => setCgUrlDraft(e.target.value)}
                  placeholder="https://operator-cg.example/path"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={savingCg}
                  onClick={handleSaveCgUrl}
                >
                  {savingCg ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            <div className="surface-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-fg">Success / content URL</h2>
                <p className="text-xs text-fg-muted mt-1">
                  After the thank-you page (new subscribe or already subscribed), users are
                  redirected here. Leave empty to stay on thank-you.{' '}
                  <code className="font-mono">{'{{click_id}}'}</code> /{' '}
                  <code className="font-mono">{'{rcid}'}</code> supported like CG redirect.
                </p>
              </div>
              <div className="px-5 py-4 flex flex-col sm:flex-row gap-2">
                <input
                  className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
                  value={successUrlDraft}
                  onChange={(e) => setSuccessUrlDraft(e.target.value)}
                  placeholder="https://saf.wellnesss360.com/"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={savingSuccessUrl}
                  onClick={handleSaveSuccessUrl}
                >
                  {savingSuccessUrl ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            {/* Attribution & Tracking */}
            <div className="surface-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted text-accent">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-fg">Attribution &amp; tracking</h2>
                      <p className="text-xs text-fg-muted mt-0.5">
                        Assign vendors and affiliates to generate shareable tracking URLs
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/vendors"
                    className="text-xs text-accent hover:underline shrink-0 pt-1"
                  >
                    Manage vendors
                  </Link>
                </div>
              </div>

              <div className="px-5 py-4 border-b border-border bg-bg-muted/25">
                <p className="text-xs font-medium text-fg mb-3">Assign new tracking</p>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <select
                    className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg focus:outline-none focus:ring-2 focus:ring-ring"
                    value={selectedVendorForAdd}
                    onChange={(e) => {
                      setSelectedVendorForAdd(e.target.value)
                      setSelectedAffiliateForAdd('null')
                    }}
                    disabled={assigningVendor}
                  >
                    <option value="">Select vendor…</option>
                    {activeVendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.code})
                      </option>
                    ))}
                  </select>

                  <select
                    className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    value={selectedAffiliateForAdd}
                    onChange={(e) => setSelectedAffiliateForAdd(e.target.value)}
                    disabled={assigningVendor || !selectedVendorForAdd}
                  >
                    <option value="null">All traffic</option>
                    {selectedVendorAffiliates.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.code})
                      </option>
                    ))}
                  </select>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSubmitTracking}
                    disabled={assigningVendor || !selectedVendorForAdd}
                    className="sm:shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {assigningVendor ? 'Assigning…' : 'Assign'}
                  </Button>
                </div>
                {activeVendors.length === 0 && (
                  <p className="text-xs text-fg-muted mt-3">
                    No active vendors yet.{' '}
                    <Link to="/vendors" className="text-accent hover:underline">
                      Create a vendor
                    </Link>{' '}
                    first.
                  </p>
                )}
              </div>

              {trackings.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Store className="w-8 h-8 mx-auto mb-3 text-fg-subtle" />
                  <p className="text-sm font-medium text-fg">No tracking assigned</p>
                  <p className="text-xs text-fg-muted mt-1 max-w-sm mx-auto">
                    Pick a vendor above to generate an affiliate tracking link for this campaign.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {trackings.map((t) => {
                    const vendorId = t.vendor?.id
                    const affiliateId = t.affiliate?.id
                    const vendor = vendors.find((v) => v.id === vendorId) || t.vendor
                    const affiliate = affiliateId
                      ? vendor?.affiliates?.find((a) => a.id === affiliateId) || t.affiliate
                      : null
                    const assignmentActive = t.active !== false
                    const vendorActive = vendor?.active !== false
                    const affiliateActive = !affiliate || affiliate.active !== false
                    const linkActive = assignmentActive && vendorActive && affiliateActive
                    const displayUrl = buildTrackingUrl({
                      campaign,
                      vendorCode: vendor?.code,
                      affiliateCode: affiliate?.code,
                    })
                    const relativeDisplay = displayUrl.replace(window.location.origin, '')
                    const copyKey = `${vendorId}-${affiliateId || 'none'}`

                    return (
                      <div
                        key={copyKey}
                        className={`px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${
                          linkActive ? '' : 'bg-bg-muted/30'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-fg">{vendor?.name}</span>
                            <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-muted text-fg-muted border border-border">
                              {vendor?.code}
                            </code>
                            <span
                              className={`badge ${linkActive ? 'badge-success' : 'badge-muted'}`}
                            >
                              {linkActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-fg-muted">
                            Affiliate:{' '}
                            {affiliate ? (
                              <>
                                <span className="text-fg font-medium">{affiliate.name}</span>
                                <code className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-muted text-fg-muted border border-border">
                                  {affiliate.code}
                                </code>
                              </>
                            ) : (
                              <span className="italic text-fg-subtle">All traffic</span>
                            )}
                          </p>
                          {!linkActive && (
                            <p className="text-[11px] text-warning flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {!assignmentActive
                                ? 'Assignment off — visitors see “not available”'
                                : !vendorActive
                                  ? 'Vendor is deactivated — reactivate on Vendors page'
                                  : 'Affiliate is deactivated — reactivate on Vendors page'}
                            </p>
                          )}
                          <code className="block text-[11px] text-fg-subtle break-all leading-relaxed bg-bg-muted/50 border border-border rounded-md px-2.5 py-2">
                            {relativeDisplay}
                          </code>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <div className="flex items-center gap-2 mr-1">
                            <span className="text-[11px] text-fg-subtle">
                              {assignmentActive ? 'On' : 'Off'}
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={assignmentActive}
                              aria-label={
                                assignmentActive
                                  ? 'Deactivate assignment'
                                  : 'Activate assignment'
                              }
                              disabled={assigningVendor}
                              onClick={() =>
                                handleToggleTrackingActive(vendorId, affiliateId || null)
                              }
                              className={`
                                relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
                                transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
                                disabled:cursor-not-allowed disabled:opacity-50
                                ${assignmentActive ? 'bg-success' : 'bg-bg-canvas border border-border'}
                              `}
                            >
                              <span
                                className={`
                                  inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
                                  transition-transform duration-200
                                  ${assignmentActive ? 'translate-x-6' : 'translate-x-1'}
                                `}
                              />
                            </button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyTracking(displayUrl, copyKey)}
                            title="Copy tracking URL"
                          >
                            {copiedId === copyKey ? (
                              <Check className="w-3.5 h-3.5 text-success" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            {copiedId === copyKey ? 'Copied' : 'Copy'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(displayUrl, '_blank')}
                            title="Open tracking URL"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger hover:text-danger hover:bg-danger-muted"
                            onClick={() => handleRemoveTracking(vendorId, affiliateId || null)}
                            disabled={assigningVendor}
                            title="Remove assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Funnel pages */}
            <div className="surface-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-fg">Funnel pages</h2>
                  <p className="text-xs text-fg-muted mt-0.5">
                    Required: Home, Confirm, Thank you
                  </p>
                </div>
                <Link to={flowHref}>
                  <Button variant="outline" size="sm">
                    <Workflow className="w-3.5 h-3.5" />
                    Flow builder
                  </Button>
                </Link>
              </div>
              <div className="divide-y divide-border">
                {orderedPageTypes.map((pageType) => {
                  const page = campaign.pages.find((p) => p.pageType === pageType)
                  const required = REQUIRED_PAGE_TYPES.includes(pageType)
                  const hasContent = page?.hasContent
                  return (
                    <div
                      key={pageType}
                      className="flex items-center justify-between px-5 py-3.5 gap-4"
                    >
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
                      <Link to={editBase(pageType)}>
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
                              <span
                                key={`${log.id}-${page}-${idx}`}
                                className="inline-flex items-center gap-1"
                              >
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
                                  : log.visitStatus === 'OTP_SHOWN' ||
                                      log.visitStatus === 'CONFIRM_SHOWN'
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

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="surface-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-fg">Live status</h3>
                <Power className={`w-4 h-4 ${campaign.active ? 'text-success' : 'text-fg-subtle'}`} />
              </div>
              <div
                className={`rounded-lg border px-3.5 py-3 ${
                  campaign.active
                    ? 'border-success/30 bg-success-muted/50'
                    : 'border-border bg-bg-muted/50'
                }`}
              >
                <p className={`text-sm font-semibold ${campaign.active ? 'text-success' : 'text-fg'}`}>
                  {campaign.active ? 'Campaign is live' : 'Campaign is draft'}
                </p>
                <p className="text-xs text-fg-muted mt-1">
                  {campaign.active
                    ? 'Use the status toggle above to take this campaign offline.'
                    : 'Use the status toggle above to go live when pages are ready.'}
                </p>
              </div>
            </div>

            <div className="surface-card p-5">
              <h3 className="text-sm font-semibold text-fg mb-3">Test URL</h3>
              <code className="text-xs text-fg-muted break-all block bg-bg-muted p-3 rounded-md border border-border">
                {previewUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => window.open(previewUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                Open preview
              </Button>
            </div>

            <div className="surface-card p-5">
              <h3 className="text-sm font-semibold text-fg mb-3">Quick actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => navigate(`/analytics?campaignId=${campaign.id}`)}
                >
                  <FileText className="w-4 h-4" />
                  Activity logs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowApiConfig(true)}
                >
                  <Settings className="w-4 h-4" />
                  API configuration
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => navigate(flowHref)}
                >
                  <Workflow className="w-4 h-4" />
                  Flow builder
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
