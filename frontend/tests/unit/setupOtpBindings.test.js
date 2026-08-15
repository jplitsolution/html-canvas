import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/services/api/otp', () => ({
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}))

vi.mock('../../src/utils/analytics', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('../../src/services/flow/resolvePhoneNumber', () => ({
  persistPhone: vi.fn(),
}))

import { verifyOtp } from '../../src/services/api/otp'
import { setupOtpBindings } from '../../src/pages/subscription/setupOtpBindings'

function mountOtpDom() {
  document.body.innerHTML = `
    <div id="host">
      <input data-otp-field="phone" value="979789689" />
      <input data-otp-field="otp" value="123456" />
      <button data-action="verify-otp">Verify & Continue</button>
      <div data-otp-slot="error"></div>
      <div data-otp-slot="status"></div>
    </div>
  `
  const host = document.getElementById('host')
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = host.innerHTML
  host.innerHTML = ''
  return shadow
}

describe('setupOtpBindings after OTP verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('clears the transitioning overlay and caches the next page', async () => {
    const shadow = mountOtpDom()
    verifyOtp.mockResolvedValueOnce({ success: true })
    const transitionFlow = vi.fn().mockResolvedValueOnce({
      pageType: 'HOME',
      html: '<div>home</div>',
    })
    const cachePage = vi.fn()
    const setTransitioning = vi.fn()
    const transitionLockRef = { current: false }

    setupOtpBindings(shadow, {
      transitionFlow,
      cachePage,
      country: 'Saudi Arabia',
      operator: 'STC',
      campid: '',
      trackingCampid: 'SA-STC-13',
      visitIdRef: { current: 1868 },
      phoneRef: { current: '979789689' },
      packRef: { current: 'daily' },
      setPhone: vi.fn(),
      setTransitioning,
      setError: vi.fn(),
      pageCacheRef: { current: new Map() },
      transitionLockRef,
    })

    shadow.querySelector('[data-action="verify-otp"]').click()
    await vi.waitFor(() => {
      expect(cachePage).toHaveBeenCalledWith(
        expect.objectContaining({ pageType: 'HOME' }),
      )
    })

    expect(setTransitioning).toHaveBeenCalledWith(true)
    expect(setTransitioning).toHaveBeenLastCalledWith(false)
    expect(transitionLockRef.current).toBe(false)
    expect(transitionFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        fromPage: 'OTP',
        action: 'CONTINUE',
        phone: '979789689',
      }),
    )
  })
})
