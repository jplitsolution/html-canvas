import { describe, it, expect } from 'vitest'
import { hasMixedConversionTriggers } from './funnelGuide.js'

describe('hasMixedConversionTriggers', () => {
  it('is false when three pack buttons share the same conversion kind', () => {
    const html = `
      <button data-pack="daily" data-action="CONFIRM"></button>
      <button data-pack="weekly" data-action="CONFIRM"></button>
      <button data-pack="monthly" data-action="CONFIRM"></button>
    `
    expect(hasMixedConversionTriggers({ html, postbackRegisterAt: 'confirm' })).toBe(
      false,
    )
  })

  it('is true when pack CTAs exist and OTP also queues postback', () => {
    const html = '<button data-pack="daily" data-action="CONFIRM"></button>'
    expect(hasMixedConversionTriggers({ html, postbackRegisterAt: 'both' })).toBe(
      true,
    )
    expect(hasMixedConversionTriggers({ html, postbackRegisterAt: 'otp' })).toBe(
      true,
    )
  })

  it('is false without pack buttons', () => {
    expect(
      hasMixedConversionTriggers({
        html: '<button data-action="SUBSCRIBE"></button>',
        postbackRegisterAt: 'otp',
      }),
    ).toBe(false)
  })
})
