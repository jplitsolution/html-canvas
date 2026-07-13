import * as partnersApi from '../../services/api/partners'

/** In-flight promise dedupe (survives React Strict Mode double-mount). */
let vendorsInflight = null

export function createPartnersSlice(set, get) {
  return {
    vendors: [],
    vendorsLoading: false,
    vendorsFetched: false,
    vendorsRevision: 0,

    bumpVendorsRevision: () => set((s) => ({ vendorsRevision: s.vendorsRevision + 1 })),

    /**
     * List vendors. Cached after first successful load.
     * Pass `{ force: true }` only when you need a hard reload.
     */
    fetchVendors: async ({ force = false } = {}) => {
      if (!force && get().vendorsFetched) return get().vendors
      if (!force && vendorsInflight) return vendorsInflight

      const run = async () => {
        set({ vendorsLoading: true })
        try {
          const vendors = (await partnersApi.listVendors()) || []
          set({ vendors, vendorsLoading: false, vendorsFetched: true })
          return vendors
        } catch (err) {
          set({ vendorsLoading: false })
          get().addToast(err.message || 'Failed to load vendors', 'error')
          throw err
        } finally {
          vendorsInflight = null
        }
      }

      vendorsInflight = run()
      return vendorsInflight
    },

    createVendor: async (payload) => {
      try {
        const vendor = await partnersApi.createVendor(payload)
        set((s) => ({
          vendors: [{ ...vendor, affiliates: vendor.affiliates || [] }, ...s.vendors],
          vendorsFetched: true,
          vendorsRevision: s.vendorsRevision + 1,
        }))
        get().addToast('Vendor created', 'success')
        return vendor
      } catch (err) {
        get().addToast(err.message || 'Failed to create vendor', 'error')
        throw err
      }
    },

    deleteVendor: async (vendorId) => {
      try {
        await partnersApi.deleteVendor(vendorId)
        set((s) => ({
          vendors: s.vendors.filter((v) => v.id !== vendorId),
          vendorsRevision: s.vendorsRevision + 1,
        }))
        get().addToast('Vendor deleted', 'success')
      } catch (err) {
        get().addToast(err.message || 'Failed to delete vendor', 'error')
        throw err
      }
    },

    createAffiliate: async (payload) => {
      try {
        const affiliate = await partnersApi.createAffiliate(payload)
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === payload.vendorId
              ? { ...v, affiliates: [...(v.affiliates || []), affiliate] }
              : v,
          ),
          vendorsRevision: s.vendorsRevision + 1,
        }))
        get().addToast('Affiliate created', 'success')
        return affiliate
      } catch (err) {
        get().addToast(err.message || 'Failed to create affiliate', 'error')
        throw err
      }
    },

    deleteAffiliate: async (affiliateId) => {
      try {
        await partnersApi.deleteAffiliate(affiliateId)
        set((s) => ({
          vendors: s.vendors.map((v) => ({
            ...v,
            affiliates: (v.affiliates || []).filter((a) => a.id !== affiliateId),
          })),
          vendorsRevision: s.vendorsRevision + 1,
        }))
        get().addToast('Affiliate deleted', 'success')
      } catch (err) {
        get().addToast(err.message || 'Failed to delete affiliate', 'error')
        throw err
      }
    },

    resetVendorsCache: () => {
      vendorsInflight = null
      set({
        vendors: [],
        vendorsLoading: false,
        vendorsFetched: false,
        vendorsRevision: 0,
      })
    },
  }
}
