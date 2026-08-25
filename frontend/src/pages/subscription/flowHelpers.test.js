import { describe, it, expect } from 'vitest'
import { findActionTarget, isHeSilentExitMode, isExternalHttpRedirect, shouldTreatCgAsHeFailRedirect } from './flowHelpers.js'

describe('shouldTreatCgAsHeFailRedirect', () => {
  it('keeps CG as HE-fail fallback for HE funnels', () => {
    expect(shouldTreatCgAsHeFailRedirect('HEADER_INJECTION')).toBe(true)
    expect(shouldTreatCgAsHeFailRedirect('BOTH')).toBe(true)
    expect(shouldTreatCgAsHeFailRedirect('')).toBe(true)
  })

  it('does not skip HOME for CG_HOME / NONE / OTP_ONLY', () => {
    expect(shouldTreatCgAsHeFailRedirect('CG_HOME')).toBe(false)
    expect(shouldTreatCgAsHeFailRedirect('NONE')).toBe(false)
    expect(shouldTreatCgAsHeFailRedirect('OTP_ONLY')).toBe(false)
  })
})

describe('isHeSilentExitMode', () => {
  it('does not silent-exit CG_HOME when only campaign CG URL is set', () => {
    expect(
      isHeSilentExitMode({
        phone: '',
        failRedirectUrl: '',
        cgRedirectUrl: 'https://cg.example/consent',
        verificationMode: 'CG_HOME',
      }),
    ).toBe(false)
  })

  it('silent-exits HE miss when CG URL is the fail fallback', () => {
    expect(
      isHeSilentExitMode({
        phone: '',
        failRedirectUrl: '',
        cgRedirectUrl: 'https://cg.example/consent',
        verificationMode: 'HEADER_INJECTION',
      }),
    ).toBe(true)
  })
})

describe('isExternalHttpRedirect', () => {
  it('accepts http(s) leave URLs and rejects empty or relative values', () => {
    expect(isExternalHttpRedirect('https://cg.example/consent')).toBe(true)
    expect(isExternalHttpRedirect('http://cg.example/consent')).toBe(true)
    expect(isExternalHttpRedirect('')).toBe(false)
    expect(isExternalHttpRedirect('/otp')).toBe(false)
    expect(isExternalHttpRedirect(null)).toBe(false)
  })
})

describe('findActionTarget', () => {
  it('detects image or container elements with an href attribute', () => {
    const img = document.createElement('img')
    img.setAttribute('href', 'https://example.com')
    const event = { composedPath: () => [img] }
    const hit = findActionTarget(event)
    expect(hit).not.toBeNull()
    expect(hit.node).toBe(img)
    expect(hit.action).toBeNull()
  })

  it('detects elements with explicit data-action attributes', () => {
    const div = document.createElement('div')
    div.setAttribute('data-action', 'SUBSCRIBE')
    const event = { composedPath: () => [div] }
    const hit = findActionTarget(event)
    expect(hit).not.toBeNull()
    expect(hit.node).toBe(div)
    expect(hit.action).toBe('SUBSCRIBE')
  })
})
