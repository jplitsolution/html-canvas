import { Link } from 'react-router-dom'
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  Plus,
  Trash2,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'
import Modal from '../../components/common/Modal'
import AllowedCallbackStatusesField, {
  fallbackCallbackStatusesHint,
  effectiveCallbackStatuses,
} from '../../components/partners/AllowedCallbackStatusesField'
import { buildTrackingUrl } from '../../services/api/partners'
import { buildOtpExposeApiGuide, clampPayoutPercent } from '../../services/api/otp'
import { buildDcbExposeApiGuide, buildDcbExposeUrls } from '../../services/api/dcbExpose'
import { downloadTextFile } from '../../utils/download'
import useStore from '../../store/useStore'

function relativeUrl(url) {
  if (!url || typeof window === 'undefined') return url
  return url.replace(window.location.origin, '')
}

export default function VendorAssignModal({
  isOpen,
  onClose,
  flow,
  campaign,
  vendors,
  activeVendors,
  trackings,
  assigningVendor,
  selectedVendorForAdd,
  setSelectedVendorForAdd,
  addPayoutPercent,
  setAddPayoutPercent,
  addAllowedStatuses,
  setAddAllowedStatuses,
  copiedId,
  onCopyTracking,
  onSubmitTracking,
  onRemoveTracking,
  onToggleTrackingActive,
  onSavePayoutPercent,
  onSaveTrackingStatuses,
}) {
  const addToast = useStore((s) => s.addToast)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const actions = flow.assignmentActions || {}

  const downloadVendorApiGuide = (t, vendor) => {
    const vendorId = vendor?.id || t.vendor?.id
    const kind = actions.downloadApiGuide
    const payload =
      kind === 'dcb'
        ? buildDcbExposeApiGuide({ origin, campaign, vendor, vendorId })
        : buildOtpExposeApiGuide({ origin, campaign, vendor, vendorId })
    const safeName = String(vendor?.code || vendor?.name || vendorId || 'vendor')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .toLowerCase()
    const prefix = kind === 'dcb' ? 'dcb-billing-api' : 'otp-api'
    downloadTextFile(
      `${prefix}-campaign-${campaign.id}-vendor-${safeName}.json`,
      payload,
      'application/json;charset=utf-8',
    )
    addToast('API payload downloaded', 'success')
  }

  const downloadVendorHtmlScreen = async (t, vendor) => {
    const vendorId = vendor?.id || t.vendor?.id
    const urls = buildDcbExposeUrls(origin, campaign.id, vendorId)
    const safeName = String(vendor?.code || vendor?.name || vendorId || 'vendor')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .toLowerCase()
    try {
      const res = await fetch(`${urls.screenUrl}?absolute=1`)
      const html = await res.text()
      if (!res.ok) {
        addToast('Could not download HTML screen', 'error')
        return
      }
      downloadTextFile(
        `dcb-billing-screen-campaign-${campaign.id}-vendor-${safeName}.html`,
        html,
        'text/html;charset=utf-8',
      )
      addToast('HTML screen downloaded', 'success')
    } catch {
      addToast('Could not download HTML screen', 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vendors" size="xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-fg-muted">
            Statuses are per campaign assignment. The same vendor can fire on{' '}
            <code className="font-mono">grace</code> here and{' '}
            <code className="font-mono">active</code> on another campaign.
          </p>
          <Link to="/vendors" className="text-xs text-accent hover:underline shrink-0">
            Manage
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="flex-1 text-sm border border-border rounded-md px-3 py-1.5 bg-bg-elevated text-fg focus:outline-none focus:ring-2 focus:ring-ring"
            value={selectedVendorForAdd}
            onChange={(e) => {
              const id = e.target.value
              setSelectedVendorForAdd(id)
              const vendor = activeVendors.find((v) => String(v.id) === String(id))
              setAddAllowedStatuses(vendor?.allowedCallbackStatuses || '')
            }}
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
            onClick={onSubmitTracking}
            disabled={assigningVendor || !selectedVendorForAdd}
            className="sm:shrink-0"
          >
            <Plus className="w-4 h-4" />
            {assigningVendor ? 'Assigning…' : 'Assign'}
          </Button>
        </div>
        {selectedVendorForAdd ? (
          <AllowedCallbackStatusesField
            compact
            value={addAllowedStatuses}
            onChange={(next) => setAddAllowedStatuses(next || '')}
            disabled={assigningVendor}
            label="Allowed statuses for this campaign"
            hint="Saved on this campaign’s vendor assignment only. Change them later without affecting other campaigns."
          />
        ) : null}
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
              const copyKey = String(vendorId)
              const payout = clampPayoutPercent(t.payoutPercent ?? 100)
              const dcbUrls = buildDcbExposeUrls(origin, campaign.id, vendorId)
              const endpoints = flow.getVendorEndpoints({
                origin,
                campaign,
                vendorId,
                displayUrl,
              })

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
                      onBlur={(e) => onSavePayoutPercent(vendorId, e.target.value)}
                    />
                    <span className="text-[11px] text-fg-subtle">%</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={assignmentActive}
                      aria-label={assignmentActive ? 'Deactivate assignment' : 'Activate assignment'}
                      disabled={assigningVendor}
                      onClick={() => onToggleTrackingActive(vendorId)}
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
                    {actions.downloadApiGuide ? (
                      <IconButton
                        onClick={() => downloadVendorApiGuide(t, vendor)}
                        title="Download API payload"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </IconButton>
                    ) : null}
                    {actions.downloadHtmlScreen ? (
                      <IconButton
                        onClick={() => downloadVendorHtmlScreen(t, vendor)}
                        title="Download HTML screen"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                      </IconButton>
                    ) : null}
                    {actions.openHtmlScreen ? (
                      <IconButton
                        onClick={() => window.open(dcbUrls.screenUrl, '_blank')}
                        title="Open HTML screen"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </IconButton>
                    ) : null}
                    {actions.openTracking ? (
                      <IconButton
                        onClick={() => window.open(displayUrl, '_blank')}
                        title="Open tracking URL"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </IconButton>
                    ) : null}
                    <IconButton
                      className="text-danger hover:text-danger hover:bg-danger-muted"
                      onClick={() => onRemoveTracking(vendorId)}
                      disabled={assigningVendor}
                      title="Remove assignment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                  <div className="mt-2.5 rounded-lg border border-border bg-bg-muted/15 px-2.5 py-2">
                    <AllowedCallbackStatusesField
                      compact
                      value={t.allowedCallbackStatuses || ''}
                      onChange={(next) => onSaveTrackingStatuses(vendorId, next)}
                      disabled={assigningVendor}
                      label="Allowed statuses for this campaign"
                      hint={`This campaign + ${vendor?.name || 'vendor'} only. Other campaigns keep their own list. ${fallbackCallbackStatusesHint(vendor)} Currently fires on: ${effectiveCallbackStatuses(t.allowedCallbackStatuses, vendor)}`}
                    />
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
                          onClick={() => onCopyTracking(row.url, row.key)}
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
  )
}
