import { describe, it, expect } from 'vitest'
import { isHeSilentExitMode, shouldTreatCgAsHeFailRedirect } from './flowHelpers.js'

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
