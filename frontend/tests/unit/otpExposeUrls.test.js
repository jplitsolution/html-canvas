import { describe, it, expect } from 'vitest'
import {
  buildOtpExposeApiGuide,
  buildOtpExposeUrls,
  clampPayoutPercent,
} from '../../src/services/api/otp.js'

describe('clampPayoutPercent', () => {
  it('defaults invalid to 100 and clamps 0–100', () => {
    expect(clampPayoutPercent(undefined)).toBe(100)
    expect(clampPayoutPercent('nope')).toBe(100)
    expect(clampPayoutPercent(-2)).toBe(0)
    expect(clampPayoutPercent(70.4)).toBe(70)
    expect(clampPayoutPercent(150)).toBe(100)
  })
})

describe('buildOtpExposeUrls', () => {
  it('puts campaign and vendor id in the path', () => {
    const urls = buildOtpExposeUrls('https://app.example', 9, 42)
    expect(urls.base).toBe('https://app.example/api/otp/9/42')
    expect(urls.sendUrl).toBe('https://app.example/api/otp/9/42/send?msisdn=')
    expect(urls.verifyUrl).toBe('https://app.example/api/otp/9/42/verify?msisdn=&otp=')
  })
})

describe('buildOtpExposeApiGuide', () => {
  it('downloads only API URLs with request and response payloads', () => {
    const raw = buildOtpExposeApiGuide({
      origin: 'https://app.example',
      campaign: { id: 16, name: 'Wellness' },
      vendor: { id: 6, name: 'Track My Ads', code: 'tma' },
      vendorId: 6,
      payoutPercent: 80,
    })
    const data = JSON.parse(raw)
    expect(data.comment).toMatch(/send → verify/)
    expect(data.apis).toHaveLength(2)
    expect(data.apis[0].comment).toMatch(/send OTP/)
    expect(data.apis[1].comment).toMatch(/verify/)
    expect(data.apis[0].url).toBe('https://app.example/api/otp/16/6/send')
    expect(data.apis[1].url).toBe('https://app.example/api/otp/16/6/verify')
    for (const api of data.apis) {
      expect(api.request).toBeTruthy()
      expect(api.response).toBeTruthy()
    }
    expect(raw).not.toContain('Payout')
    expect(raw).not.toContain('Track My Ads')
    expect(raw).not.toContain('Vendor conv %')
  })
})
