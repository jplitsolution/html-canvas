import { describe, expect, it } from 'vitest'
import { DEFAULT_DCB_CONFIG, parseDcbConfig, serializeDcbConfig } from '../../src/components/dashboard/dcbConfig'

describe('Universe DCB campaign config', () => {
  it('provides the approved provider and polling defaults', () => {
    expect(parseDcbConfig(null)).toMatchObject({
      baseUrl: 'https://bilunipal.tickhighs.com',
      merchantId: '169',
      serviceId: '581',
      operatorCode: 'WM',
      pollIntervalMs: 2000,
      pollTimeoutMs: 60000,
      responsePaths: {
        items: 'data.items',
        status: 'status',
        entitlementActive: 'entitlementActive',
        current: 'current',
      },
    })
  })

  it('round-trips mappings and configurable response paths', () => {
    const serialized = serializeDcbConfig({
      ...DEFAULT_DCB_CONFIG,
      baseUrl: 'https://bilunipal.tickhighs.com/',
      purchaseTypeMappings: [
        { packKey: 'daily', label: 'Daily pass', purchaseTypeId: '44' },
        { packKey: 'empty', label: 'Ignored', purchaseTypeId: '' },
      ],
      responsePaths: {
        ...DEFAULT_DCB_CONFIG.responsePaths,
        items: 'payload.subscriptions',
      },
    })
    const parsed = JSON.parse(serialized)

    expect(parsed.baseUrl).toBe('https://bilunipal.tickhighs.com')
    expect(parsed.purchaseTypeMappings).toEqual([{ packKey: 'daily', label: 'Daily pass', purchaseTypeId: '44' }])
    expect(parsed.responsePaths.items).toBe('payload.subscriptions')
  })

  it('accepts an object purchase-type map from older payloads', () => {
    expect(
      parseDcbConfig({
        purchaseTypeMap: { daily: 7, weekly: { id: 8, label: 'Seven days' } },
      }).purchaseTypeMappings
    ).toEqual([
      { packKey: 'daily', label: 'daily', purchaseTypeId: '7' },
      { packKey: 'weekly', label: 'Seven days', purchaseTypeId: '8' },
    ])
  })
})
