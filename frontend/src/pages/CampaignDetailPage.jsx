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
  Copy,
  Store,
  Plus,
  Trash2,
  Link2,
  AlertCircle,
  Check,
  Eye,
} from 'lucide-react'
import useStore from '../store/useStore'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { copyToClipboard } from '../utils/clipboard'
import {
  campaignEditPath,
  marketPath,
  resolveMarketCodes,
} from '../utils/routes'
import {
  PAGE_TYPE_LABELS,
  PAGE_TYPES,
  REQUIRED_PAGE_TYPES,
  OPTIONAL_PAGE_TYPES,
  getCampaignPreviewUrl,
} from '../services/api/campaigns'
import { buildTrackingUrl } from '../services/api/partners'
import CampaignApiConfigModal from '../components/dashboard/CampaignApiConfigModal'
import CampaignFlowSummary from '../components/flow/CampaignFlowSummary'
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
  const saveCampaignFlow = useStore((s) => s.saveCampaignFlow)
  const loadCampaignActivityLogs = useStore((s) => s.loadCampaignActivityLogs)
  const vendors = useStore((s) => s.vendors)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [activating, setActivating] = useState(false)
  const [recentLogs, setRecentLogs] = useState([])
  const [recentLogsLoading, setRecentLogsLoading] = useState(false)
  const [assigningVendor, setAssigningVendor] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const [selectedVendorForAdd, setSelectedVendorForAdd] = useState('')
  const [cgUrlDraft, setCgUrlDraft] = useState('')
  const [savingCg, setSavingCg] = useState(false)
  const [successUrlDraft, setSuccessUrlDraft] = useState('')
  const [successModeDraft, setSuccessModeDraft] = useState('thankyou')
  const [savingSuccessUrl, setSavingSuccessUrl] = useState(false)
  const [postbackAtDraft, setPostbackAtDraft] = useState('confirm')
  const [savingPostbackAt, setSavingPostbackAt] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    fetchVendors().catch(() => {})
  }, [fetchVendors])

  useEffect(() => {
    setCgUrlDraft(campaign?.cgRedirectUrl || '')
  }, [campaign?.id, campaign?.cgRedirectUrl])

  useEffect(() => {
    setSuccessUrlDraft(campaign?.successRedirectUrl || '')
    setSuccessModeDraft(
      campaign?.successRedirectMode === 'immediate' ? 'immediate' : 'thankyou',
    )
  }, [campaign?.id, campaign?.successRedirectUrl, campaign?.successRedirectMode])

  useEffect(() => {
    const v = campaign?.postbackRegisterAt
    setPostbackAtDraft(v === 'otp' || v === 'both' ? v : 'confirm')
  }, [campaign?.id, campaign?.postbackRegisterAt])

  useEffect(() => {
    setNameDraft(campaign?.name || '')
    setEditingName(false)
  }, [campaign?.id, campaign?.name])

  const handleSaveName = async () => {
    if (!campaign || !nameDraft.trim()) return
    setSavingName(true)
    try {
      await updateCampaign(campaign.id, { name: nameDraft.trim() })
      useStore.getState().addToast('Campaign name updated', 'success')
      setEditingName(false)
    } catch {
      // toast in slice
    } finally {
      setSavingName(false)
    }
  }

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
        successRedirectMode: successModeDraft === 'immediate' ? 'immediate' : 'thankyou',
      })
      useStore.getState().addToast('Success redirect saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingSuccessUrl(false)
    }
  }

  const handleSavePostbackAt = async () => {
    if (!campaign) return
    setSavingPostbackAt(true)
    try {
      const mode =
        postbackAtDraft === 'otp' || postbackAtDraft === 'both'
          ? postbackAtDraft
          : 'confirm'
      await updateCampaign(campaign.id, { postbackRegisterAt: mode })
      useStore.getState().addToast('Callback timing saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingPostbackAt(false)
    }
  }

  const handleSaveVerificationMode = useCallback(
    async ({ verificationMode, flowConfig }) => {
      if (!campaign) return
      await saveCampaignFlow(campaign.id, { verificationMode, flowConfig })
    },
    [campaign, saveCampaignFlow],
  )

  const handleSubmitTracking = async () => {
    if (!campaign || !selectedVendorForAdd) return
    setAssigningVendor(true)
    try {
      const vendorId = Number(selectedVendorForAdd)
      const currentTrackings = (campaign.trackings || [])
        .map((t) => ({
          vendorId: t.vendor?.id,
          affiliateId: null,
          active: t.active !== false,
        }))
        .filter((t) => t.vendorId !== vendorId)

      if (!currentTrackings.find((t) => t.vendorId === vendorId)) {
        currentTrackings.push({ vendorId, affiliateId: null, active: true })
        await updateCampaign(campaign.id, { trackings: currentTrackings })
        useStore.getState().addToast('Vendor tracking assigned', 'success')
      }
      setSelectedVendorForAdd('')
    } finally {
      setAssigningVendor(false)
    }
  }

  const handleRemoveTracking = async (vendorId) => {
    if (!campaign) return
    const ok = window.confirm(
      'Remove this tracking assignment? The shareable link will stop working for this vendor.',
    )
    if (!ok) return
    setAssigningVendor(true)
    try {
      const newTrackings = (campaign.trackings || [])
        .filter((t) => Number(t.vendor?.id) !== Number(vendorId))
        .map((t) => ({
          vendorId: t.vendor?.id,
          affiliateId: null,
          active: t.active !== false,
        }))
      await updateCampaign(campaign.id, { trackings: newTrackings })
      useStore.getState().addToast('Tracking removed', 'success')
    } finally {
      setAssigningVendor(false)
    }
  }

  const handleToggleTrackingActive = async (vendorId) => {
    if (!campaign) return
    setAssigningVendor(true)
    try {
      const targetVendorId = Number(vendorId)
      const currentTrackings = (campaign.trackings || []).map((t) => {
        const tVendorId = Number(t.vendor?.id)
        const currentlyOn = t.active !== false
        return {
          vendorId: tVendorId,
          affiliateId: null,
          active: tVendorId === targetVendorId ? !currentlyOn : currentlyOn,
        }
      })
      await updateCampaign(campaign.id, { trackings: currentTrackings })
      const nowActive = currentTrackings.find(
        (t) => t.vendorId === targetVendorId,
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

    // Always list every funnel page type so status pages (Blocked, Low balance, …)
    // stay editable even when not present in the saved flow graph.
    for (const type of defaultOrder) {
      addPage(type)
    }

    return order
  }, [campaign])

  const flowRequiredPageTypes = useMemo(() => {
    const nodes = campaign?.flowConfig?.nodes
    if (nodes?.length) {
      return [...new Set(nodes.map((n) => n.pageType).filter(Boolean))]
    }
    return REQUIRED_PAGE_TYPES
  }, [campaign?.flowConfig])

  const pageSections = useMemo(() => {
    const coreTypes = orderedPageTypes.filter((type) =>
      flowRequiredPageTypes.includes(type),
    )
    const statusTypes = orderedPageTypes.filter(
      (type) =>
        OPTIONAL_PAGE_TYPES.includes(type) ||
        (!flowRequiredPageTypes.includes(type) &&
          !REQUIRED_PAGE_TYPES.includes(type)),
    )
    // Pages that are traditionally "core" but not in this flow still stay editable under status
    const extraCore = orderedPageTypes.filter(
      (type) =>
        REQUIRED_PAGE_TYPES.includes(type) &&
        !flowRequiredPageTypes.includes(type),
    )
    return [
      {
        id: 'core',
        title: 'Core funnel',
        subtitle: `Required by this flow: ${flowRequiredPageTypes.map((t) => PAGE_TYPE_LABELS[t] || t).join(', ')}`,
        types: coreTypes,
      },
      {
        id: 'status',
        title: 'Status & outcome pages',
        subtitle:
          'Shown for parking, blocked, pending, or errors — customize per campaign',
        types: [...new Set([...statusTypes, ...extraCore])],
      },
    ]
  }, [orderedPageTypes, flowRequiredPageTypes])

  const pagesReadyCount = useMemo(() => {
    if (!campaign) return 0
    return flowRequiredPageTypes.filter((type) => {
      const page = campaign.pages?.find((p) => p.pageType === type)
      return page?.hasContent
    }).length
  }, [campaign, flowRequiredPageTypes])

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

  // Dedupe trackings by vendor (legacy affiliate rows collapse to one)
  const vendorTrackings = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const t of campaign?.trackings || []) {
      const id = t.vendor?.id
      if (!id || seen.has(id)) continue
      seen.add(id)
      list.push(t)
    }
    return list
  }, [campaign?.trackings])

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
  const canActivate = campaign.requiredComplete
  const activateBlockedReason =
    !campaign.active && !canActivate
      ? 'Complete the pages required by this flow first'
      : null
  const trackings = vendorTrackings

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
            {editingName ? (
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="max-w-md"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') {
                      setNameDraft(campaign.name || '')
                      setEditingName(false)
                    }
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveName}
                  disabled={savingName || !nameDraft.trim()}
                >
                  {savingName ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNameDraft(campaign.name || '')
                    setEditingName(false)
                  }}
                  disabled={savingName}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <h1 className="page-header-title">{campaign.name}</h1>
                <button
                  type="button"
                  className="p-1.5 text-fg-muted hover:text-accent rounded-md hover:bg-accent-muted transition-colors"
                  title="Edit campaign name"
                  onClick={() => setEditingName(true)}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </>
            )}
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
                    {pagesReadyCount}/{flowRequiredPageTypes.length}
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
                      Finish editing pages required by this flow before you can activate this
                      campaign.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <CampaignFlowSummary
              campaign={campaign}
              onSaveMode={handleSaveVerificationMode}
            />

            <div className="surface-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-fg">CG redirect URL</h2>
                <p className="text-xs text-fg-muted mt-1">
                  With flow mode <strong>None</strong> and this URL set, users are redirected here
                  on landing. HE/OTP is not required. Also used as the HOME fallback when API HE
                  (<code>safaricom_masked</code> / <code>custom_http</code>) cannot resolve MSISDN
                  and no <code>failRedirectUrl</code> is set in HE config. HE success/fail redirects
                  open the configured URL as-is (no <code>click_id</code> / <code>campid</code>).
                  Optional placeholders like <code className="font-mono">{'{{msisdn}}'}</code> are
                  filled when present in the URL.
                </p>
              </div>
              <div className="px-5 py-4 flex flex-col sm:flex-row gap-2">
                <input
                  className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
                  value={cgUrlDraft}
                  onChange={(e) => setCgUrlDraft(e.target.value)}
                  placeholder="https://dsdp-cg.example/path"
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
                  Portal / content URL after a successful subscribe (or already subscribed).
                  Leave empty to stay on thank-you.{' '}
                  <code className="font-mono">{'{{msisdn}}'}</code>,{' '}
                  <code className="font-mono">{'{{click_id}}'}</code> /{' '}
                  <code className="font-mono">{'{rcid}'}</code> supported like CG redirect.
                </p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
                    value={successUrlDraft}
                    onChange={(e) => setSuccessUrlDraft(e.target.value)}
                    placeholder="https://content.example/portal?msisdn={{msisdn}}"
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
                <div>
                  <p className="text-xs font-medium text-fg mb-2">After success</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSuccessModeDraft('thankyou')}
                      className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                        successModeDraft === 'thankyou'
                          ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                          : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                      }`}
                    >
                      <p className="text-sm font-semibold text-fg">Show thank-you</p>
                      <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                        Show thank-you ~2s, then redirect to the portal URL.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuccessModeDraft('immediate')}
                      className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                        successModeDraft === 'immediate'
                          ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                          : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                      }`}
                    >
                      <p className="text-sm font-semibold text-fg">Redirect immediately</p>
                      <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                        Skip thank-you paint — go straight to the portal URL.
                      </p>
                    </button>
                  </div>
                  <p className="text-[11px] text-fg-subtle mt-2">
                    Click Save above to persist the URL and this mode together.
                  </p>
                </div>
              </div>
            </div>

            <div className="surface-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-fg">Vendor CPA callback</h2>
                <p className="text-xs text-fg-muted mt-1">
                  When to queue a pending postback (fired later when the operator hits{' '}
                  <code className="font-mono">/api/flow/callback</code>). HE success+new and
                  null-flow CG still register on their own paths.
                </p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPostbackAtDraft('confirm')}
                    className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                      postbackAtDraft === 'confirm'
                        ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                        : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-fg">On Confirm</p>
                    <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                      Classic — queue when user clicks Confirm / subscribe.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostbackAtDraft('otp')}
                    className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                      postbackAtDraft === 'otp'
                        ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                        : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-fg">On OTP verify</p>
                    <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                      Pin = subscribe / Skip Confirm — queue right after OTP continue.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostbackAtDraft('both')}
                    className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                      postbackAtDraft === 'both'
                        ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                        : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-fg">Both</p>
                    <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                      OTP continue and Confirm click (upsert same MSISDN row).
                    </p>
                  </button>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={
                      savingPostbackAt ||
                      postbackAtDraft ===
                        (campaign?.postbackRegisterAt === 'otp' ||
                        campaign?.postbackRegisterAt === 'both'
                          ? campaign.postbackRegisterAt
                          : 'confirm')
                    }
                    onClick={handleSavePostbackAt}
                  >
                    {savingPostbackAt ? 'Saving...' : 'Save callback timing'}
                  </Button>
                </div>
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
                        Assign vendors to generate shareable tracking URLs.{' '}
                        <code className="font-mono text-[10px]">tracking_campid</code> = ours;{' '}
                        <code className="font-mono text-[10px]">campid=&#123;&#125;</code> +{' '}
                        <code className="font-mono text-[10px]">click_id=&#123;&#125;</code> = vendor
                        macros (they fill their campid / click).
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
                <p className="text-xs font-medium text-fg mb-3">Assign vendor</p>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <select
                    className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg focus:outline-none focus:ring-2 focus:ring-ring"
                    value={selectedVendorForAdd}
                    onChange={(e) => setSelectedVendorForAdd(e.target.value)}
                    disabled={assigningVendor}
                  >
                    <option value="">Select vendor…</option>
                    {activeVendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.code})
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
                    Pick a vendor above to generate a tracking link for this campaign.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {trackings.map((t) => {
                    const vendorId = t.vendor?.id
                    const vendor = vendors.find((v) => v.id === vendorId) || t.vendor
                    const assignmentActive = t.active !== false
                    const vendorActive = vendor?.active !== false
                    const linkActive = assignmentActive && vendorActive
                    const displayUrl = buildTrackingUrl({
                      campaign,
                      vendorCode: vendor?.code,
                    })
                    const relativeDisplay = displayUrl.replace(window.location.origin, '')
                    const copyKey = String(vendorId)

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
                          {!linkActive && (
                            <p className="text-[11px] text-warning flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {!assignmentActive
                                ? 'Assignment off — visitors see “not available”'
                                : 'Vendor is deactivated — reactivate on Vendors page'}
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
                              onClick={() => handleToggleTrackingActive(vendorId)}
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
                            onClick={() => handleRemoveTracking(vendorId)}
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
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-fg">Funnel pages</h2>
                <p className="text-xs text-fg-muted mt-0.5">
                  Edit every page in this campaign — including Blocked and Low balance.
                  Button “When clicked” on the canvas sets page → next (page / URL / Priority).
                </p>
              </div>
              {pageSections.map((section) => (
                <div key={section.id} className="border-b border-border last:border-b-0">
                  <div className="px-5 py-3 bg-bg-subtle/60 border-b border-border">
                    <p className="text-xs font-semibold text-fg">{section.title}</p>
                    <p className="text-[11px] text-fg-muted mt-0.5">{section.subtitle}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {section.types.map((pageType) => {
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
                                {hasContent ? 'Content saved' : 'Default template — click Edit to customize'}
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
              ))}
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
    </AppShell>
  )
}

export default memo(CampaignDetailPage)
