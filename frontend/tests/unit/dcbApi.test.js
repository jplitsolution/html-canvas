import { describe, expect, it } from 'vitest'
import { stripProviderRequestIds } from '../../src/services/api/dcb'

describe('DCB API response safety', () => {
  it('removes provider request IDs before runtime state can persist them', () => {
    expect(
      stripProviderRequestIds({
        outcome: 'PENDING',
        requestId: 'provider-1',
        nested: {
          providerRequestId: 'provider-2',
          safe: true,
        },
      })
    ).toEqual({
      outcome: 'PENDING',
      nested: { safe: true },
    })
  })
})
