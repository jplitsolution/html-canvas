import { describe, it, expect } from 'vitest'
import {
  getButtonLinks, normalizeButtonContent, buildButtonClickScript,
} from '../../src/utils/buttonLinks'

describe('buttonLinks', () => {
  it('reads buttonLinks array', () => {
    expect(getButtonLinks({
      buttonLinks: [{ url: '/a' }, { url: '/b' }],
    })).toEqual([{ url: '/a' }, { url: '/b' }])
  })

  it('falls back to legacy buttonLink', () => {
    expect(getButtonLinks({ buttonLink: '#signup' })).toEqual([{ url: '#signup' }])
  })

  it('normalizes legacy content', () => {
    expect(normalizeButtonContent({ buttonText: 'Go', buttonLink: '#x' })).toEqual({
      buttonText: 'Go',
      buttonLinks: [{ url: '#x' }],
    })
  })

  it('builds multi-url click script only when needed', () => {
    expect(buildButtonClickScript(['#one'])).toBe('')
    expect(buildButtonClickScript(['#one', '#two'])).toContain('window.open')
  })
})
