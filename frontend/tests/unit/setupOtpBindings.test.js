import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/services/api/otp', () => ({
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}))

vi.mock('../../src/utils/analytics', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('../../src/services/flow/resolvePhoneNumber', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    persistPhone: vi.fn(),
  }
})

import { verifyOtp } from '../../src/services/api/otp'
import { capturePhoneFromShadow, getCountryCodeFromDom, setupOtpBindings } from '../../src/pages/subscription/setupOtpBindings'

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
    const loadPage = vi.fn()
    const setTransitioning = vi.fn()
    const transitionLockRef = { current: false }

    setupOtpBindings(shadow, {
      transitionFlow,
      cachePage,
      loadPage,
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
    expect(loadPage).not.toHaveBeenCalled()
  })

  it('loads HOME directly if continue still returns the OTP page', async () => {
    const shadow = mountOtpDom()
    verifyOtp.mockResolvedValueOnce({ success: true })
    const transitionFlow = vi.fn().mockResolvedValueOnce({
      pageType: 'OTP',
      html: '<div>otp</div>',
    })
    const cachePage = vi.fn()
    const loadPage = vi.fn().mockResolvedValueOnce(undefined)

    setupOtpBindings(shadow, {
      transitionFlow,
      cachePage,
      loadPage,
      country: 'Saudi Arabia',
      operator: 'STC',
      campid: '',
      trackingCampid: 'SA-STC-13',
      visitIdRef: { current: 1868 },
      phoneRef: { current: '979789689' },
      packRef: { current: 'daily' },
      setPhone: vi.fn(),
      setTransitioning: vi.fn(),
      setError: vi.fn(),
      pageCacheRef: { current: new Map() },
      transitionLockRef: { current: false },
    })

    shadow.querySelector('[data-action="verify-otp"]').click()
    await vi.waitFor(() => {
      expect(loadPage).toHaveBeenCalledWith('HOME', { direct: true })
    })
  })

  it('reads +226 from .bf-country-prefix and builds a full MSISDN', () => {
    document.body.innerHTML = `
      <div id="host">
        <div class="bf-country-prefix">+226</div>
        <input data-otp-field="phone" value="70123456" />
      </div>
    `
    const host = document.getElementById('host')
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = host.innerHTML
    host.innerHTML = ''
    const phoneInput = shadow.querySelector('[data-otp-field="phone"]')
    expect(getCountryCodeFromDom(phoneInput, shadow)).toBe('+226')
    expect(capturePhoneFromShadow(shadow, phoneInput)).toBe('22670123456')
  })

  it('uses phoneRef when phoneInput is not on the page (e.g. on CONFIRM step)', async () => {
    document.body.innerHTML = `
      <div id="host">
        <button data-otp-action="send">S'abonner</button>
        <div data-otp-slot="error"></div>
        <div data-otp-slot="status"></div>
      </div>
    `
    const host = document.getElementById('host')
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = host.innerHTML
    host.innerHTML = ''

    const { sendOtp } = await import('../../src/services/api/otp')
    sendOtp.mockResolvedValueOnce({ success: true })
    const transitionFlow = vi.fn().mockResolvedValueOnce({
      pageType: 'OTP',
      html: '<div>otp</div>',
    })

    setupOtpBindings(shadow, {
      transitionFlow,
      cachePage: vi.fn(),
      loadPage: vi.fn(),
      country: 'Burkina Faso',
      operator: 'Orange',
      campid: '',
      trackingCampid: 'BF-OBF-11',
      visitIdRef: { current: 46104 },
      phoneRef: { current: '56864685' },
      packRef: { current: 'daily' },
      setPhone: vi.fn(),
      setTransitioning: vi.fn(),
      setError: vi.fn(),
      pageCacheRef: { current: new Map() },
      transitionLockRef: { current: false },
    })

    shadow.querySelector('[data-otp-action="send"]').click()
    await vi.waitFor(() => {
      expect(sendOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '56864685',
          visitId: 46104,
        }),
      )
    })
    expect(shadow.querySelector('[data-otp-slot="error"]').textContent).toBe('')
  })

  it('runs 2-step flow: step 1 enters phone, step 2 enters OTP and verifies', async () => {
    document.body.innerHTML = `
      <div id="host">
        <div class="field-phone">
          <input data-otp-field="phone" value="962791234567" />
        </div>
        <button type="button" data-otp-action="send">Get OTP</button>
        <div class="field-otp">
          <input data-otp-field="otp" value="" />
        </div>
        <button type="button" data-otp-action="verify">Verify & Continue</button>
        <div data-otp-slot="error"></div>
        <div data-otp-slot="status"></div>
      </div>
    `
    const host = document.getElementById('host')
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = host.innerHTML
    host.innerHTML = ''

    const { sendOtp } = await import('../../src/services/api/otp')
    sendOtp.mockResolvedValueOnce({ success: true, devOtpCode: '9999' })
    verifyOtp.mockResolvedValueOnce({ success: true })

    const transitionFlow = vi.fn().mockResolvedValueOnce({
      pageType: 'HOME',
      html: '<div>home</div>',
    })

    setupOtpBindings(shadow, {
      transitionFlow,
      cachePage: vi.fn(),
      loadPage: vi.fn(),
      country: 'Jordan',
      operator: 'Zain',
      campid: '31',
      trackingCampid: 'JO-ZA-31',
      visitIdRef: { current: 1234 },
      phoneRef: { current: '962791234567' },
      packRef: { current: 'daily' },
      setPhone: vi.fn(),
      setTransitioning: vi.fn(),
      setError: vi.fn(),
      pageCacheRef: { current: new Map() },
      transitionLockRef: { current: false },
    })

    const phoneField = shadow.querySelector('.field-phone')
    const otpField = shadow.querySelector('.field-otp')
    const sendBtn = shadow.querySelector('[data-otp-action="send"]')
    const verifyBtn = shadow.querySelector('[data-otp-action="verify"]')

    // Initially Step 1: Phone visible, OTP hidden
    expect(phoneField.hidden).toBe(false)
    expect(sendBtn.hidden).toBe(false)
    expect(otpField.hidden).toBe(true)
    expect(verifyBtn.hidden).toBe(true)

    // Send OTP
    sendBtn.click()

    await vi.waitFor(() => {
      // Step 2 should now be visible, Step 1 hidden
      expect(phoneField.hidden).toBe(true)
      expect(sendBtn.hidden).toBe(true)
      expect(otpField.hidden).toBe(false)
      expect(verifyBtn.hidden).toBe(false)
    })

    // Click change phone button
    const changeBtn = shadow.querySelector('[data-otp-action="change-phone"]')
    expect(changeBtn).not.toBeNull()
    changeBtn.click()

    // Back to Step 1
    expect(phoneField.hidden).toBe(false)
    expect(sendBtn.hidden).toBe(false)
    expect(otpField.hidden).toBe(true)
    expect(verifyBtn.hidden).toBe(true)

    // Re-send OTP to go back to Step 2
    sendOtp.mockResolvedValueOnce({ success: true, devOtpCode: '9999' })
    sendBtn.click()

    await vi.waitFor(() => {
      expect(otpField.hidden).toBe(false)
      expect(verifyBtn.hidden).toBe(false)
    })

    // Fill OTP and verify
    shadow.querySelector('[data-otp-field="otp"]').value = '9999'
    verifyBtn.click()

    await vi.waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '962791234567',
          otp: '9999',
          visitId: 1234,
        }),
      )
      expect(transitionFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          fromPage: 'OTP',
          action: 'CONTINUE',
          phone: '962791234567',
        }),
      )
    })
  })

  it('displays error in step 2 error slot when verify fails with wrong pin', async () => {
    document.body.innerHTML = `
      <div id="host">
        <div data-otp-step="1" class="step-1">
          <input data-otp-field="phone" value="962791234567" />
          <div data-otp-slot="error" class="error-step1"></div>
          <button type="button" data-otp-action="send">Send</button>
        </div>
        <div data-otp-step="2" class="step-2">
          <input data-otp-field="otp" value="" />
          <div data-otp-slot="error" class="error-step2"></div>
          <button type="button" data-otp-action="verify">Verify & Continue</button>
        </div>
      </div>
    `
    const host = document.getElementById('host')
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = host.innerHTML
    host.innerHTML = ''

    const { sendOtp } = await import('../../src/services/api/otp')
    sendOtp.mockResolvedValueOnce({ success: true })
    verifyOtp.mockRejectedValueOnce(new Error('wrong pin'))

    setupOtpBindings(shadow, {
      transitionFlow: vi.fn(),
      cachePage: vi.fn(),
      loadPage: vi.fn(),
      country: 'Jordan',
      operator: 'Zain',
      campid: '36',
      trackingCampid: 'JO-ZA-36',
      visitIdRef: { current: 1234 },
      phoneRef: { current: '962791234567' },
      packRef: { current: 'daily' },
      setPhone: vi.fn(),
      setTransitioning: vi.fn(),
      setError: vi.fn(),
      pageCacheRef: { current: new Map() },
      transitionLockRef: { current: false },
    })

    const sendBtn = shadow.querySelector('[data-otp-action="send"]')
    sendBtn.click()

    await vi.waitFor(() => {
      expect(shadow.querySelector('.step-2').hidden).toBe(false)
    })

    const otpInput = shadow.querySelector('[data-otp-field="otp"]')
    otpInput.value = '12345'

    const verifyBtn = shadow.querySelector('[data-otp-action="verify"]')
    verifyBtn.click()

    await vi.waitFor(() => {
      const errorStep2 = shadow.querySelector('.error-step2')
      expect(errorStep2.textContent).toBe('wrong pin')
    })
  })

  it('prepends country code to mobile number on sendOtp and verifyOtp when configured', async () => {
    document.body.innerHTML = `
      <div id="host">
        <div data-otp-step="1" class="step-1">
          <span class="wjo-country-code" data-country-code="+91">+91</span>
          <input data-otp-field="phone" data-country-code="+91" value="9876543210" />
          <div data-otp-slot="error"></div>
          <button type="button" data-otp-action="send">Send OTP</button>
        </div>
        <div data-otp-step="2" class="step-2">
          <input data-otp-field="otp" value="1234" />
          <div data-otp-slot="error"></div>
          <button type="button" data-otp-action="verify">Verify & Continue</button>
        </div>
      </div>
    `
    const host = document.getElementById('host')
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = host.innerHTML
    host.innerHTML = ''

    const { sendOtp, verifyOtp } = await import('../../src/services/api/otp')
    sendOtp.mockResolvedValueOnce({ success: true, devOtpCode: '1234' })
    verifyOtp.mockResolvedValueOnce({ success: true })

    const transitionFlow = vi.fn().mockResolvedValueOnce({
      pageType: 'HOME',
      html: '<div>home</div>',
    })
    const phoneRef = { current: '' }
    const setPhone = vi.fn()

    setupOtpBindings(shadow, {
      transitionFlow,
      cachePage: vi.fn(),
      loadPage: vi.fn(),
      country: 'India',
      operator: 'Jio',
      campid: '1',
      trackingCampid: 'IN-JIO-1',
      visitIdRef: { current: 555 },
      phoneRef,
      packRef: { current: 'daily' },
      setPhone,
      setTransitioning: vi.fn(),
      setError: vi.fn(),
      pageCacheRef: { current: new Map() },
      transitionLockRef: { current: false },
    })

    const sendBtn = shadow.querySelector('[data-otp-action="send"]')
    sendBtn.click()

    await vi.waitFor(() => {
      // Must send full MSISDN with country code: 91 + 9876543210
      expect(sendOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '919876543210',
          visitId: 555,
        }),
      )
    })

    expect(phoneRef.current).toBe('919876543210')
    expect(setPhone).toHaveBeenCalledWith('919876543210')

    const otpInput = shadow.querySelector('[data-otp-field="otp"]')
    otpInput.value = '1234'
    const verifyBtn = shadow.querySelector('[data-otp-action="verify"]')
    verifyBtn.click()

    await vi.waitFor(() => {
      // Must verify full MSISDN with country code: 91 + 9876543210
      expect(verifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '919876543210',
          otp: '1234',
          visitId: 555,
        }),
      )
    })
  })
})


