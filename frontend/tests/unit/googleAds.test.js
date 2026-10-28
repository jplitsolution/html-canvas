import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GOOGLE_ADS_ID,
  GOOGLE_ADS_PURCHASE_SEND_TO,
  resetTrackedConversions,
  trackGoogleAdsConversion,
} from '../../src/utils/googleAds'

describe('Google Ads conversion tracking', () => {
  beforeEach(() => {
    resetTrackedConversions()
    if (typeof window !== 'undefined') {
      window.sessionStorage?.clear()
      delete window.gtag
      delete window.dataLayer
    }
  })

  it('exports valid Google Ads account and conversion send_to IDs', () => {
    expect(GOOGLE_ADS_ID).toBe('AW-18398284654')
    expect(GOOGLE_ADS_PURCHASE_SEND_TO).toBe('AW-18398284654/AYcUCM31k-QcEO6W_sRE')
  })

  it('calls window.gtag when defined', () => {
    const gtagMock = vi.fn()
    window.gtag = gtagMock

    const success = trackGoogleAdsConversion({
      transactionId: 'visit-12345',
      value: 49,
      currency: 'INR',
    })

    expect(success).toBe(true)
    expect(gtagMock).toHaveBeenCalledTimes(1)
    expect(gtagMock).toHaveBeenCalledWith('event', 'conversion', {
      send_to: GOOGLE_ADS_PURCHASE_SEND_TO,
      value: 49,
      currency: 'INR',
      transaction_id: 'visit-12345',
    })
  })

  it('falls back to window.dataLayer when window.gtag is not defined', () => {
    window.dataLayer = []

    const success = trackGoogleAdsConversion({
      transactionId: 'visit-999',
      value: 1.0,
      currency: 'INR',
    })

    expect(success).toBe(true)
    expect(window.dataLayer.length).toBe(1)
    expect(window.dataLayer[0]).toEqual([
      'event',
      'conversion',
      {
        send_to: GOOGLE_ADS_PURCHASE_SEND_TO,
        value: 1.0,
        currency: 'INR',
        transaction_id: 'visit-999',
      },
    ])
  })

  it('suppresses tracking when isPreview is true', () => {
    const gtagMock = vi.fn()
    window.gtag = gtagMock

    const success = trackGoogleAdsConversion({
      transactionId: 'test-preview',
      isPreview: true,
    })

    expect(success).toBe(false)
    expect(gtagMock).not.toHaveBeenCalled()
  })

  it('deduplicates repeat conversion fires for the same transactionId', () => {
    const gtagMock = vi.fn()
    window.gtag = gtagMock

    const firstRun = trackGoogleAdsConversion({
      transactionId: 'visit-duplicate-test',
      value: 10,
    })
    const secondRun = trackGoogleAdsConversion({
      transactionId: 'visit-duplicate-test',
      value: 10,
    })

    expect(firstRun).toBe(true)
    expect(secondRun).toBe(false)
    expect(gtagMock).toHaveBeenCalledTimes(1)
  })

  it('allows subsequent calls with different transaction IDs', () => {
    const gtagMock = vi.fn()
    window.gtag = gtagMock

    trackGoogleAdsConversion({ transactionId: 'visit-A' })
    trackGoogleAdsConversion({ transactionId: 'visit-B' })

    expect(gtagMock).toHaveBeenCalledTimes(2)
  })
})
