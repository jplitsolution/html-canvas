import { apiClient, getApiBase, getAuthToken } from './client'

export async function getLogsStatus() {
  return apiClient('/logs/status')
}

function buildQuery(params = {}) {
  const query = new URLSearchParams()
  const keys = [
    'from',
    'to',
    'eventType',
    'status',
    'vendorId',
    'affiliateId',
    'clickId',
    'rcid',
    'q',
    'page',
    'size',
    'visitId',
    'interval',
    'timezone',
    'view',
    'compareEvents',
    'format',
  ]
  for (const key of keys) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key])
    }
  }
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export async function searchCampaignLogs(campaignId, params = {}) {
  const url = campaignId === 'all' ? `/logs/all` : `/logs/campaign/${campaignId}`
  return apiClient(`${url}${buildQuery(params)}`)
}

export async function getCampaignLogAggregations(campaignId, params = {}) {
  const url = campaignId === 'all' ? `/logs/all/aggregations` : `/logs/campaign/${campaignId}/aggregations`
  return apiClient(`${url}${buildQuery(params)}`)
}

export async function searchAllCampaignLogs(params = {}) {
  return apiClient(`/logs/all${buildQuery(params)}`)
}

export async function getAllCampaignLogAggregations(params = {}) {
  return apiClient(`/logs/all/aggregations${buildQuery(params)}`)
}

export async function getVisitDetail(visitId) {
  return apiClient(`/analytics/visits/${visitId}`)
}

export async function downloadLogsExport(campaignId, params = {}, format = 'csv') {
  const token = getAuthToken()
  const isAll = campaignId === 'all' || !campaignId
  const urlPath = isAll ? `/logs/all/export` : `/logs/campaign/${campaignId}/export`
  const queryParams = { ...params, format, view: 'sessions' }
  const fullUrl = `${getApiBase()}${urlPath}${buildQuery(queryParams)}`

  const res = await fetch(fullUrl, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || 'Export failed')
  }

  let filename = `campaign_logs_${campaignId || 'all'}.${format}`
  const disposition = res.headers.get('content-disposition')
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/)
    if (match && match[1]) filename = match[1]
  }

  const blob = await res.blob()
  const blobUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(blobUrl)
}
