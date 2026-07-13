import * as campaignsApi from '../../services/api/campaigns'

function sameId(a, b) {
  return String(a) === String(b)
}

/** In-flight promise dedupe (survives React Strict Mode double-mount). */
let campaignsInflight = null
const campaignInflight = new Map()
const campaignPageInflight = new Map()

export function createCampaignSlice(set, get) {
  return {
    campaigns: [],
    campaignsLoading: false,
    campaignsFetched: false,
    campaign: null,
    campaignPage: null,
    campaignLoadingId: null,
    campaignPageLoadingKey: null,
    campaignRevision: 0,

    bumpCampaignRevision: () => set((s) => ({ campaignRevision: s.campaignRevision + 1 })),

    /**
     * List campaigns. Cached after first successful load.
     * Pass `{ force: true }` only after mutations that need a full list reload.
     */
    fetchCampaigns: async ({ force = false } = {}) => {
      if (!force && get().campaignsFetched) return get().campaigns
      if (!force && campaignsInflight) return campaignsInflight

      const run = async () => {
        set({ campaignsLoading: true })
        try {
          const campaigns = await campaignsApi.listCampaigns()
          set({ campaigns, campaignsLoading: false, campaignsFetched: true })
          return campaigns
        } catch (err) {
          set({ campaignsLoading: false })
          get().addToast(err.message || 'Failed to load campaigns', 'error')
          throw err
        } finally {
          campaignsInflight = null
        }
      }

      campaignsInflight = run()
      return campaignsInflight
    },

    /**
     * Load one campaign. Reuses store cache for the same id unless `force`.
     */
    loadCampaign: async (id, force = false) => {
      const key = String(id)
      const current = get().campaign
      if (!force && current && sameId(current.id, id) && !get().error) return current

      if (!force && campaignInflight.has(key)) return campaignInflight.get(key)

      const run = async () => {
        set({ loading: true, error: null, campaignLoadingId: key })
        try {
          const campaign = await campaignsApi.getCampaign(id)
          set((s) => ({
            campaign,
            loading: false,
            campaignLoadingId: null,
            campaigns: s.campaigns.some((c) => sameId(c.id, campaign.id))
              ? s.campaigns.map((c) => (sameId(c.id, campaign.id) ? campaign : c))
              : s.campaigns,
          }))
          return campaign
        } catch (err) {
          set({ loading: false, error: err.message, campaignLoadingId: null })
          get().addToast(err.message || 'Failed to load campaign', 'error')
          throw err
        } finally {
          campaignInflight.delete(key)
        }
      }

      const promise = run()
      campaignInflight.set(key, promise)
      return promise
    },

    /** Quiet refresh after mutation — updates store, no full-page loading flash. */
    refreshCampaign: async (id) => {
      try {
        const campaign = await campaignsApi.getCampaign(id)
        set((s) => ({
          campaign: !s.campaign || sameId(s.campaign.id, id) ? campaign : s.campaign,
          campaigns: s.campaigns.some((c) => sameId(c.id, campaign.id))
            ? s.campaigns.map((c) => (sameId(c.id, campaign.id) ? campaign : c))
            : s.campaigns,
          campaignsFetched: true,
          campaignRevision: s.campaignRevision + 1,
          error: null,
        }))
        return campaign
      } catch (err) {
        get().addToast(err.message || 'Failed to refresh campaign', 'error')
        throw err
      }
    },

    loadCampaignPage: async (campaignId, pageType, force = false) => {
      const key = `${String(campaignId)}|${String(pageType)}`
      const current = get().campaignPage
      if (
        !force &&
        current?.pageType === pageType &&
        sameId(current.campaignId, campaignId) &&
        !get().error
      ) {
        return current
      }

      if (!force && campaignPageInflight.has(key)) return campaignPageInflight.get(key)

      const run = async () => {
        set({ loading: true, error: null, campaignPageLoadingKey: key })
        try {
          const page = await campaignsApi.getCampaignPage(campaignId, pageType)
          set({
            campaignPage: { ...page, campaignId: Number(campaignId) || campaignId },
            loading: false,
            campaignPageLoadingKey: null,
          })
          return page
        } catch (err) {
          set({ loading: false, error: err.message, campaignPageLoadingKey: null })
          get().addToast(err.message || 'Failed to load page', 'error')
          throw err
        } finally {
          campaignPageInflight.delete(key)
        }
      }

      const promise = run()
      campaignPageInflight.set(key, promise)
      return promise
    },

    createCampaign: async (payload) => {
      try {
        const campaign = await campaignsApi.createCampaign(payload)
        set((s) => ({
          campaigns: [campaign, ...s.campaigns],
          campaign,
          campaignsFetched: true,
          campaignRevision: s.campaignRevision + 1,
        }))
        get().addToast('Campaign created', 'success')
        return campaign.id
      } catch (err) {
        get().addToast(err.message || 'Failed to create campaign', 'error')
        throw err
      }
    },

    updateCampaign: async (id, payload) => {
      try {
        const updated = await campaignsApi.updateCampaign(id, payload)
        set((s) => ({
          campaign: s.campaign && sameId(s.campaign.id, id) ? updated : s.campaign,
          campaigns: s.campaigns.map((c) => (sameId(c.id, id) ? updated : c)),
          campaignRevision: s.campaignRevision + 1,
        }))
        return updated
      } catch (err) {
        get().addToast(err.message || 'Failed to update campaign', 'error')
        throw err
      }
    },

    deleteCampaign: async (id) => {
      try {
        await campaignsApi.deleteCampaign(id)
        set((s) => ({
          campaigns: s.campaigns.filter((c) => !sameId(c.id, id)),
          campaign: s.campaign && sameId(s.campaign.id, id) ? null : s.campaign,
          campaignPage:
            s.campaignPage && sameId(s.campaignPage.campaignId, id) ? null : s.campaignPage,
          campaignRevision: s.campaignRevision + 1,
        }))
      } catch (err) {
        get().addToast(err.message || 'Failed to delete campaign', 'error')
        throw err
      }
    },

    saveCampaignPageContent: async (campaignId, pageType, payload) => {
      set({ saving: true })
      try {
        const page = await campaignsApi.saveCampaignPage(campaignId, pageType, payload)
        set({
          saving: false,
          isDirty: false,
          campaignPage: { ...page, campaignId: Number(campaignId) || campaignId },
        })
        await get().refreshCampaign(campaignId)
        return page
      } catch (err) {
        set({ saving: false })
        get().addToast(err.message || 'Failed to save page', 'error')
        throw err
      }
    },

    afterPageSaved: async (campaignId, pageType, savedPage) => {
      if (savedPage) {
        set({
          campaignPage: { ...savedPage, campaignId: Number(campaignId) || campaignId },
        })
      } else {
        set({ campaignPage: null })
      }
      await get().refreshCampaign(campaignId)
      if (pageType && !savedPage) {
        await get().loadCampaignPage(campaignId, pageType, true)
      }
    },

    applyCampaignDefaults: async (id) => {
      try {
        const updated = await campaignsApi.applyCampaignDefaults(id)
        set((s) => ({
          campaign: s.campaign && sameId(s.campaign.id, id) ? updated : s.campaign,
          campaigns: s.campaigns.map((c) => (sameId(c.id, id) ? updated : c)),
          campaignPage: null,
          campaignRevision: s.campaignRevision + 1,
        }))
        get().addToast('Default templates applied', 'success')
        return updated
      } catch (err) {
        get().addToast(err.message || 'Failed to apply defaults', 'error')
        throw err
      }
    },

    loadCampaignFlow: async (campaignId) => {
      try {
        return await campaignsApi.getCampaignFlow(campaignId)
      } catch (err) {
        get().addToast(err.message || 'Failed to load flow', 'error')
        throw err
      }
    },

    saveCampaignFlow: async (campaignId, payload) => {
      try {
        const result = await campaignsApi.saveCampaignFlow(campaignId, payload)
        await get().refreshCampaign(campaignId)
        get().addToast('Flow saved', 'success')
        return result
      } catch (err) {
        get().addToast(err.message || 'Failed to save flow', 'error')
        throw err
      }
    },

    loadCampaignApiConfig: async (campaignId) => {
      return campaignsApi.getCampaignApiConfig(campaignId)
    },

    saveCampaignApiConfig: async (campaignId, payload) => {
      set({ saving: true })
      try {
        const result = await campaignsApi.saveCampaignApiConfig(campaignId, payload)
        set({ saving: false })
        await get().refreshCampaign(campaignId)
        get().addToast('API settings saved', 'success')
        return result
      } catch (err) {
        set({ saving: false })
        get().addToast(err.message || 'Failed to save API config', 'error')
        throw err
      }
    },

    loadCampaignActivityLogs: async (campaignId, params = {}) => {
      return campaignsApi.getCampaignActivityLogs(campaignId, params)
    },

    /** Clear campaign caches (e.g. on logout). */
    resetCampaignCache: () => {
      campaignsInflight = null
      campaignInflight.clear()
      campaignPageInflight.clear()
      set({
        campaigns: [],
        campaignsLoading: false,
        campaignsFetched: false,
        campaign: null,
        campaignPage: null,
        campaignLoadingId: null,
        campaignPageLoadingKey: null,
        campaignRevision: 0,
      })
    },
  }
}
