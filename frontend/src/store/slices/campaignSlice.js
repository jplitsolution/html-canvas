import * as campaignsApi from '../../services/api/campaigns'

export function createCampaignSlice(set, get) {
  return {
    campaigns: [],
    campaignsLoading: false,
    campaign: null,
    campaignPage: null,
    campaignLoadingId: null,
    campaignPageLoadingKey: null,

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

    loadCampaign: async (id, force = false) => {
      const current = get().campaign
      if (!force && current?.id === String(id) && !get().error) return current

      if (get().campaignLoadingId === String(id) && get().loading) {
        return get().campaign
      }

      set({ loading: true, error: null, campaignLoadingId: String(id) })
      try {
        const campaign = await campaignsApi.getCampaign(id)
        set({ campaign, loading: false, campaignLoadingId: null })
        return campaign
      } catch (err) {
        set({ loading: false, error: err.message, campaignLoadingId: null })
        get().addToast(err.message || 'Failed to load campaign', 'error')
        throw err
      }
    },

    loadCampaignPage: async (campaignId, pageType) => {
      const key = `${String(campaignId)}|${String(pageType)}`
      const current = get().campaignPage
      if (current?.pageType === pageType && !get().error) return current

      if (get().campaignPageLoadingKey === key && get().loading) {
        return get().campaignPage
      }

      set({ loading: true, error: null, campaignPageLoadingKey: key })
      try {
        const page = await campaignsApi.getCampaignPage(campaignId, pageType)
        set({ campaignPage: page, loading: false, campaignPageLoadingKey: null })
        return page
      } catch (err) {
        set({ loading: false, error: err.message, campaignPageLoadingKey: null })
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
