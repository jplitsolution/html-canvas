import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  normalizeMsisdn,
  resolvePhoneNumber,
  pickHeFailRedirectUrl,
  isHeRedirectUrl,
  appendHeAttributionToUrl,
} from '../../src/services/flow/resolvePhoneNumber'

vi.mock('../../src/services/api/flow', () => ({
  detectMsisdnApi: vi.fn(),
}))

import { detectMsisdnApi } from '../../src/services/api/flow'

describe('MSISDN & Operator Header Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (typeof window !== 'undefined') {
      sessionStorage.clear()
      localStorage.clear()
    }
  })

  it('normalizes raw MSISDN inputs by removing non-digits', () => {
    expect(normalizeMsisdn('+91-98765-43210')).toBe('919876543210')
    expect(normalizeMsisdn('  98765 43210 ')).toBe('9876543210')
    expect(normalizeMsisdn(null)).toBe('')
  })

  it('resolves phone from URL search parameters first', async () => {
    detectMsisdnApi.mockResolvedValueOnce({
      phone: '',
      successRedirectUrl: 'https://success.example/next',
    })
    const searchParams = new URLSearchParams('msisdn=919876543210')
    const result = await resolvePhoneNumber(searchParams)

    expect(result.phone).toBe('919876543210')
    expect(result.source).toBe('url')
    expect(result.successRedirectUrl).toBe('https://success.example/next')
    expect(detectMsisdnApi).toHaveBeenCalled()
  })

  it('resolves phone from operator header detection when URL does not contain MSISDN', async () => {
    detectMsisdnApi.mockResolvedValueOnce({
      phone: '919876543210',
      subscribed: true,
      blocked: false,
    })

    const searchParams = new URLSearchParams()
    const result = await resolvePhoneNumber(searchParams, { country: 'IN', operator: 'AIRTEL' })

    expect(result.phone).toBe('919876543210')
    expect(result.source).toBe('operator')
    expect(result.subscribed).toBe(true)
    expect(detectMsisdnApi).toHaveBeenCalledWith({ country: 'IN', operator: 'AIRTEL' })
  })

  it('returns fail/CG redirect fields when operator detect finds no MSISDN', async () => {
    detectMsisdnApi.mockResolvedValueOnce({
      phone: '',
      hasMsisdn: false,
      heError: 'Please use mobile data',
      failRedirectUrl: 'https://cg.example/fallback?click_id=abc',
      cgRedirectUrl: 'https://cg.example/raw',
    })

    const result = await resolvePhoneNumber(new URLSearchParams(), {
      country: 'KE',
      operator: 'SAFARICOM',
    })

    expect(result.phone).toBe('')
    expect(result.source).toBe('operator')
    expect(result.failRedirectUrl).toBe('https://cg.example/fallback?click_id=abc')
    expect(result.cgRedirectUrl).toBe('https://cg.example/raw')
    expect(pickHeFailRedirectUrl(result)).toBe('https://cg.example/fallback?click_id=abc')
  })

  it('pickHeFailRedirectUrl prefers failRedirectUrl then cgRedirectUrl', () => {
    expect(isHeRedirectUrl('https://x.test')).toBe(true)
    expect(isHeRedirectUrl('/relative')).toBe(false)
    expect(
      pickHeFailRedirectUrl({
        failRedirectUrl: 'https://fail.test',
        cgRedirectUrl: 'https://cg.test',
      }),
    ).toBe('https://fail.test')
    expect(
      pickHeFailRedirectUrl({
        failRedirectUrl: '',
        cgRedirectUrl: 'https://cg.test',
      }),
    ).toBe('https://cg.test')
    expect(pickHeFailRedirectUrl({})).toBe('')
  })

  it('appendHeAttributionToUrl adds click_id and msisdn for vendor postbacks', () => {
    const url = appendHeAttributionToUrl('https://dsdp-cg.safaricom.com/300002437', {
      clickId: 'our-click-1',
      rcid: 'vendor-rcid-9',
      msisdn: '254712345678',
    })
    const parsed = new URL(url)
    expect(parsed.searchParams.get('click_id')).toBe('our-click-1')
    expect(parsed.searchParams.get('rcid')).toBe('vendor-rcid-9')
    expect(parsed.searchParams.get('msisdn')).toBe('254712345678')
  })

  it('appendHeAttributionToUrl fills placeholders', () => {
    const url = appendHeAttributionToUrl(
      'https://cg.example/path?cid={{click_id}}&m={{msisdn}}',
      { clickId: 'abc', msisdn: '2547' },
    )
    expect(url).toContain('cid=abc')
    expect(url).toContain('m=2547')
  })
})
