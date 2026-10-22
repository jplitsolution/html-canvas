import { memo, useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'
import Button from '../ui/Button'
import useStore from '../../store/useStore'
import { isApiExposeCampaign } from '../flow/verificationModes'
import { getEligibleFallbackCampaigns, calculateVendorCoverage, CAPPING_INTERVALS } from '../../utils/capping'

function CampaignCappingModal({ isOpen, onClose, campaignId }) {
  const campaign = useStore((s) => s.campaign)
  const updateCampaign = useStore((s) => s.updateCampaign)
  const campaigns = useStore((s) => s.campaigns)
  const fetchCampaigns = useStore((s) => s.fetchCampaigns)

  const [cappingEnabledDraft, setCappingEnabledDraft] = useState(false)
  const [cappingLimitDraft, setCappingLimitDraft] = useState('')
  const [cappingActionDraft, setCappingActionDraft] = useState('stop')
  const [fallbackCampaignIdDraft, setFallbackCampaignIdDraft] = useState('')
  const [cappingIntervalDraft, setCappingIntervalDraft] = useState('daily')
  const [savingCapping, setSavingCapping] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchCampaigns().catch(() => {})
    }
  }, [isOpen, fetchCampaigns])

  useEffect(() => {
    if (!campaign || String(campaign.id) !== String(campaignId)) return
    setCappingEnabledDraft(Boolean(campaign.cappingEnabled))
    setCappingLimitDraft(
      campaign.cappingLimit != null ? String(campaign.cappingLimit) : '',
    )
    setCappingActionDraft(campaign.cappingAction || 'stop')
    setFallbackCampaignIdDraft(
      campaign.fallbackCampaignId != null ? String(campaign.fallbackCampaignId) : '',
    )
    setCappingIntervalDraft(campaign.cappingInterval || 'daily')
  }, [
    campaignId,
    campaign?.id,
    campaign?.cappingEnabled,
    campaign?.cappingLimit,
    campaign?.cappingAction,
    campaign?.fallbackCampaignId,
    campaign?.cappingInterval,
    isOpen,
  ])

  const isCurrentApiExpose = isApiExposeCampaign(campaign)

  const eligibleFallbackCampaigns = useMemo(() => {
    return getEligibleFallbackCampaigns(campaign, campaigns)
  }, [campaign, campaigns])

  const selectedTargetCampaign = useMemo(() => {
    if (!fallbackCampaignIdDraft || !campaigns) return null
    return campaigns.find((c) => String(c.id) === String(fallbackCampaignIdDraft)) || null
  }, [fallbackCampaignIdDraft, campaigns])

  const { mappedCount, totalAssigned, unmappedCount } = useMemo(() => {
    return calculateVendorCoverage(campaign, selectedTargetCampaign)
  }, [campaign, selectedTargetCampaign])

  const hasCappingChanges =
    cappingEnabledDraft !== Boolean(campaign?.cappingEnabled) ||
    cappingLimitDraft !==
      (campaign?.cappingLimit != null ? String(campaign.cappingLimit) : '') ||
    cappingActionDraft !== (campaign?.cappingAction || 'stop') ||
    fallbackCampaignIdDraft !==
      (campaign?.fallbackCampaignId != null ? String(campaign.fallbackCampaignId) : '') ||
    cappingIntervalDraft !== (campaign?.cappingInterval || 'daily')

  const handleSaveCapping = async () => {
    if (!campaign) return
    setSavingCapping(true)
    try {
      await updateCampaign(campaign.id, {
        cappingEnabled: cappingEnabledDraft,
        cappingLimit: cappingLimitDraft !== '' ? parseInt(cappingLimitDraft, 10) : null,
        cappingAction: cappingActionDraft,
        fallbackCampaignId: fallbackCampaignIdDraft ? parseInt(fallbackCampaignIdDraft, 10) : null,
        cappingInterval: cappingIntervalDraft,
      })
      useStore.getState().addToast('Capping settings saved successfully', 'success')
      onClose()
    } catch {
      // toast shown in slice
    } finally {
      setSavingCapping(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Offer Capping & Traffic Fallback"
      size="lg"
    >
      <div className="space-y-5">
        {/* Header Switch */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-fg">Enable Click Capping</h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Set traffic click limits for this offer. When the cap is reached, traffic can be stopped or redirected to another compatible offer.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={cappingEnabledDraft}
            onClick={() => setCappingEnabledDraft(!cappingEnabledDraft)}
            className={`
              relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
              transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
              ${cappingEnabledDraft ? 'bg-accent' : 'bg-bg-subtle border border-border'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
                transition-transform duration-200
                ${cappingEnabledDraft ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {cappingEnabledDraft ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-fg mb-1">
                  Click Cap Limit
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono focus:outline-none focus:border-accent"
                  value={cappingLimitDraft}
                  onChange={(e) => setCappingLimitDraft(e.target.value)}
                  placeholder="e.g. 200"
                />
                <p className="text-[11px] text-fg-muted mt-1">
                  Maximum number of accepted clicks/requests before action triggers.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg mb-1">
                  Reset Interval
                </label>
                <select
                  value={cappingIntervalDraft}
                  onChange={(e) => setCappingIntervalDraft(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg focus:outline-none focus:border-accent"
                >
                  {CAPPING_INTERVALS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-fg-muted mt-1">
                  Whether the click count resets daily, weekly, monthly (at 00:00 IST), or accumulates as a lifetime cap.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">
                Action When Cap Reached
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCappingActionDraft('stop')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    cappingActionDraft === 'stop'
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">Stop Traffic</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                    Clicks are immediately stopped. No DB visit is logged, and an &quot;Offer Stopped&quot; message is served.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCappingActionDraft('fallback')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    cappingActionDraft === 'fallback'
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">Fallback / Redirect</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                    Forward traffic to another offer. Current offer click count is preserved; target offer records and counts the clicks.
                  </p>
                </button>
              </div>
            </div>

            {cappingActionDraft === 'fallback' && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-fg">
                      Fallback Target Offer
                    </label>
                    <span className="text-[11px] text-fg-subtle">
                      {isCurrentApiExpose
                        ? 'Showing API expose offers with matching flow'
                        : 'Showing Webpage URL offers'}
                    </span>
                  </div>
                  <select
                    value={fallbackCampaignIdDraft}
                    onChange={(e) => setFallbackCampaignIdDraft(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg focus:outline-none focus:border-accent"
                  >
                    <option value="">-- Select a fallback campaign --</option>
                    {eligibleFallbackCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} - {c.name} ({c.country} / {c.operator}) [{c.verificationMode || 'BOTH'}]
                      </option>
                    ))}
                  </select>
                  {eligibleFallbackCampaigns.length === 0 && (
                    <p className="text-[11px] text-warning mt-1">
                      No compatible fallback campaigns found matching the filtering criteria.
                    </p>
                  )}
                </div>

                {fallbackCampaignIdDraft && (
                  <div
                    className={`rounded-lg border px-3.5 py-2.5 text-xs ${
                      unmappedCount > 0
                        ? 'border-warning/40 bg-warning-muted/30 text-fg'
                        : 'border-success/40 bg-success-muted/30 text-fg'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5 mb-1">
                      {unmappedCount > 0 ? '⚠️ Vendor Mapping Notice' : '✅ Full Vendor Coverage'}
                    </div>
                    <p className="text-[11px] leading-relaxed text-fg-muted">
                      {unmappedCount > 0
                        ? `${mappedCount} of ${totalAssigned} vendor(s) assigned to this campaign are also assigned to the target offer. The remaining ${unmappedCount} unassigned vendor(s) will be stopped with 'Offer Stopped' to prevent anonymous untracked clicks.`
                        : `All ${totalAssigned} assigned vendor(s) are mapped to the target offer. Traffic will smoothly transition without tracking loss.`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-fg-muted bg-bg-subtle/50 rounded-lg border border-dashed border-border">
            Click capping is currently disabled. Toggle the switch above to set limits and traffic fallback.
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={savingCapping}>
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={savingCapping || !hasCappingChanges}
            onClick={handleSaveCapping}
          >
            {savingCapping ? 'Saving...' : 'Save capping settings'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default memo(CampaignCappingModal)
