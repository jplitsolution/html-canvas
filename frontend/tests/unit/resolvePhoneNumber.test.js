import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  normalizeMsisdn,
  resolvePhoneFromUrl,
  resolvePhoneNumber,
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
    const searchParams = new URLSearchParams('msisdn=919876543210')
    const result = await resolvePhoneNumber(searchParams)

    expect(result.phone).toBe('919876543210')
    expect(result.source).toBe('url')
    expect(detectMsisdnApi).not.toHaveBeenCalled()
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
})
