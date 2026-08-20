import { describe, it, expect } from 'vitest'
import {
  hrefIsNavigationTarget,
  isPackSubscribeAction,
  normalizePack,
  shouldSelectPackOnly,
} from '../../src/pages/subscription/flowHelpers.js'

describe('pack click helpers', () => {
  it('treats CONFIRM / SUBSCRIBE / SUBSCRIBE_ROUTE as subscribe CTAs', () => {
    expect(isPackSubscribeAction('SUBSCRIBE_ROUTE')).toBe(true)
    expect(isPackSubscribeAction('CONFIRM')).toBe(true)
    expect(isPackSubscribeAction('SUBSCRIBE')).toBe(true)
    expect(isPackSubscribeAction('')).toBe(false)
  })

  it('does not treat pack + website href as picker-only', () => {
    const el = document.createElement('a')
    el.setAttribute('data-pack', 'monthly')
    el.setAttribute('href', 'https://docs.google.com/document/d/abc')
    expect(hrefIsNavigationTarget(el.getAttribute('href'))).toBe(true)
    expect(shouldSelectPackOnly(el)).toBe(false)
  })

  it('treats pack options without action or URL as picker-only', () => {
    const el = document.createElement('button')
    el.setAttribute('data-pack', 'daily')
    expect(shouldSelectPackOnly(el)).toBe(true)
  })

  it('keeps DCB pack keys instead of forcing Daily/Weekly/Monthly', () => {
    expect(normalizePack('yearly')).toBe('yearly')
    expect(normalizePack('monthly-with-ads')).toBe('monthly-with-ads')
    expect(normalizePack('three-months')).toBe('three-months')
    expect(normalizePack('')).toBe('daily')
  })
})
