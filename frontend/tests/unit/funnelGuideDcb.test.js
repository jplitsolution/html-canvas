import { describe, it, expect } from 'vitest'
import { getFunnelPageGuide, validateFunnelPage } from '../../src/editor/utils/funnelGuide'

describe('getFunnelPageGuide', () => {
  it('labels Universe DCB OTP as a billing PIN page', () => {
    const guide = getFunnelPageGuide('OTP', 'UNIVERSE_DCB')
    expect(guide.title).toBe('Number, then PIN (same canvas)')
    expect(guide.required.find((item) => item.id === 'verify-otp').label).toBe('Confirm PIN button')
  })

  it('keeps classic OTP copy for other modes', () => {
    const guide = getFunnelPageGuide('OTP', 'BOTH')
    expect(guide.title).toBe('OTP verification page')
  })

  it('accepts DCB attributes as valid OTP parts', () => {
    const editor = {
      getHtml: () => `
        <input data-dcb-field="phone" />
        <button data-dcb-action="manual-check">Check</button>
        <input data-dcb-field="pin" />
        <button data-dcb-action="confirm-pin">Confirm</button>
        <div data-dcb-slot="error"></div>
        <div data-dcb-slot="status"></div>
      `,
    }
    const result = validateFunnelPage(editor, 'OTP', 'UNIVERSE_DCB')
    expect(result.ok).toBe(true)
  })
})
