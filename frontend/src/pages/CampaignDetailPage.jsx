import { memo, useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Settings,
  FileText,
  Copy,
  Store,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  Download,
  FileCode,
} from 'lucide-react'
import useStore from '../store/useStore'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/common/Modal'
import IconButton from '../components/ui/IconButton'
import { copyToClipboard } from '../utils/clipboard'
import {
  marketPath,
  resolveMarketCodes,
} from '../utils/routes'
import { getCampaignPreviewUrl, getCampaignVendorStats } from '../services/api/campaigns'
import { buildTrackingUrl } from '../services/api/partners'
import { buildOtpExposeApiGuide, buildOtpExposeUrls, clampPayoutPercent } from '../services/api/otp'
import { buildDcbExposeApiGuide, buildDcbExposeUrls } from '../services/api/dcbExpose'
import { isApiExposeCampaign, isDcbApiExposeCampaign } from '../components/flow/verificationModes'
import { downloadTextFile } from '../utils/download'
import CampaignApiConfigModal from '../components/dashboard/CampaignApiConfigModal'
import CampaignFlowBuilder from '../components/flow/CampaignFlowBuilder'

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

function relativeUrl(url) {
  if (!url || typeof window === 'undefined') return url
  return url.replace(window.location.origin, '')
}

/**
 * API expose funnel, counts only. We never hold the money, so there are no
 * advertiser / publisher / profit amount columns here.
 */
const PIN_COLUMNS = [
  { key: 'pinRequest', label: 'Pin Request', hint: 'PIN send API calls received' },
  { key: 'pinSendSuccess', label: 'Pin_Send Success', hint: 'PIN sent by the operator' },
  { key: 'uniquePinSend', label: 'Unique Pin_Send', hint: 'Distinct MSISDN with a PIN sent', tint: 'bg-accent-muted/40' },
  { key: 'pinValRequest', label: 'Pin_Val Request', hint: 'PIN validate API calls received' },
  { key: 'uniquePinValRequest', label: 'Unique Pin_Val Request', hint: 'Distinct MSISDN attempting validation', tint: 'bg-accent-muted/40' },
  { key: 'pinValSuccess', label: 'Pin_Val Success', hint: 'PIN validated by the operator' },
  { key: 'uniquePinVal', label: 'Unique Pin_Val', hint: 'Distinct MSISDN validated', tint: 'bg-accent-muted/40' },
  { key: 'sendConversion', label: 'Send Conversion', hint: 'Validations forwarded to the vendor after the payout cut', tint: 'bg-success-muted/50' },
]

function sumPinColumns(rows) {
  const totals = Object.fromEntries(PIN_COLUMNS.map((col) => [col.key, 0]))
  for (const row of rows) {
    for (const col of PIN_COLUMNS) totals[col.key] += Number(row?.[col.key]) || 0
  }
  const cr = (num) => (totals.pinRequest > 0 ? (num / totals.pinRequest) * 100 : 0)
  return {
    ...totals,
    advCrPercent: cr(totals.pinValSuccess),
    pubCrPercent: cr(totals.sendConversion),
  }
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
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [vendorStats, setVendorStats] = useState({ apiExpose: false, vendors: [] })
  const [vendorStatsLoading, setVendorStatsLoading] = useState(false)

  useEffect(() => {
    fetchVendors().catch(() => {})
  }, [fetchVendors])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setVendorStatsLoading(true)
    getCampaignVendorStats(id)
      .then((data) => {
        if (!cancelled) setVendorStats(data || { apiExpose: false, vendors: [] })
      })
      .catch(() => {
        if (!cancelled) setVendorStats({ apiExpose: false, vendors: [] })
      })
      .finally(() => {
        if (!cancelled) setVendorStatsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, campaign?.trackings])

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
        currentTrackings.push({
          vendorId,
          affiliateId: null,
          active: true,
          payoutPercent: clampPayoutPercent(addPayoutPercent),
        })
        await updateCampaign(campaign.id, { trackings: currentTrackings })
        useStore.getState().addToast('Vendor assigned', 'success')
      }
      setSelectedVendorForAdd('')
      setAddPayoutPercent(100)
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

  const downloadVendorApiGuide = (t, vendor) => {
    const vendorId = vendor?.id || t.vendor?.id
    const payload = dcbApiExpose
      ? buildDcbExposeApiGuide({
          origin: window.location.origin,
          campaign,
          vendor,
          vendorId,
        })
      : buildOtpExposeApiGuide({
          origin: window.location.origin,
          campaign,
          vendor,
          vendorId,
        })
    const safeName = String(vendor?.code || vendor?.name || vendorId || 'vendor')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .toLowerCase()
    const prefix = dcbApiExpose ? 'dcb-billing-api' : 'otp-api'
    downloadTextFile(
      `${prefix}-campaign-${campaign.id}-vendor-${safeName}.json`,
      payload,
      'application/json;charset=utf-8',
    )
    useStore.getState().addToast('API payload downloaded', 'success')
  }

  const downloadVendorHtmlScreen = async (t, vendor) => {
    const vendorId = vendor?.id || t.vendor?.id
    const urls = buildDcbExposeUrls(window.location.origin, campaign.id, vendorId)
    const safeName = String(vendor?.code || vendor?.name || vendorId || 'vendor')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .toLowerCase()
    try {
      const res = await fetch(`${urls.screenUrl}?absolute=1`)
      const html = await res.text()
      if (!res.ok) {
        useStore.getState().addToast('Could not download HTML screen', 'error')
        return
      }
      downloadTextFile(
        `dcb-billing-screen-campaign-${campaign.id}-vendor-${safeName}.html`,
        html,
        'text/html;charset=utf-8',
      )
      useStore.getState().addToast('HTML screen downloaded', 'success')
    } catch {
      useStore.getState().addToast('Could not download HTML screen', 'error')
    }
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
      }
    })
    for (const leftover of byId.values()) rows.push(leftover)
    return rows
  }, [vendorTrackings, vendorStats.vendors])

  const pinTotals = useMemo(() => sumPinColumns(vendorRows), [vendorRows])

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
  const apiExpose = isApiExposeCampaign(campaign)
  const dcbApiExpose = isDcbApiExposeCampaign(campaign)

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

        <div className="surface-card overflow-hidden mt-5">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-fg">Vendors</h2>
              <p className="text-[11px] text-fg-muted mt-0.5">
                {apiExpose
                  ? 'PIN send and PIN validate legs, with unique MSISDN per leg. Send conversion is what the vendor gets after the payout cut. Adv CR is Pin_Val success ÷ Pin request; Pub CR is send conversion ÷ Pin request. Traffic counts only — we do not hold any amount.'
                  : 'Clicks from landings. Conv % is matched operator callbacks ÷ clicks. Pub conv % is vendor postbacks sent ÷ clicks.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowVendorModal(true)}>
              <Store className="w-4 h-4" />
              Manage
            </Button>
          </div>
          {vendorStatsLoading && vendorRows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-fg-muted">Loading vendor stats…</p>
          ) : vendorRows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-fg-muted">
              No vendors assigned.{' '}
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => setShowVendorModal(true)}
              >
                Assign a vendor
              </button>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="col-text">Vendor</th>
                    {apiExpose ? (
                      <>
                        <th className="col-num">Cut</th>
                        {PIN_COLUMNS.map((col) => (
                          <th key={col.key} className={`col-num ${col.tint || ''}`} title={col.hint}>
                            {col.label}
                          </th>
                        ))}
                        <th className="col-num" title="Pin_Val success ÷ Pin request">
                          Adv CR
                        </th>
                        <th className="col-num" title="Send conversion ÷ Pin request">
                          Pub CR
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="col-num">Total clicks</th>
                        <th className="col-num">Conv %</th>
                        <th className="col-num">Pub conv %</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {vendorRows.map((row) => (
                    <tr key={row.vendorId} className={row.assignmentActive === false ? 'opacity-70' : ''}>
                      <td className="col-text">
                        <p className="font-medium text-fg">{row.vendorName}</p>
                        {row.vendorCode ? (
                          <p className="text-[11px] text-fg-muted font-mono">{row.vendorCode}</p>
                        ) : null}
                      </td>
                      {apiExpose ? (
                        <>
                          <td className="col-num text-fg-muted">
                            {100 - Number(row.payoutPercent ?? 100)}%
                          </td>
                          {PIN_COLUMNS.map((col) => (
                            <td key={col.key} className={`col-num ${col.tint || ''}`}>
                              {row[col.key] ?? 0}
                            </td>
                          ))}
                          <td className="col-num">{Number(row.advCrPercent || 0).toFixed(1)}%</td>
                          <td className="col-num">{Number(row.pubCrPercent || 0).toFixed(1)}%</td>
                        </>
                      ) : (
                        <>
                          <td className="col-num">{row.totalClicks ?? 0}</td>
                          <td className="col-num">{Number(row.convPercent || 0).toFixed(1)}%</td>
                          <td className="col-num">{Number(row.pubConvPercent || 0).toFixed(1)}%</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                {apiExpose && vendorRows.length > 1 && (
                  <tfoot>
                    <tr className="bg-bg-subtle font-medium">
                      <td className="col-text">Total</td>
                      <td className="col-num text-fg-muted">–</td>
                      {PIN_COLUMNS.map((col) => (
                        <td key={col.key} className={`col-num ${col.tint || ''}`}>
                          {pinTotals[col.key]}
                        </td>
                      ))}
                      <td className="col-num">{pinTotals.advCrPercent.toFixed(1)}%</td>
                      <td className="col-num">{pinTotals.pubCrPercent.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        title="Vendors"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-fg-muted">
              {apiExpose
                ? 'Assign a vendor, set payout %, copy or download APIs.'
                : 'Assign a vendor to generate a tracking URL.'}
            </p>
            <Link to="/vendors" className="text-xs text-accent hover:underline shrink-0">
              Manage
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="flex-1 text-sm border border-border rounded-md px-3 py-1.5 bg-bg-elevated text-fg focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedVendorForAdd}
              onChange={(e) => setSelectedVendorForAdd(e.target.value)}
              disabled={assigningVendor}
            >
              <option value="">Select vendor…</option>
              {activeVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <input
                id="add-payout"
                type="number"
                min={0}
                max={100}
                aria-label="Payout percent"
                value={addPayoutPercent}
                onChange={(e) => setAddPayoutPercent(e.target.value)}
                onBlur={() => setAddPayoutPercent(clampPayoutPercent(addPayoutPercent))}
                className="w-14 bg-bg-elevated border border-border rounded-md px-2 py-1.5 text-sm text-fg tabular-nums"
              />
              <span className="text-[11px] text-fg-muted">%</span>
            </div>
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
            <p className="text-xs text-fg-muted">
              No active vendors.{' '}
              <Link to="/vendors" className="text-accent hover:underline">
                Create one
              </Link>
            </p>
          )}

          {trackings.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">No vendors assigned</p>
          ) : (
            <div className="divide-y divide-border border-t border-border">
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
                const otpUrls = buildOtpExposeUrls(window.location.origin, campaign.id, vendorId)
                const dcbUrls = buildDcbExposeUrls(window.location.origin, campaign.id, vendorId)
                const copyKey = String(vendorId)
                const payout = clampPayoutPercent(t.payoutPercent ?? 100)
                const endpoints = dcbApiExpose
                  ? [
                      { key: `${copyKey}-pin`, method: 'POST', label: 'PIN', url: dcbUrls.pincodeUrl },
                      { key: `${copyKey}-confirm`, method: 'POST', label: 'Confirm', url: dcbUrls.confirmUrl },
                      { key: `${copyKey}-status`, method: 'GET', label: 'Status', url: dcbUrls.statusUrl },
                      { key: `${copyKey}-screen`, method: 'GET', label: 'Screen', url: dcbUrls.screenUrl },
                    ]
                  : apiExpose
                    ? [
                        { key: `${copyKey}-send`, method: 'POST', label: 'Send', url: otpUrls.sendUrl },
                        { key: `${copyKey}-verify`, method: 'POST', label: 'Verify', url: otpUrls.verifyUrl },
                      ]
                    : [{ key: copyKey, method: 'GET', label: 'Track', url: displayUrl }]

                return (
                  <div key={copyKey} className={`py-3 ${linkActive ? '' : 'opacity-70'}`}>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-fg truncate">{vendor?.name}</p>
                        {!linkActive && (
                          <p className="text-[11px] text-warning">
                            {!assignmentActive ? 'Assignment off' : 'Vendor deactivated'}
                          </p>
                        )}
                      </div>
                      <input
                        id={`payout-${vendorId}`}
                        key={`${vendorId}-${payout}`}
                        type="number"
                        min={0}
                        max={100}
                        aria-label={`${vendor?.name} payout percent`}
                        defaultValue={payout}
                        disabled={assigningVendor}
                        className="w-12 bg-transparent border-b border-border px-1 py-0.5 text-sm text-fg tabular-nums text-right disabled:opacity-50"
                        onBlur={(e) => handleSavePayoutPercent(vendorId, e.target.value)}
                      />
                      <span className="text-[11px] text-fg-subtle">%</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={assignmentActive}
                        aria-label={assignmentActive ? 'Deactivate assignment' : 'Activate assignment'}
                        disabled={assigningVendor}
                        onClick={() => handleToggleTrackingActive(vendorId)}
                        className={`
                          relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
                          transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
                          disabled:cursor-not-allowed disabled:opacity-50
                          ${assignmentActive ? 'bg-success' : 'bg-bg-canvas border border-border'}
                        `}
                      >
                        <span
                          className={`
                            inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm
                            transition-transform duration-200
                            ${assignmentActive ? 'translate-x-[1.1rem]' : 'translate-x-0.5'}
                          `}
                        />
                      </button>
                      {apiExpose && (
                        <IconButton
                          onClick={() => downloadVendorApiGuide(t, vendor)}
                          title="Download API payload"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </IconButton>
                      )}
                      {dcbApiExpose && (
                        <IconButton
                          onClick={() => downloadVendorHtmlScreen(t, vendor)}
                          title="Download HTML screen"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                        </IconButton>
                      )}
                      {dcbApiExpose && (
                        <IconButton
                          onClick={() => window.open(dcbUrls.screenUrl, '_blank')}
                          title="Open HTML screen"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </IconButton>
                      )}
                      {!apiExpose && (
                        <IconButton
                          onClick={() => window.open(displayUrl, '_blank')}
                          title="Open tracking URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </IconButton>
                      )}
                      <IconButton
                        className="text-danger hover:text-danger hover:bg-danger-muted"
                        onClick={() => handleRemoveTracking(vendorId)}
                        disabled={assigningVendor}
                        title="Remove assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconButton>
                    </div>
                    <div className="mt-1.5 space-y-0.5">
                      {endpoints.map((row) => (
                        <div key={row.key} className="flex items-center gap-2 text-[11px]">
                          <span className="w-10 shrink-0 font-mono text-fg-subtle">{row.method}</span>
                          <span className="w-14 shrink-0 text-fg-muted">{row.label}</span>
                          <code className="min-w-0 flex-1 truncate font-mono text-fg-subtle">
                            {relativeUrl(row.url)}
                          </code>
                          <IconButton
                            title={`Copy ${row.label}`}
                            onClick={() => copyTracking(row.url, row.key)}
                          >
                            {copiedId === row.key ? (
                              <Check className="w-3.5 h-3.5 text-success" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </IconButton>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Modal>

      <CampaignApiConfigModal
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        campaignId={campaign.id}
      />
    </AppShell>
  )
}

export default memo(CampaignDetailPage)
