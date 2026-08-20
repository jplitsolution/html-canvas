import { apiClient, getApiBase, getAuthToken } from './client'

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

export async function getPostbackStats({
  from,
  to,
  timezone,
  campaignId,
  vendorId,
  groupBy,
} = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (timezone) params.set('timezone', timezone)
  if (campaignId) params.set('campaignId', String(campaignId))
  if (vendorId) params.set('vendorId', String(vendorId))
  if (groupBy) params.set('groupBy', groupBy)
  return apiClient(`/partners/postbacks/stats?${params.toString()}`, {
    timeout: 60000,
  })
}

function reportQuery({
  date,
  from,
  to,
  timezone,
  campaignId,
  vendorId,
  outcome,
  hitType,
  q,
  view,
  page,
  limit,
  writeFile,
  format,
} = {}) {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (timezone) params.set('timezone', timezone)
  if (campaignId) params.set('campaignId', String(campaignId))
  if (vendorId) params.set('vendorId', String(vendorId))
  if (outcome && outcome !== 'all') params.set('outcome', outcome)
  if (hitType && hitType !== 'all') params.set('hitType', hitType)
  if (q) params.set('q', q)
  if (view) params.set('view', view)
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))
  if (writeFile) params.set('writeFile', '1')
  if (format) params.set('format', format)
  return params
}

export async function getPostbackDayReport(opts = {}) {
  const params = reportQuery(opts)
  return apiClient(`/partners/postbacks/day-report?${params.toString()}`, {
    timeout: 60000,
  })
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Export date-range logs as CSV or TXT (also written on the API host). */
export async function exportPostbackDayReport(opts = {}) {
  const format = opts.format === 'txt' ? 'txt' : 'csv'
  const params = reportQuery({ ...opts, format })
  const token = getAuthToken()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)
  try {
    const response = await fetch(
      `${getApiBase()}/partners/postbacks/day-report?${params.toString()}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || 'Failed to export logs')
    }
    const blob = await response.blob()
    const filename =
      response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ||
      `postback-logs-${opts.from || opts.date || 'export'}.${format === 'txt' ? 'txt' : 'csv'}`
    downloadBlob(filename, blob)
    return { filename }
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Export timed out. Try a shorter date range.')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
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
