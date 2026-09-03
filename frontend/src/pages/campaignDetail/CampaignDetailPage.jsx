import { memo, useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Settings,
  FileText,
  Store,
  AlertCircle,
} from 'lucide-react'
import useStore from '../../store/useStore'
import AppShell from '../../components/ui/AppShell'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { copyToClipboard } from '../../utils/clipboard'
import { marketPath, resolveMarketCodes } from '../../utils/routes'
import { getCampaignPreviewUrl, getCampaignVendorStats } from '../../services/api/campaigns'
import { clampPayoutPercent } from '../../services/api/otp'
import CampaignApiConfigModal from '../../components/dashboard/CampaignApiConfigModal'
import { getDateRangeForPreset, DEFAULT_TIMEZONE, shiftDateString } from '../../utils/date'
import CampaignFlowBuilder from '../../components/flow/CampaignFlowBuilder'
import { effectiveCallbackStatuses } from '../../components/partners/AllowedCallbackStatusesField'
import { resolveCampaignDetailFlow } from './flows'
import VendorStatsSection from './VendorStatsSection'
import VendorAssignModal from './VendorAssignModal'

function CompactStatusToggle({ active, onToggle, disabled, activating, blockedReason }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? 'Deactivate campaign' : 'Activate campaign'}
      disabled={disabled || activating}
      title={blockedReason || (active ? 'Deactivate' : 'Activate')}
      onClick={onToggle}
      className={`
        relative inline-flex h-7 w-12 shrink-0 items-center rounded-full
        transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
        disabled:cursor-not-allowed disabled:opacity-50
        ${active ? 'bg-success' : 'bg-bg-canvas border border-border'}
      `}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${active ? 'translate-x-[1.15rem]' : 'translate-x-0.5'}
        `}
      />
    </button>
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
  const vendors = useStore((s) => s.vendors)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [activating, setActivating] = useState(false)
  const [assigningVendor, setAssigningVendor] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [selectedVendorForAdd, setSelectedVendorForAdd] = useState('')
  const [addPayoutPercent, setAddPayoutPercent] = useState(100)
  const [addAllowedStatuses, setAddAllowedStatuses] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
  const addToast = useStore((s) => s.addToast)

  const [vendorPreset, setVendorPreset] = useState('today')
  const [vendorCustomRange, setVendorCustomRange] = useState({ from: '', to: '' })
  const [vendorDateRange, setVendorDateRange] = useState(() => getDateRangeForPreset('today', timezone))
  const [vendorStats, setVendorStats] = useState({ apiExpose: false, vendors: [] })
  const [vendorStatsLoading, setVendorStatsLoading] = useState(false)

  const handleVendorPresetChange = (newPreset) => {
    setVendorPreset(newPreset)
    if (newPreset === 'all') {
      setVendorDateRange({ from: '', to: '' })
    } else if (newPreset === 'yesterday') {
      const todayStr = getDateRangeForPreset('today', timezone).from
      const yestStr = shiftDateString(todayStr, -1)
      setVendorDateRange({ from: yestStr, to: yestStr })
    } else if (newPreset !== 'custom') {
      const range = getDateRangeForPreset(newPreset, timezone)
      setVendorDateRange(range)
    }
  }

  const handleVendorCustomDateApply = () => {
    if (!vendorCustomRange.from || !vendorCustomRange.to) {
      if (addToast) addToast('Please select both From and To dates', 'warning')
      return
    }
    setVendorDateRange({ from: vendorCustomRange.from, to: vendorCustomRange.to })
  }

  useEffect(() => {
    fetchVendors().catch(() => {})
  }, [fetchVendors])

  const loadVendorStats = useCallback(() => {
    if (!id) return
    setVendorStatsLoading(true)
    getCampaignVendorStats(id, {
      from: vendorDateRange.from,
      to: vendorDateRange.to,
      timezone,
    })
      .then((data) => {
        setVendorStats(data || { apiExpose: false, vendors: [] })
      })
      .catch((err) => {
        console.error('Failed to load vendor stats:', err)
        setVendorStats({ apiExpose: false, vendors: [] })
      })
      .finally(() => {
        setVendorStatsLoading(false)
      })
  }, [id, vendorDateRange, timezone])

  useEffect(() => {
    let cancelled = false
    if (!id) return
    setVendorStatsLoading(true)
    getCampaignVendorStats(id, {
      from: vendorDateRange.from,
      to: vendorDateRange.to,
      timezone,
    })
      .then((data) => {
        if (!cancelled) setVendorStats(data || { apiExpose: false, vendors: [] })
      })
      .catch((err) => {
        console.error('Failed to fetch vendor stats:', err)
        if (!cancelled) setVendorStats({ apiExpose: false, vendors: [] })
      })
      .finally(() => {
        if (!cancelled) setVendorStatsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, vendorDateRange.from, vendorDateRange.to, timezone, campaign?.trackings])

  useEffect(() => {
    setNameDraft(campaign?.name || '')
    setEditingName(false)
  }, [campaign?.id, campaign?.name])

  useEffect(() => {
    if (id) loadCampaign(id)
  }, [id, loadCampaign])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash !== '#flow') return
    const el = document.getElementById('flow')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [campaign?.id])

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

  const serializeTrackings = (list) =>
    (list || [])
      .map((t) => ({
        vendorId: Number(t.vendorId ?? t.vendor?.id),
        affiliateId: null,
        active: t.active !== false,
        payoutPercent: clampPayoutPercent(t.payoutPercent ?? 100),
        allowedCallbackStatuses:
          typeof t.allowedCallbackStatuses === 'string'
            ? t.allowedCallbackStatuses.trim() || null
            : t.allowedCallbackStatuses || null,
      }))
      .filter((t) => t.vendorId)

  const handleSubmitTracking = async () => {
    if (!campaign || !selectedVendorForAdd) return
    setAssigningVendor(true)
    try {
      const vendorId = Number(selectedVendorForAdd)
      const currentTrackings = serializeTrackings(campaign.trackings).filter(
        (t) => t.vendorId !== vendorId,
      )

      if (!currentTrackings.find((t) => t.vendorId === vendorId)) {
        const vendor = vendors.find((v) => Number(v.id) === vendorId)
        currentTrackings.push({
          vendorId,
          affiliateId: null,
          active: true,
          payoutPercent: clampPayoutPercent(addPayoutPercent),
          allowedCallbackStatuses:
            addAllowedStatuses.trim() ||
            vendor?.allowedCallbackStatuses?.trim() ||
            null,
        })
        await updateCampaign(campaign.id, { trackings: currentTrackings })
        useStore.getState().addToast('Vendor assigned', 'success')
      }
      setSelectedVendorForAdd('')
      setAddPayoutPercent(100)
      setAddAllowedStatuses('')
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
      const newTrackings = serializeTrackings(campaign.trackings).filter(
        (t) => t.vendorId !== Number(vendorId),
      )
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
      const currentTrackings = serializeTrackings(campaign.trackings).map((t) => ({
        ...t,
        active: t.vendorId === targetVendorId ? !t.active : t.active,
      }))
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

  const handleSavePayoutPercent = async (vendorId, nextPercent) => {
    if (!campaign) return
    const payoutPercent = clampPayoutPercent(nextPercent)
    const current = serializeTrackings(campaign.trackings)
    const existing = current.find((t) => t.vendorId === Number(vendorId))
    if (!existing || existing.payoutPercent === payoutPercent) return
    setAssigningVendor(true)
    try {
      await updateCampaign(campaign.id, {
        trackings: current.map((t) =>
          t.vendorId === Number(vendorId) ? { ...t, payoutPercent } : t,
        ),
      })
      useStore.getState().addToast(`Payout set to ${payoutPercent}%`, 'success')
    } finally {
      setAssigningVendor(false)
    }
  }

  const handleSaveTrackingStatuses = async (vendorId, nextStatuses) => {
    if (!campaign) return
    const allowedCallbackStatuses = String(nextStatuses || '').trim() || null
    const current = serializeTrackings(campaign.trackings)
    const existing = current.find((t) => t.vendorId === Number(vendorId))
    if (
      !existing ||
      (existing.allowedCallbackStatuses || null) === allowedCallbackStatuses
    ) {
      return
    }
    setAssigningVendor(true)
    try {
      await updateCampaign(campaign.id, {
        trackings: current.map((t) =>
          t.vendorId === Number(vendorId) ? { ...t, allowedCallbackStatuses } : t,
        ),
      })
      useStore.getState().addToast(
        allowedCallbackStatuses
          ? `This assignment fires on: ${allowedCallbackStatuses}`
          : 'Cleared — this assignment uses the vendor default',
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
        useStore.getState().addToast('Copied', 'success')
      } else {
        useStore.getState().addToast('Copy failed', 'error')
      }
    })
  }

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

  const vendorTrackings = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const t of campaign?.trackings || []) {
      const tid = Number(t.vendor?.id ?? t.vendorId)
      if (!tid || seen.has(tid)) continue
      seen.add(tid)
      list.push({
        ...t,
        vendor: t.vendor || vendors.find((v) => Number(v.id) === tid) || { id: tid },
      })
    }
    return list
  }, [campaign?.trackings, vendors])

  const vendorRows = useMemo(() => {
    const byId = new Map(
      (vendorStats.vendors || []).map((row) => [Number(row.vendorId), row]),
    )
    const rows = vendorTrackings.map((t) => {
      const vendorId = Number(t.vendor?.id ?? t.vendorId)
      const vendor = t.vendor || {}
      const stats = byId.get(vendorId)
      byId.delete(vendorId)
      return {
        vendorId,
        vendorName: stats?.vendorName || vendor.name || `Vendor #${vendorId}`,
        vendorCode: stats?.vendorCode || vendor.code || null,
        fireStatuses: effectiveCallbackStatuses(
          t.allowedCallbackStatuses,
          vendor,
        ),
        assignmentActive: t.active !== false,
        payoutPercent: Number(stats?.payoutPercent ?? t.payoutPercent ?? 100),
        totalClicks: stats?.totalClicks ?? 0,
        requestedApi: stats?.requestedApi ?? 0,
        verifiedApi: stats?.verifiedApi ?? 0,
        failedApi: stats?.failedApi ?? 0,
        convPercent: stats?.convPercent ?? 0,
        pubConvPercent: stats?.pubConvPercent ?? 0,
        pinRequest: stats?.pinRequest ?? 0,
        pinSendSuccess: stats?.pinSendSuccess ?? 0,
        uniquePinSend: stats?.uniquePinSend ?? 0,
        pinValRequest: stats?.pinValRequest ?? 0,
        uniquePinValRequest: stats?.uniquePinValRequest ?? 0,
        pinValSuccess: stats?.pinValSuccess ?? 0,
        uniquePinVal: stats?.uniquePinVal ?? 0,
        sendConversion: stats?.sendConversion ?? 0,
        advCrPercent: stats?.advCrPercent ?? 0,
        pubCrPercent: stats?.pubCrPercent ?? 0,
        homeView: stats?.homeView ?? 0,
        subscribeClick: stats?.subscribeClick ?? 0,
        cgRedirect: stats?.cgRedirect ?? 0,
      }
    })
    for (const leftover of byId.values()) rows.push(leftover)
    return rows
  }, [vendorTrackings, vendorStats.vendors])

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
  const canActivate = campaign.requiredComplete
  const activateBlockedReason =
    !campaign.active && !canActivate
      ? 'Complete the pages required by this flow first'
      : null
  const trackings = vendorTrackings
  const flow = resolveCampaignDetailFlow(campaign)

  const pageActions = (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowVendorModal(true)}>
        <Store className="w-4 h-4" />
        Vendors
        {trackings.length > 0 && (
          <span className="ml-0.5 tabular-nums text-fg-muted">({trackings.length})</span>
        )}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setShowApiConfig(true)}>
        <Settings className="w-4 h-4" />
        API
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(`/analytics?campaignId=${campaign.id}`)}
      >
        <FileText className="w-4 h-4" />
        Logs
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(previewUrl, '_blank')}
        title="Open live funnel preview"
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
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to market
        </button>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-fg-subtle mb-1">
              <Link to="/markets" className="hover:text-fg">
                Markets
              </Link>
              {' / '}
              <Link to={backToMarket} className="hover:text-fg">
                {campaign.country} / {campaign.operator}
              </Link>
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {editingName ? (
                <div className="flex flex-wrap items-center gap-2">
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
              {!canActivate && !campaign.active && (
                <span className="text-[11px] text-warning flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Pages incomplete
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs text-fg-muted">
              {campaign.active ? 'Live' : 'Offline'}
            </span>
            <CompactStatusToggle
              active={!!campaign.active}
              onToggle={handleToggleActive}
              disabled={!campaign.active && !canActivate}
              activating={activating}
              blockedReason={activateBlockedReason}
            />
          </div>
        </div>

        <div id="flow" className="scroll-mt-4">
          <CampaignFlowBuilder
            campaignId={campaign.id}
            countryCode={countryCode}
            operatorCode={operatorCode}
            embedded
          />
        </div>

        <VendorStatsSection
          flow={flow}
          vendorRows={vendorRows}
          vendorStatsLoading={vendorStatsLoading}
          vendorPreset={vendorPreset}
          vendorCustomRange={vendorCustomRange}
          setVendorCustomRange={setVendorCustomRange}
          onPresetChange={handleVendorPresetChange}
          onCustomDateApply={handleVendorCustomDateApply}
          onRefresh={loadVendorStats}
          onManageVendors={() => setShowVendorModal(true)}
        />
      </div>

      <VendorAssignModal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        flow={flow}
        campaign={campaign}
        vendors={vendors}
        activeVendors={activeVendors}
        trackings={trackings}
        assigningVendor={assigningVendor}
        selectedVendorForAdd={selectedVendorForAdd}
        setSelectedVendorForAdd={setSelectedVendorForAdd}
        addPayoutPercent={addPayoutPercent}
        setAddPayoutPercent={setAddPayoutPercent}
        addAllowedStatuses={addAllowedStatuses}
        setAddAllowedStatuses={setAddAllowedStatuses}
        copiedId={copiedId}
        onCopyTracking={copyTracking}
        onSubmitTracking={handleSubmitTracking}
        onRemoveTracking={handleRemoveTracking}
        onToggleTrackingActive={handleToggleTrackingActive}
        onSavePayoutPercent={handleSavePayoutPercent}
        onSaveTrackingStatuses={handleSaveTrackingStatuses}
      />

      <CampaignApiConfigModal
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        campaignId={campaign.id}
        campaign={campaign}
      />
    </AppShell>
  )
}

export default memo(CampaignDetailPage)
