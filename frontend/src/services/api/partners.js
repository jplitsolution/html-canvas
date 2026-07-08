import { apiClient } from './client'

export async function listVendors() {
  return apiClient('/partners/vendors')
}

export async function getVendor(id) {
  return apiClient(`/partners/vendors/${id}`)
}

export async function createVendor(payload) {
  return apiClient('/partners/vendors', { method: 'POST', body: payload })
}

export async function updateVendor(id, payload) {
  return apiClient(`/partners/vendors/${id}`, { method: 'PATCH', body: payload })
}

export async function deleteVendor(id) {
  return apiClient(`/partners/vendors/${id}`, { method: 'DELETE' })
}

export async function listAffiliates(vendorId) {
  return apiClient(`/partners/vendors/${vendorId}/affiliates`)
}

export async function createAffiliate(payload) {
  return apiClient('/partners/affiliates', { method: 'POST', body: payload })
}

export async function updateAffiliate(id, payload) {
  return apiClient(`/partners/affiliates/${id}`, { method: 'PATCH', body: payload })
}

export async function deleteAffiliate(id) {
  return apiClient(`/partners/affiliates/${id}`, { method: 'DELETE' })
}

/**
 * Build the shareable tracking URL for a campaign + vendor + affiliate.
 * Leaves click_id as the `{}` macro for the affiliate/network to fill.
 */
export function buildTrackingUrl({ origin, campaign, vendorCode, affiliateCode }) {
  const base = origin || window.location.origin
  const params = new URLSearchParams({
    country: campaign.country,
    operator: campaign.operator,
    campid: String(campaign.id),
  })
  let qs = params.toString()
  if (vendorCode) qs += `&vid=${encodeURIComponent(vendorCode)}`
  if (affiliateCode) qs += `&aff_id=${encodeURIComponent(affiliateCode)}`
  // click_id kept as a raw macro placeholder (not URL-encoded on purpose).
  qs += '&click_id={}'
  return `${base}/subscription?${qs}`
}
