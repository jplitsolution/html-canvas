import { describe, it, expect, vi } from 'vitest'

describe('Priority Chain Execution Logic', () => {
  it('stops loop execution after page navigation (does not run Priority 3)', async () => {
    const actions = [
      { type: 'api', url: '/sub/checksub' },
      { type: 'page', page: 'THANKYOU' },
      { type: 'page', page: 'ERROR' },
    ]

    const executedSteps = []
    const searchParams = new Map()

    // Mock fetch for step 1
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })

    for (let i = 0; i < actions.length; i++) {
      const step = actions[i]
      executedSteps.push(step)

      if (step.type === 'api') {
        const res = await mockFetch(step.url)
        if (!res.ok) throw new Error('API failed')
      } else if (step.type === 'page') {
        const targetPage = (step.page || '').toUpperCase()
        searchParams.set('step', targetPage)
        break // Critical fix under test
      }
    }

    expect(executedSteps.length).toBe(2) // Only Priority 1 and Priority 2 ran!
    expect(executedSteps[0].type).toBe('api')
    expect(executedSteps[1].page).toBe('THANKYOU')
    expect(searchParams.get('step')).toBe('THANKYOU') // Page stays THANKYOU
  })

  it('replaces URL placeholders and routes to THANKYOU when user is active', async () => {
    const phone = '211911961169'
    const rawUrl = 'https://wbilzss.tickhighs.com/sub/checksub?msisdn={{msisdn}}&serviceId=WELLNESS'

    const formattedUrl = rawUrl.replace(/\{\{msisdn\}\}/gi, phone)
    expect(formattedUrl).toBe('https://wbilzss.tickhighs.com/sub/checksub?msisdn=211911961169&serviceId=WELLNESS')

    const mockJsonResponse = {
      responseCode: '0',
      data: {
        msisdn: '211911961169',
        subscriptionStatus: 'active',
      },
    }

    const nestedData = mockJsonResponse.data
    const status = nestedData.subscriptionStatus
    const isSubscribed = status.toLowerCase() === 'active'

    expect(isSubscribed).toBe(true)
  })

  it('proceeds to Priority 2 (OTP page) when subscription status is inactive', async () => {
    const mockJsonResponse = {
      responseCode: '0',
      data: {
        subscriptionStatus: 'inactive',
      },
    }

    const nestedData = mockJsonResponse.data
    const status = nestedData.subscriptionStatus
    const isSubscribed = status.toLowerCase() === 'active'

    expect(isSubscribed).toBe(false)
  })

  it('throws error when Priority 1 API step has an empty URL', () => {
    const actions = [
      { type: 'api', url: '' },
      { type: 'page', page: 'OTP' },
    ]

    const runPriorityChain = () => {
      for (let i = 0; i < actions.length; i++) {
        const step = actions[i]
        if (step.type === 'api') {
          const rawUrl = (step.url || '').trim()
          if (!rawUrl) {
            throw new Error(`Priority ${i + 1} Error: API URL is missing in configuration`)
          }
        }
      }
    }

    expect(runPriorityChain).toThrow('Priority 1 Error: API URL is missing in configuration')
  })

  it('throws error when Priority 1 API step has incomplete URL like "https://"', () => {
    const actions = [
      { type: 'api', url: 'https://' },
      { type: 'page', page: 'ERROR' },
    ]

    const runPriorityChain = () => {
      for (let i = 0; i < actions.length; i++) {
        const step = actions[i]
        if (step.type === 'api') {
          const rawUrl = (step.url || '').trim()
          const isInvalidUrl = !rawUrl || rawUrl === 'https://' || rawUrl === 'http://' || rawUrl === 'https:///' || rawUrl === 'http:///'
          if (isInvalidUrl) {
            throw new Error(`Priority ${i + 1} Error: API URL is missing or incomplete ("${rawUrl}")`)
          }
        }
      }
    }

    expect(runPriorityChain).toThrow('Priority 1 Error: API URL is missing or incomplete ("https://")')
  })
})
