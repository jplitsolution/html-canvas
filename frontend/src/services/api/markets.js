import { apiClient } from './client'
import { mapCampaign } from './campaigns'

export async function listMarkets() {
  return apiClient('/markets')
}

export async function createMarket(payload) {
  return apiClient('/markets', { method: 'POST', body: payload })
}

export async function getMarket(countryCode, operatorCode) {
  return apiClient(`/markets/${encodeURIComponent(countryCode)}/${encodeURIComponent(operatorCode)}`)
}

export async function listMarketCampaigns(countryCode, operatorCode) {
  const campaigns = await apiClient(
    `/markets/${encodeURIComponent(countryCode)}/${encodeURIComponent(operatorCode)}/campaigns`,
  )
  return (campaigns || []).map(mapCampaign).filter(Boolean)
}

export async function createMarketCampaign(countryCode, operatorCode, payload) {
  const campaign = await apiClient(
    `/markets/${encodeURIComponent(countryCode)}/${encodeURIComponent(operatorCode)}/campaigns`,
    { method: 'POST', body: payload, timeout: 60000 },
  )
  return mapCampaign(campaign)
}
