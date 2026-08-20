import { describe, it, expect } from 'vitest'
import { buildDefaultFlow, resolveAfterIdentityTarget } from './verificationModes.js'

describe('buildDefaultFlow', () => {
  it('HE: HOME after resolve, no Confirm, miss → Error', () => {
    const cfg = buildDefaultFlow('HEADER_INJECTION', { afterIdentity: 'HOME' })
    expect(cfg.nodes.some((n) => n.pageType === 'CONFIRM')).toBe(false)
    expect(
      cfg.edges.some((e) => e.source === 'HOME' && e.condition === 'HEADER_UNRESOLVED' && e.target === 'ERROR')
    ).toBe(true)
    expect(resolveAfterIdentityTarget(cfg)).toBe('HOME')
  })

  it('HE: Skip HOME wires HEADER_RESOLVED → Thank you', () => {
    const cfg = buildDefaultFlow('HEADER_INJECTION', { afterIdentity: 'THANKYOU' })
    expect(
      cfg.edges.some((e) => e.source === 'HOME' && e.condition === 'HEADER_RESOLVED' && e.target === 'THANKYOU')
    ).toBe(true)
    expect(resolveAfterIdentityTarget(cfg)).toBe('THANKYOU')
  })

  it('OTP first then HOME packs, no Confirm', () => {
    const cfg = buildDefaultFlow('OTP_ONLY', {
      entryPage: 'OTP',
      afterIdentity: 'HOME',
    })
    expect(cfg.entryPage).toBe('OTP')
    expect(cfg.edges.some((e) => e.source === 'OTP' && e.condition === 'OTP_VERIFIED' && e.target === 'HOME')).toBe(
      true
    )
    expect(cfg.nodes.some((n) => n.pageType === 'CONFIRM')).toBe(false)
  })

  it('keeps Universe DCB in an isolated HE/manual and polling graph', () => {
    const cfg = buildDefaultFlow('UNIVERSE_DCB')
    expect(cfg.startConfig).toEqual({
      runHe: true,
      runBlocklist: true,
      runChecksub: true,
    })
    expect(cfg.nodes.some((node) => node.pageType === 'INPROGRESS')).toBe(true)
    expect(
      cfg.edges.some(
        (edge) => edge.source === 'HOME' && edge.condition === 'HEADER_UNRESOLVED' && edge.target === 'OTP'
      )
    ).toBe(true)
  })
})
