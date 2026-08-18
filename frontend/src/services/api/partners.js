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

export async function getPostbackSummary({ days, from, to, timezone } = {}) {
  const params = new URLSearchParams()
  if (days) params.set('days', String(days))
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (timezone) params.set('timezone', timezone)
  const qs = params.toString()
  return apiClient(`/partners/postbacks/summary${qs ? `?${qs}` : ''}`)
}

export async function listPostbacks({
  page = 1,
  limit = 25,
  status,
  q,
  vendorId,
  from,
  to,
  timezone,
} = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (status && status !== 'all') params.set('status', status)
  if (q) params.set('q', q)
  if (vendorId) params.set('vendorId', String(vendorId))
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (timezone) params.set('timezone', timezone)
  return apiClient(`/partners/postbacks?${params.toString()}`)
}

export async function getPostback(id) {
  return apiClient(`/partners/postbacks/${id}`)
}

export async function getPostbackDayReport({
  date,
  from,
  to,
  timezone,
} = {}) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (timezone) params.set('timezone', timezone)
  return apiClient(`/partners/postbacks/day-report?${params.toString()}`, {
    timeout: 60000,
  })
}

/**
 * Build the shareable tracking URL for a campaign + vendor.
 * tracking_campid = ours (BF-OBF-11); campid={} + click_id={} for the network.
 */
export function buildTrackingUrl({ origin, campaign, vendorCode }) {
  const base = origin || window.location.origin
  const params = new URLSearchParams({
    country: campaign.country,
    operator: campaign.operator,
  })
  const tracking = campaign.trackingId || String(campaign.id)
  let qs = params.toString()
  qs += `&tracking_campid=${encodeURIComponent(tracking)}`
  if (vendorCode) qs += `&vid=${encodeURIComponent(vendorCode)}`
  // Macros left raw (not URL-encoded) for the network to fill.
  qs += '&click_id={}'
  qs += '&campid={}'
  return `${base}/subscription?${qs}`
}
