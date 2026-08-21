import { describe, expect, it } from 'vitest'
import { buildDcbExposeApiGuide, buildDcbExposeUrls } from '../../src/services/api/dcbExpose.js'

describe('buildDcbExposeUrls', () => {
  it('builds vendor-scoped pincode/confirm/status URLs', () => {
    expect(buildDcbExposeUrls('https://app.example', 12, 34)).toEqual({
      base: 'https://app.example/api/flow/dcb/12/34',
      pincodeUrl: 'https://app.example/api/flow/dcb/12/34/pincode',
      confirmUrl: 'https://app.example/api/flow/dcb/12/34/confirm',
      statusUrl: 'https://app.example/api/flow/dcb/12/34/status?msisdn=',
    })
  })
})

describe('buildDcbExposeApiGuide', () => {
  it('downloads only API URLs with request and response payloads', () => {
    const raw = buildDcbExposeApiGuide({
      origin: 'https://app.example',
      campaign: { id: 9, name: 'Demo DCB' },
      vendor: { id: 3, name: 'Acme' },
      payoutPercent: 70,
    })
    const data = JSON.parse(raw)
    expect(data.apis).toHaveLength(3)
    expect(data.apis.map((a) => a.method)).toEqual(['POST', 'POST', 'GET'])
    expect(data.apis[0].response.requestId).toBe('16726123')
    expect(data.apis[1].request).toEqual({
      requestId: '16726123',
      pin: '1234',
    })
    expect(data.apis[1].request).not.toHaveProperty('msisdn')
    expect(data.apis[1].response.requestId).toBe('16726123')
    for (const api of data.apis) {
      expect(api.request).toBeTruthy()
      expect(api.response).toBeTruthy()
    }
    expect(raw).not.toContain('Payout')
    expect(raw).not.toContain('Acme')
    expect(raw).not.toContain('Demo DCB')
  })
})
