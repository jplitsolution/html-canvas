import { describe, it, expect } from 'vitest'
import {
  defaultSubServiceId,
  previewSubscribeUrl,
  sanitizeSubscribeParam,
} from './subscribeUrlPreview.js'

describe('previewSubscribeUrl', () => {
  const template =
    'https://op.example/sub?msisdn={{msisdn}}&pack={{pack}}&sid={{subServiceId}}&svc={{serviceId}}'

  it('fills pack defaults without a full URL', () => {
    expect(
      previewSubscribeUrl(template, { pack: 'weekly', serviceId: 'SVC1' }),
    ).toBe(
      'https://op.example/sub?msisdn={{msisdn}}&pack=weekly&sid=HWeekly&svc=SVC1',
    )
  })

  it('uses a custom sub-service id', () => {
    expect(
      previewSubscribeUrl(template, {
        pack: 'weekly',
        serviceId: 'SVC1',
        subServiceId: 'HWeekly2',
      }),
    ).toBe(
      'https://op.example/sub?msisdn={{msisdn}}&pack=weekly&sid=HWeekly2&svc=SVC1',
    )
  })

  it('rejects a pasted URL as a param', () => {
    expect(sanitizeSubscribeParam('https://docs.google.com/x')).toBe('')
    expect(sanitizeSubscribeParam('{{serviceId}}')).toBe('')
    expect(defaultSubServiceId('monthly')).toBe('HMonthly')
  })
})
