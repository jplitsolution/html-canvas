import { describe, expect, it } from 'vitest'
import { resolveCampaignDetailFlow } from '../../src/pages/campaignDetail/flows/index.js'
import { PIN_COLUMNS, sumPinColumns } from '../../src/pages/campaignDetail/flows/shared/pinApiStats.js'

const ORIGIN = 'https://app.example'
const campaignBase = { id: 12, country: 'IN', operator: 'airtel' }

function columnKeys(flow) {
  return flow.statsColumns.map((col) => col.key)
}

function endpointShape(flow, extra = {}) {
  return flow.getVendorEndpoints({
    origin: ORIGIN,
    campaign: campaignBase,
    vendorId: 34,
    displayUrl: 'https://app.example/subscription?vid=acme',
    ...extra,
  }).map((row) => ({ method: row.method, label: row.label, url: row.url }))
}

describe('resolveCampaignDetailFlow', () => {
  it('HEADER_INJECTION, BOTH, OTP WAP, DCB WAP share click/conv columns and a track URL', () => {
    const modes = [
      { verificationMode: 'HEADER_INJECTION' },
      { verificationMode: 'BOTH' },
      { verificationMode: 'OTP_ONLY', flowConfig: { entryPage: 'OTP' } },
      { verificationMode: 'UNIVERSE_DCB', flowConfig: { entryPage: 'OTP' } },
    ]
    for (const campaign of modes) {
      const flow = resolveCampaignDetailFlow({ ...campaignBase, ...campaign })
      expect(columnKeys(flow)).toEqual(['totalClicks', 'convPercent', 'pubConvPercent'])
      expect(flow.pinFooter).toBeFalsy()
      expect(flow.assignmentActions.openTracking).toBe(true)
      expect(flow.assignmentActions.downloadApiGuide).toBeFalsy()
      expect(endpointShape(flow)).toEqual([
        {
          method: 'GET',
          label: 'Track',
          url: 'https://app.example/subscription?vid=acme',
        },
      ])
    }
  })

  it('OTP_ONLY API expose uses PIN columns and send/verify URLs', () => {
    const flow = resolveCampaignDetailFlow({
      ...campaignBase,
      verificationMode: 'OTP_ONLY',
      flowConfig: { entryPage: 'API_EXPOSE' },
    })
    expect(flow.variant).toBe('api_expose')
    expect(flow.pinFooter).toBe(true)
    expect(columnKeys(flow)).toEqual([
      'cut',
      ...PIN_COLUMNS.map((c) => c.key),
      'advCrPercent',
      'pubCrPercent',
    ])
    expect(flow.assignmentActions).toMatchObject({
      downloadApiGuide: 'otp',
      openTracking: false,
      downloadHtmlScreen: false,
      openHtmlScreen: false,
    })
    expect(endpointShape(flow)).toEqual([
      {
        method: 'POST',
        label: 'Send',
        url: 'https://app.example/api/otp/12/34/send?msisdn=',
      },
      {
        method: 'POST',
        label: 'Verify',
        url: 'https://app.example/api/otp/12/34/verify?msisdn=&otp=',
      },
    ])
  })

  it('UNIVERSE_DCB API expose uses PIN columns and DCB billing URLs', () => {
    const flow = resolveCampaignDetailFlow({
      ...campaignBase,
      verificationMode: 'UNIVERSE_DCB',
      flowConfig: { entryPage: 'API_EXPOSE' },
    })
    expect(flow.variant).toBe('api_expose')
    expect(flow.pinFooter).toBe(true)
    expect(columnKeys(flow)).toEqual([
      'cut',
      ...PIN_COLUMNS.map((c) => c.key),
      'advCrPercent',
      'pubCrPercent',
    ])
    expect(flow.assignmentActions).toMatchObject({
      downloadApiGuide: 'dcb',
      downloadHtmlScreen: true,
      openHtmlScreen: true,
      openTracking: false,
    })
    expect(endpointShape(flow)).toEqual([
      { method: 'GET', label: 'Config', url: 'https://app.example/api/flow/dcb/12/34/config' },
      { method: 'POST', label: 'PIN', url: 'https://app.example/api/flow/dcb/12/34/pincode' },
      { method: 'POST', label: 'Confirm', url: 'https://app.example/api/flow/dcb/12/34/confirm' },
      { method: 'GET', label: 'Status', url: 'https://app.example/api/flow/dcb/12/34/status?msisdn=' },
      { method: 'GET', label: 'Screen', url: 'https://app.example/api/flow/dcb/12/34/screen' },
    ])
  })

  it('NONE (landing CG) adds CG redirects', () => {
    const flow = resolveCampaignDetailFlow({ ...campaignBase, verificationMode: 'NONE' })
    expect(columnKeys(flow)).toEqual(['totalClicks', 'cgRedirect', 'convPercent', 'pubConvPercent'])
    expect(flow.vendorHint).toMatch(/no HOME/)
    expect(flow.assignmentActions.openTracking).toBe(true)
  })

  it('CG_HOME adds home / banner / CG columns', () => {
    const flow = resolveCampaignDetailFlow({ ...campaignBase, verificationMode: 'CG_HOME' })
    expect(columnKeys(flow)).toEqual([
      'totalClicks',
      'homeView',
      'subscribeClick',
      'cgRedirect',
      'convPercent',
      'pubConvPercent',
    ])
    expect(flow.vendorHint).toMatch(/Home shown/)
    expect(flow.assignmentActions.openTracking).toBe(true)
  })

  it('unknown mode falls back to BOTH WAP tracking', () => {
    const flow = resolveCampaignDetailFlow({ ...campaignBase, verificationMode: 'NOT_A_MODE' })
    expect(flow.id).toBe('BOTH')
    expect(columnKeys(flow)).toEqual(['totalClicks', 'convPercent', 'pubConvPercent'])
  })

  it('legacy MSISDN_ONLY maps to Header Injection', () => {
    const flow = resolveCampaignDetailFlow({ ...campaignBase, verificationMode: 'MSISDN_ONLY' })
    expect(flow.id).toBe('HEADER_INJECTION')
  })
})

describe('pinApiColumns render', () => {
  it('formats cut / pin counts / CR the same as the old table', () => {
    const flow = resolveCampaignDetailFlow({
      ...campaignBase,
      verificationMode: 'OTP_ONLY',
      flowConfig: { entryPage: 'API_EXPOSE' },
    })
    const row = {
      payoutPercent: 70,
      pinRequest: 10,
      pinSendSuccess: 8,
      uniquePinSend: 7,
      pinValRequest: 6,
      uniquePinValRequest: 5,
      pinValSuccess: 4,
      uniquePinVal: 3,
      sendConversion: 2,
      advCrPercent: 40,
      pubCrPercent: 20,
    }
    const byKey = Object.fromEntries(flow.statsColumns.map((c) => [c.key, c]))
    expect(byKey.cut.render(row)).toBe('30%')
    expect(byKey.pinRequest.render(row)).toBe(10)
    expect(byKey.advCrPercent.render(row)).toBe('40.0%')
    expect(byKey.pubCrPercent.render(row)).toBe('20.0%')

    const totals = sumPinColumns([row, { ...row, pinRequest: 10, pinValSuccess: 6, sendConversion: 3 }])
    expect(byKey.cut.footer(totals)).toBe('–')
    expect(byKey.pinRequest.footer(totals)).toBe(20)
    expect(totals.advCrPercent).toBe(50)
    expect(totals.pubCrPercent).toBe(25)
  })
})

