import { describe, expect, it } from 'vitest'
import { DEFAULT_DCB_CONFIG, editorPackOptions, parseDcbConfig, previewConfirmPayload, previewPincodePayload, serializeDcbConfig } from '../../src/components/dashboard/dcbConfig'

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
        serviceId: 'providerServiceId',
      },
    })
    expect(parseDcbConfig(null).purchaseTypeMappings).toEqual([
      { packKey: 'daily', label: 'Daily', purchaseTypeId: '2' },
      { packKey: 'weekly', label: 'Weekly', purchaseTypeId: '3' },
      { packKey: 'monthly', label: 'Monthly', purchaseTypeId: '4' },
      { packKey: 'yearly', label: 'Yearly', purchaseTypeId: '10' },
      {
        packKey: 'monthly-with-ads',
        label: 'Monthly with Ads',
        purchaseTypeId: '11',
      },
      {
        packKey: 'three-months',
        label: 'Three Months',
        purchaseTypeId: '12',
      },
    ])
  })

  it('round-trips mappings and configurable response paths', () => {
    const serialized = serializeDcbConfig({
      ...DEFAULT_DCB_CONFIG,
      baseUrl: 'https://bilunipal.tickhighs.com/',
      purchaseTypeMappings: [
        { packKey: 'daily', label: 'Daily pass', purchaseTypeId: '44' },
        { packKey: 'empty', label: 'Ignored', purchaseTypeId: '' },
      ],
      endpoints: {
        ...DEFAULT_DCB_CONFIG.endpoints,
        pincode: '/custom/pin',
        confirm: 'https://partner.example/confirm',
      },
      request: {
        ...DEFAULT_DCB_CONFIG.request,
        pinField: 'otp',
        requestIdField: 'txnId',
      },
      responsePaths: {
        ...DEFAULT_DCB_CONFIG.responsePaths,
        items: 'payload.subscriptions',
      },
    })
    const parsed = JSON.parse(serialized)

    expect(parsed.baseUrl).toBe('https://bilunipal.tickhighs.com')
    expect(parsed.purchaseTypeMappings).toEqual([{ packKey: 'daily', label: 'Daily pass', purchaseTypeId: '44' }])
    expect(parsed.endpoints.pincode).toBe('/custom/pin')
    expect(parsed.endpoints.confirm).toBe('https://partner.example/confirm')
    expect(parsed.request.pinField).toBe('otp')
    expect(parsed.request.requestIdField).toBe('txnId')
    expect(parsed.responsePaths.items).toBe('payload.subscriptions')
  })

  it('fills PIN and confirm endpoint defaults for older saved configs', () => {
    const parsed = parseDcbConfig({
      baseUrl: 'https://bilunipal.tickhighs.com',
      merchantId: '169',
    })
    expect(parsed.endpoints).toEqual({
      publicConfig: '/api/dcb/config/public',
      subscriptions: '/api/dcb/subscriptions',
      pincode: '/api/dcb/pincode',
      confirm: '/api/dcb/confirm',
    })
    expect(parsed.request.pinField).toBe('pinCode')
    expect(parsed.request.merchantIdField).toBe('merchantId')
    expect(parsed.responsePaths.requestId).toBe('data.PinInfo.ID')
  })

  it('previews PIN and confirm bodies using the configured field names', () => {
    expect(previewPincodePayload(null)).toMatchObject({
      merchantId: 169,
      serviceId: 581,
      purchaseTypeId: 3,
      msisdn: '566891023',
      transactionChannel: 'Wifi',
      operator: 'WM',
      subscription: '',
    })
    expect(previewConfirmPayload(null)).toMatchObject({
      id: 'REQUEST-ID-FROM-PIN-RESPONSE',
      pinCode: '1234',
      msisdn: '566891023',
      serviceId: 581,
      purchaseTypeId: 3,
    })
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

  it('builds editor pack options from DCB mappings', () => {
    expect(
      editorPackOptions(
        {
          purchaseTypeMappings: [
            { packKey: 'yearly', label: 'Yearly', purchaseTypeId: '10' },
            { packKey: 'three-months', label: 'Three Months', purchaseTypeId: '12' },
          ],
        },
        { universeDcb: true }
      )
    ).toEqual([
      { packKey: 'yearly', label: 'Yearly', purchaseTypeId: '10' },
      { packKey: 'three-months', label: 'Three Months', purchaseTypeId: '12' },
    ])
  })

  it('keeps classic Daily/Weekly/Monthly when DCB is not configured', () => {
    expect(editorPackOptions(null)).toEqual([
      { packKey: 'daily', label: 'Daily', purchaseTypeId: '' },
      { packKey: 'weekly', label: 'Weekly', purchaseTypeId: '' },
      { packKey: 'monthly', label: 'Monthly', purchaseTypeId: '' },
    ])
  })
})
