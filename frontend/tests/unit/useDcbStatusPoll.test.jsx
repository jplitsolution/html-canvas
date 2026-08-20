import React from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/services/api/dcb', () => ({
  fetchDcbStatus: vi.fn(),
}))

import { fetchDcbStatus } from '../../src/services/api/dcb'
import { useDcbStatusPoll } from '../../src/pages/subscription/useDcbStatusPoll'

function PollHarness({ loadPage, cachePage }) {
  useDcbStatusPoll({
    pageData: {
      pageType: 'INPROGRESS',
      verificationMode: 'UNIVERSE_DCB',
      flowContext: {
        stage: 'POLLING',
        pollIntervalMs: 2000,
        pollTimeoutMs: 60000,
      },
    },
    country: 'Iraq',
    operator: 'Zain',
    trackingCampid: 'IQ-ZAIN-1',
    visitIdRef: { current: 71 },
    phoneRef: { current: '9647701234567' },
    cachePage,
    loadPage,
  })
  return null
}

describe('useDcbStatusPoll', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps PENDING in progress and routes ENTITLED to thank you on the next 2s poll', async () => {
    fetchDcbStatus.mockResolvedValueOnce({ outcome: 'PENDING' }).mockResolvedValueOnce({ outcome: 'ENTITLED' })
    const loadPage = vi.fn().mockResolvedValue(undefined)
    const view = render(React.createElement(PollHarness, { loadPage, cachePage: vi.fn() }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(fetchDcbStatus).toHaveBeenCalledTimes(1)
    expect(loadPage).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(loadPage).toHaveBeenCalledWith('THANKYOU', { direct: true })

    view.unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchDcbStatus).toHaveBeenCalledTimes(2)
  })
})
