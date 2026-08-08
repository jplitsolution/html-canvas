/**
 * Canonical admin URLs:
 *   /markets
 *   /markets/:countryCode/:operatorCode
 *   /markets/:countryCode/:operatorCode/campaigns/:id
 *   /markets/:countryCode/:operatorCode/campaigns/:id/edit/:pageType
 *   /markets/.../campaigns/:id/flow  → Advanced Flow Builder
 */

export function marketPath(countryCode, operatorCode) {
  if (!countryCode || !operatorCode) return '/markets'
  return `/markets/${encodeURIComponent(countryCode)}/${encodeURIComponent(operatorCode)}`
}

export function campaignDetailPath(countryCode, operatorCode, campaignId) {
  if (!countryCode || !operatorCode || !campaignId) {
    return campaignId ? `/campaigns/${campaignId}` : '/markets'
  }
  return `${marketPath(countryCode, operatorCode)}/campaigns/${campaignId}`
}

export function campaignEditPath(countryCode, operatorCode, campaignId, pageType) {
  const base = campaignDetailPath(countryCode, operatorCode, campaignId)
  return `${base}/edit/${pageType}`
}

export function campaignFlowPath(countryCode, operatorCode, campaignId) {
  const base = campaignDetailPath(countryCode, operatorCode, campaignId)
  return `${base}/flow`
}

/** Resolve market codes from route params or campaign object. */
export function resolveMarketCodes(params = {}, campaign = null) {
  const countryCode =
    params.countryCode || campaign?.countryCode || campaign?.marketOperator?.country?.code || null
  const operatorCode =
    params.operatorCode || campaign?.operatorCode || campaign?.marketOperator?.code || null
  return { countryCode, operatorCode }
}
