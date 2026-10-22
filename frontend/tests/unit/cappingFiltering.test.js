import { describe, it, expect } from 'vitest'
import { isApiExposeCampaign } from '../../src/components/flow/verificationModes'
import { getEligibleFallbackCampaigns, calculateVendorCoverage, CAPPING_INTERVALS } from '../../src/utils/capping'

describe('Offer Capping & Traffic Fallback Rules', () => {
  const webpageCampaign1 = {
    id: 1,
    name: 'WAP Offer 1',
    verificationMode: 'OTP_ONLY',
    flowConfig: { entryPage: 'HOME' },
    trackings: [{ vendorId: 10, active: true }, { vendorId: 20, active: true }],
  }

  const webpageCampaign2 = {
    id: 2,
    name: 'WAP Offer 2 (DCB)',
    verificationMode: 'UNIVERSE_DCB',
    flowConfig: { entryPage: 'HOME' },
    trackings: [{ vendorId: 20, active: true }, { vendorId: 30, active: true }],
  }

  const apiExposeOtpCampaign = {
    id: 3,
    name: 'API Expose OTP 1',
    verificationMode: 'OTP_ONLY',
    flowConfig: { entryPage: 'API_EXPOSE' },
    trackings: [{ vendorId: 10, active: true }, { vendorId: 20, active: true }],
  }

  const apiExposeOtpCampaign2 = {
    id: 4,
    name: 'API Expose OTP 2',
    verificationMode: 'OTP_ONLY',
    flowConfig: { entryPage: 'API_EXPOSE' },
    trackings: [{ vendorId: 20, active: true }],
  }

  const apiExposeDcbCampaign = {
    id: 5,
    name: 'API Expose DCB 1',
    verificationMode: 'UNIVERSE_DCB',
    flowConfig: { entryPage: 'API_EXPOSE' },
    trackings: [{ vendorId: 20, active: true }],
  }

  const all = [
    webpageCampaign1,
    webpageCampaign2,
    apiExposeOtpCampaign,
    apiExposeOtpCampaign2,
    apiExposeDcbCampaign,
  ]

  describe('Fallback Campaign Dropdown Filter Matrix', () => {
    it('Webpage URL campaign sees all other Webpage campaigns irrespective of flow, but NO API expose', () => {
      const eligible = getEligibleFallbackCampaigns(webpageCampaign1, all)
      expect(eligible.map((c) => c.id)).toEqual([2])
      expect(eligible.some((c) => isApiExposeCampaign(c))).toBe(false)
    })

    it('API Expose OTP campaign only sees other API Expose OTP campaigns (same flow + API expose)', () => {
      const eligible = getEligibleFallbackCampaigns(apiExposeOtpCampaign, all)
      expect(eligible.map((c) => c.id)).toEqual([4])
      expect(eligible.every((c) => isApiExposeCampaign(c) && c.verificationMode === 'OTP_ONLY')).toBe(true)
    })

    it('API Expose DCB campaign only sees other API Expose DCB campaigns', () => {
      const eligible = getEligibleFallbackCampaigns(apiExposeDcbCampaign, all)
      expect(eligible.length).toBe(0)
    })

    it('Never includes the current campaign itself in the dropdown', () => {
      const eligible = getEligibleFallbackCampaigns(webpageCampaign2, all)
      expect(eligible.some((c) => c.id === 2)).toBe(false)
      expect(eligible.map((c) => c.id)).toEqual([1])
    })
  })

  describe('Vendor Mapping & Fallback Integrity Check', () => {
    it('calculates mapped and unmapped vendor counts accurately', () => {
      // Offer 1 has vendors 10 and 20. Target Offer 2 has vendors 20 and 30.
      const coverage = calculateVendorCoverage(webpageCampaign1, webpageCampaign2)
      expect(coverage.totalAssigned).toBe(2)
      expect(coverage.mappedCount).toBe(1) // only vendor 20 is in both
      expect(coverage.unmappedCount).toBe(1) // vendor 10 is not in target
    })

    it('shows full coverage when all vendors are mapped', () => {
      const targetWithBoth = {
        id: 99,
        trackings: [{ vendorId: 10, active: true }, { vendorId: 20, active: true }],
      }
      const coverage = calculateVendorCoverage(webpageCampaign1, targetWithBoth)
      expect(coverage.totalAssigned).toBe(2)
      expect(coverage.mappedCount).toBe(2)
      expect(coverage.unmappedCount).toBe(0)
    })
  })

  describe('Capping Intervals and Reset Schedule', () => {
    it('defines daily, weekly, monthly, and lifetime intervals in IST (Asia/Kolkata)', () => {
      const ids = CAPPING_INTERVALS.map((i) => i.id)
      expect(ids).toEqual(['daily', 'weekly', 'monthly', 'total'])
      expect(CAPPING_INTERVALS.find((i) => i.id === 'daily')?.label).toContain('IST')
      expect(CAPPING_INTERVALS.find((i) => i.id === 'weekly')?.label).toContain('Monday at 00:00 IST')
      expect(CAPPING_INTERVALS.find((i) => i.id === 'monthly')?.label).toContain('1st of every month at 00:00 IST')
    })
  })
})
