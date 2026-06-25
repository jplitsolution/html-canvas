import * as campaignsApi from '../../services/api/campaigns'

export function createCampaignSlice(set, get) {
  return {
    campaigns: [],
    campaignsLoading: false,
    campaign: null,
    campaignPage: null,

    fetchCampaigns: async () => {
      set({ campaignsLoading: true })
      try {
        const campaigns = await campaignsApi.listCampaigns()
        set({ campaigns, campaignsLoading: false })
      } catch (err) {
        set({ campaignsLoading: false })
        get().addToast(err.message || 'Failed to load campaigns', 'error')
      }
    },

    loadCampaign: async (id) => {
      set({ loading: true, error: null })
      try {
        const campaign = await campaignsApi.getCampaign(id)
        set({ campaign, loading: false })
        return campaign
      } catch (err) {
        set({ loading: false, error: err.message })
        get().addToast(err.message || 'Failed to load campaign', 'error')
        throw err
      }
    },

    loadCampaignPage: async (campaignId, pageType) => {
      set({ loading: true, error: null })
      try {
        const page = await campaignsApi.getCampaignPage(campaignId, pageType)
        set({ campaignPage: page, loading: false })
        return page
      } catch (err) {
        set({ loading: false, error: err.message })
        get().addToast(err.message || 'Failed to load page', 'error')
        throw err
      }
    },

    createCampaign: async (payload) => {
      const campaign = await campaignsApi.createCampaign(payload)
      set((s) => ({ campaigns: [campaign, ...s.campaigns] }))
      get().addToast('Campaign created', 'success')
      return campaign.id
    },

    updateCampaign: async (id, payload) => {
      const updated = await campaignsApi.updateCampaign(id, payload)
      set((s) => ({
        campaign: s.campaign?.id === id ? updated : s.campaign,
        campaigns: s.campaigns.map((c) => (c.id === id ? updated : c)),
      }))
      return updated
    },

    deleteCampaign: async (id) => {
      await campaignsApi.deleteCampaign(id)
      set((s) => ({
        campaigns: s.campaigns.filter((c) => c.id !== id),
        campaign: s.campaign?.id === id ? null : s.campaign,
      }))
    },

    saveCampaignPageContent: async (campaignId, pageType, payload) => {
      set({ saving: true })
      try {
        await campaignsApi.saveCampaignPage(campaignId, pageType, payload)
        set({ saving: false, isDirty: false })
        await get().loadCampaign(campaignId)
      } catch (err) {
        set({ saving: false })
        get().addToast(err.message || 'Failed to save page', 'error')
        throw err
      }
    },

    applyCampaignDefaults: async (id) => {
      try {
        const updated = await campaignsApi.applyCampaignDefaults(id)
        set((s) => ({
          campaign: s.campaign?.id === id ? updated : s.campaign,
          campaigns: s.campaigns.map((c) => (c.id === id ? updated : c)),
        }))
        get().addToast('Default templates applied', 'success')
        return updated
      } catch (err) {
        get().addToast(err.message || 'Failed to apply defaults', 'error')
        throw err
      }
    },
  }
}
