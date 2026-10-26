import { describe, expect, it } from 'vitest'
import {
  buildDcbExposeApiGuide,
  buildDcbExposeMarkdownGuide,
  buildDcbExposeUrls,
} from '../../src/services/api/dcbExpose.js'

describe('buildDcbExposeUrls', () => {
  it('builds vendor-scoped pincode/confirm/status URLs', () => {
    expect(buildDcbExposeUrls('https://app.example', 12, 34)).toEqual({
      base: 'https://app.example/api/flow/dcb/12/34',
      configUrl: 'https://app.example/api/flow/dcb/12/34/config',
      pincodeUrl: 'https://app.example/api/flow/dcb/12/34/pincode',
      confirmUrl: 'https://app.example/api/flow/dcb/12/34/confirm',
      statusUrl: 'https://app.example/api/flow/dcb/12/34/status?msisdn=',
      screenUrl: 'https://app.example/api/flow/dcb/12/34/screen',
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
    expect(data.comment).toMatch(/config → pincode → confirm → status/)
    expect(data.apis).toHaveLength(4)
    expect(data.apis.map((a) => a.method)).toEqual(['GET', 'POST', 'POST', 'GET'])
    expect(data.apis[0].comment).toMatch(/allowed packs/)
    expect(data.apis[0].response.purchaseTypes[1]).toEqual({
      packKey: 'weekly',
      label: 'Weekly',
      purchaseTypeId: '3',
      code: 'RenewalWeekly',
    })
    expect(data.apis[1].comment).toMatch(/billing PIN/)
    expect(data.apis[2].comment).toMatch(/requestId \+ pin/)
    expect(data.apis[3].comment).toMatch(/ENTITLED/)
    expect(data.apis[1].response.requestId).toBe('16726123')
    expect(data.apis[2].request).toEqual({
      requestId: '16726123',
      pin: '1234',
    })
    expect(data.apis[2].request).not.toHaveProperty('msisdn')
    expect(data.apis[2].response.requestId).toBe('16726123')
    for (const api of data.apis) {
      expect(api.request).toBeTruthy()
      expect(api.response).toBeTruthy()
    }
    expect(raw).not.toContain('Payout')
    expect(raw).not.toContain('Acme')
    expect(raw).not.toContain('Demo DCB')
  })

  it('builds Swagger-like markdown specification with request and response schemas', () => {
    const md = buildDcbExposeMarkdownGuide({
      origin: 'https://app.example',
      campaign: { id: 33, name: 'Wellness 360' },
      vendor: { id: 2, name: 'Mobite', code: 'mobite' },
      vendorId: 2,
    })
    expect(md).toContain('# Vendor DCB API Specification')
    expect(md).toContain('https://app.example/api/flow/dcb/33/2/config')
    expect(md).toContain('https://app.example/api/flow/dcb/33/2/pincode')
    expect(md).toContain('https://app.example/api/flow/dcb/33/2/confirm')
    expect(md).toContain('https://app.example/api/flow/dcb/33/2/status?msisdn=')
    expect(md).toContain('200 OK')
    expect(md).toContain('400 Bad Request')
    expect(md).toContain('403 Forbidden')
    expect(md).toContain('404 Not Found')
    expect(md).toContain('429 Too Many Requests')
    expect(md).toContain('500 Internal Server Error')
    expect(md).toContain('502 Bad Gateway')
    expect(md).toContain('503 Service Unavailable')
    expect(md).toContain('Standard HTTP Status Codes & Error Handling Reference')
    expect(md).toContain('Content-Type: application/json')
    expect(md).toContain('ENTITLED')
    expect(md).toContain('16726123')
  })
})
