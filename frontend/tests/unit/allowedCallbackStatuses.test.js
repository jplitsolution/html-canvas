import { describe, expect, it } from 'vitest'
import {
  effectiveCallbackStatuses,
  fallbackCallbackStatusesHint,
  parseCallbackStatuses,
  serializeCallbackStatuses,
  vendorFireSkipCopy,
} from '../../src/components/partners/AllowedCallbackStatusesField.jsx'

describe('parseCallbackStatuses', () => {
  it('splits, lowercases, and de-dupes', () => {
    expect(parseCallbackStatuses('Active, grace, ACTIVE, billing_ok')).toEqual([
      'active',
      'grace',
      'billing_ok',
    ])
  })

  it('returns empty for blank', () => {
    expect(parseCallbackStatuses('')).toEqual([])
    expect(parseCallbackStatuses(null)).toEqual([])
  })
})

describe('serializeCallbackStatuses', () => {
  it('joins unique statuses', () => {
    expect(serializeCallbackStatuses(['grace', 'Active', 'grace'])).toBe('grace, active')
  })
})

describe('status fallbacks', () => {
  it('prefers this campaign assignment, then vendor default, then global', () => {
    expect(
      effectiveCallbackStatuses('parking', { allowedCallbackStatuses: 'grace' }),
    ).toBe('parking')
    expect(effectiveCallbackStatuses('', { allowedCallbackStatuses: 'grace' })).toBe(
      'grace',
    )
    expect(effectiveCallbackStatuses('', {})).toBe(
      'active, success, ok, subscribed, 1, true',
    )
  })

  it('explains skip with allowed vs received', () => {
    expect(vendorFireSkipCopy('okefgvdsfv', 'active, success, ok')).toBe(
      'Vendor postback not sent because received status "okefgvdsfv" is not in allowed statuses [active, success, ok].',
    )
  })
})
