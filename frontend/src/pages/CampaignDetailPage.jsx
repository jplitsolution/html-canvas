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
} from 'lucide-react'
import useStore from '../store/useStore'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/common/Modal'
import { copyToClipboard } from '../utils/clipboard'
import {
  marketPath,
  resolveMarketCodes,
} from '../utils/routes'
import { getCampaignPreviewUrl } from '../services/api/campaigns'
import { buildTrackingUrl } from '../services/api/partners'
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
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    fetchVendors().catch(() => {})
  }, [fetchVendors])

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
      const tid = t.vendor?.id
      if (!tid || seen.has(tid)) continue
      seen.add(tid)
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
  const canActivate = campaign.requiredComplete
  const activateBlockedReason =
    !campaign.active && !canActivate
      ? 'Complete the pages required by this flow first'
      : null
  const trackings = vendorTrackings

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
      </div>

      <Modal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        title="Vendors & tracking"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-fg-muted">
              Assign vendors to generate shareable tracking URLs.{' '}
              <code className="font-mono text-[10px]">tracking_campid</code> = ours;{' '}
              <code className="font-mono text-[10px]">campid=&#123;&#125;</code> +{' '}
              <code className="font-mono text-[10px]">click_id=&#123;&#125;</code> = vendor
              macros.
            </p>
            <Link to="/vendors" className="text-xs text-accent hover:underline shrink-0">
              Manage vendors
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-bg-muted/25 p-4">
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
            <div className="py-8 text-center">
              <Store className="w-8 h-8 mx-auto mb-3 text-fg-subtle" />
              <p className="text-sm font-medium text-fg">No tracking assigned</p>
              <p className="text-xs text-fg-muted mt-1 max-w-sm mx-auto">
                Pick a vendor above to generate a tracking link for this campaign.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
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
                    className={`px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${
                      linkActive ? '' : 'bg-bg-muted/30'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-fg">{vendor?.name}</span>
                        <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-muted text-fg-muted border border-border">
                          {vendor?.code}
                        </code>
                        <span className={`badge ${linkActive ? 'badge-success' : 'badge-muted'}`}>
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
