import { apiClient } from './client'

export const PAGE_TYPES = ['HOME', 'OTP', 'CONFIRM', 'THANKYOU', 'BLOCKED', 'ERROR']

export const PAGE_TYPE_LABELS = {
  HOME: 'Home',
  OTP: 'OTP',
  CONFIRM: 'Confirm',
  THANKYOU: 'Thank you',
  BLOCKED: 'Blocked',
  ERROR: 'Error',
}

export const REQUIRED_PAGE_TYPES = ['HOME', 'OTP', 'CONFIRM', 'THANKYOU']

function mapCampaign(campaign) {
  if (!campaign) return null
  const pages = (campaign.pages || []).map((page) => ({
    id: page.id,
    pageType: page.pageType,
    templateId: page.templateId,
    hasContent: Boolean(
      page.template?.data?.html &&
        (page.template.data.html === '[saved]' || String(page.template.data.html).trim().length > 0),
    ),
    updatedAt: page.updatedAt,
  }))
  const requiredComplete = REQUIRED_PAGE_TYPES.every((type) =>
    pages.find((p) => p.pageType === type)?.hasContent,
  )
  return {
    id: String(campaign.id),
    name: campaign.name,
    country: campaign.country,
    operator: campaign.operator,
    serviceId: campaign.serviceId || '',
    active: Boolean(campaign.active),
    pages,
    requiredComplete,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  }
}

function mapPageContent(page) {
  const data = page?.template?.data || {}
  return {
    pageType: page.pageType,
    templateId: page.templateId,
    projectData: data.projectData || {},
    html: data.html === '[saved]' ? '' : data.html || '',
    css: data.css === '[saved]' ? '' : data.css || '',
  }
}

export async function listCampaigns() {
  const campaigns = await apiClient('/campaigns')
  return (campaigns || []).map(mapCampaign).filter(Boolean)
}

export async function getCampaign(id) {
  const campaign = await apiClient(`/campaigns/${id}`)
  return mapCampaign(campaign)
}

export async function createCampaign(payload) {
  const campaign = await apiClient('/campaigns', {
    method: 'POST',
    body: payload,
  })
  return mapCampaign(campaign)
}

export async function updateCampaign(id, payload) {
  const campaign = await apiClient(`/campaigns/${id}`, {
    method: 'PATCH',
    body: payload,
  })
  return mapCampaign(campaign)
}

export async function deleteCampaign(id) {
  await apiClient(`/campaigns/${id}`, { method: 'DELETE' })
}

export async function getCampaignPage(campaignId, pageType) {
  const page = await apiClient(`/campaigns/${campaignId}/pages/${pageType}`)
  return mapPageContent(page)
}

export async function saveCampaignPage(campaignId, pageType, payload) {
  const page = await apiClient(`/campaigns/${campaignId}/pages/${pageType}`, {
    method: 'PATCH',
    body: payload,
  })
  return mapPageContent(page)
}

export async function getCampaignApiConfig(campaignId) {
  return apiClient(`/campaigns/${campaignId}/api-config`)
}

export async function saveCampaignApiConfig(campaignId, payload) {
  return apiClient(`/campaigns/${campaignId}/api-config`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function applyCampaignDefaults(id) {
  const campaign = await apiClient(`/campaigns/${id}/apply-defaults`, { method: 'POST' })
  return mapCampaign(campaign)
}

export function getCampaignPreviewUrl(campaign) {
  const params = new URLSearchParams({
    country: campaign.country,
    operator: campaign.operator,
  })
  return `/subscription?${params.toString()}`
}
