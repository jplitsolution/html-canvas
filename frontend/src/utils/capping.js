import { isApiExposeCampaign, normalizeModeId } from '../components/flow/verificationModes'

/**
 * Filter campaigns eligible for fallback redirection based on channel compatibility rules:
 * - Webpage URL offers can only fallback to other Webpage URL offers (any verification mode).
 * - API Expose offers can only fallback to other API Expose offers with the exact same flow/verificationMode.
 */
export function getEligibleFallbackCampaigns(currentCampaign, allCampaigns) {
  if (!currentCampaign || !allCampaigns) return []
  const isCurrentApiExpose = isApiExposeCampaign(currentCampaign)
  const currentMode = normalizeModeId(currentCampaign?.verificationMode)

  return allCampaigns.filter((c) => {
    if (String(c.id) === String(currentCampaign.id)) return false
    const isTargetApiExpose = isApiExposeCampaign(c)
    const targetMode = normalizeModeId(c?.verificationMode)

    if (isCurrentApiExpose) {
      return isTargetApiExpose && targetMode === currentMode
    }
    return !isTargetApiExpose
  })
}

/**
 * Check whether vendors assigned to the current campaign are also assigned to the target fallback campaign.
 * Unmapped vendors will be stopped when cap is reached to avoid unmapped/untracked traffic loss.
 */
export function calculateVendorCoverage(currentCampaign, targetCampaign) {
  const currentTrackings = currentCampaign?.trackings || []
  const targetTrackings = targetCampaign?.trackings || []

  const assignedVendorIds = new Set(
    currentTrackings
      .filter((t) => t.active !== false)
      .map((t) => Number(t.vendorId ?? t.vendor?.id))
      .filter(Boolean),
  )
  const targetVendorIds = new Set(
    targetTrackings
      .filter((t) => t.active !== false)
      .map((t) => Number(t.vendorId ?? t.vendor?.id))
      .filter(Boolean),
  )

  const mapped = [...assignedVendorIds].filter((id) => targetVendorIds.has(id)).length
  const total = assignedVendorIds.size
  return {
    mappedCount: mapped,
    totalAssigned: total,
    unmappedCount: total - mapped,
  }
}

export const CAPPING_INTERVALS = [
  { id: 'daily', label: 'Daily (Resets every day at 00:00 IST)' },
  { id: 'weekly', label: 'Weekly (Resets every Monday at 00:00 IST)' },
  { id: 'monthly', label: 'Monthly (Resets on 1st of every month at 00:00 IST)' },
  { id: 'total', label: 'Lifetime / Total (No automatic reset)' },
]

export const CAPPING_METRICS = [
  {
    id: 'conversions',
    label: 'Conversions (Subscribers)',
    description: 'Cap triggers when successful subscribers reach limit.',
    limitLabel: 'Conversion Cap Limit',
    limitHelp: 'Maximum number of successful subscriptions/conversions before action triggers.',
  },
  {
    id: 'clicks',
    label: 'Clicks (Traffic)',
    description: 'Cap triggers when incoming clicks/requests reach limit.',
    limitLabel: 'Click Cap Limit',
    limitHelp: 'Maximum number of accepted incoming clicks/requests before action triggers.',
  },
]

