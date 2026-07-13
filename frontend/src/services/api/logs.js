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
  return apiClient(`/logs/campaign/${campaignId}${buildQuery(params)}`)
}

export async function getCampaignLogAggregations(campaignId, params = {}) {
  return apiClient(`/logs/campaign/${campaignId}/aggregations${buildQuery(params)}`)
}

export async function searchAllCampaignLogs(params = {}) {
  return apiClient(`/logs/all${buildQuery(params)}`)
}

export async function getAllCampaignLogAggregations(params = {}) {
  return apiClient(`/logs/all/aggregations${buildQuery(params)}`)
}
