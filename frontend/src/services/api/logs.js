import { apiClient } from './client'

export async function getLogsStatus() {
  return apiClient('/logs/status')
}

function buildQuery(params = {}) {
  const query = new URLSearchParams()
  const keys = [
    'from',
    'to',
    'eventType',
    'vendorId',
    'affiliateId',
    'clickId',
    'q',
    'page',
    'size',
    'visitId',
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
