import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/services/api/dcb', () => ({
  checkDcbMsisdn: vi.fn(),
  confirmDcbPincode: vi.fn(),
  getDcbConfig: vi.fn(),
  sendDcbPincode: vi.fn(),
}))

vi.mock('../../src/services/api/otp', () => ({
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}))

vi.mock('../../src/services/flow/resolvePhoneNumber', () => ({
  persistPhone: vi.fn(),
}))

import { checkDcbMsisdn, confirmDcbPincode, sendDcbPincode } from '../../src/services/api/dcb'
import { sendOtp, verifyOtp } from '../../src/services/api/otp'
import { setupDcbBindings } from '../../src/pages/subscription/setupDcbBindings'

function createShadow(html) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = html
  return shadow
}

function bindingsOptions(pageData) {
  return {
    pageData,
    cachePage: vi.fn(),
    loadPage: vi.fn().mockResolvedValue(undefined),
    country: 'Iraq',
    operator: 'Zain',
    campid: '',
    trackingCampid: 'IQ-ZAIN-1',
    visitIdRef: { current: 91 },
    phoneRef: { current: '' },
    selectedPackRef: { current: 'daily' },
    setPhone: vi.fn(),
    setTransitioning: vi.fn(),
    setError: vi.fn(),
    saveSession: vi.fn(),
    transitionLockRef: { current: false },
  }
}

describe('setupDcbBindings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('checks a manually entered MSISDN without invoking legacy OTP', async () => {
    const shadow = createShadow(`
      <input data-otp-field="phone" value="9647701234567" />
      <button data-otp-action="send">Continue</button>
      <div data-otp-slot="error"></div>
      <div data-otp-slot="status"></div>
    `)
    const options = bindingsOptions({
      pageType: 'OTP',
      verificationMode: 'UNIVERSE_DCB',
      flowContext: { stage: 'MANUAL_MSISDN', mode: 'UNIVERSE_DCB' },
    })
    checkDcbMsisdn.mockResolvedValue({ outcome: 'NEW', nextPage: 'HOME' })

    setupDcbBindings(shadow, options)
    shadow.querySelector('button').click()

    await vi.waitFor(() => {
      expect(checkDcbMsisdn).toHaveBeenCalledWith(
        expect.objectContaining({
          visitId: 91,
          phone: '9647701234567',
          msisdn: '9647701234567',
        })
      )
      expect(options.loadPage).toHaveBeenCalledWith('HOME', { direct: true })
    })
    expect(options.saveSession).toHaveBeenCalledWith(expect.objectContaining({ transactionChannel: 'Wifi' }))
  })

  it('maps a selected pack to purchaseTypeId and confirms PIN without a requestId', async () => {
    const planShadow = createShadow(`
      <button data-action="SUBSCRIBE" data-pack="daily"><span>Buy daily</span></button>
    `)
    const planOptions = bindingsOptions({
      pageType: 'HOME',
      verificationMode: 'UNIVERSE_DCB',
      flowContext: {
        stage: 'PLAN_SELECT',
        transactionChannel: 'HE',
        purchaseTypes: [{ packKey: 'daily', purchaseTypeId: '501' }],
      },
    })
    planOptions.phoneRef.current = '9647701234567'
    sendDcbPincode.mockResolvedValue({ outcome: 'PENDING', stage: 'PIN_REQUIRED' })

    setupDcbBindings(planShadow, planOptions)
    planShadow.querySelector('span').click()

    await vi.waitFor(() => {
      expect(sendDcbPincode).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseTypeId: '501',
          transactionChannel: 'HE',
        })
      )
    })
    expect(sendDcbPincode.mock.calls[0][0]).not.toHaveProperty('requestId')
    expect(planOptions.loadPage).toHaveBeenCalledWith('OTP', { direct: true })

    const pinShadow = createShadow(`
      <input data-otp-field="otp" value="1234" />
      <button data-otp-action="verify">Confirm</button>
      <div data-otp-slot="error"></div>
      <div data-otp-slot="status"></div>
    `)
    const pinOptions = bindingsOptions({
      pageType: 'OTP',
      verificationMode: 'UNIVERSE_DCB',
      flowContext: { stage: 'BILLING_PIN' },
    })
    confirmDcbPincode.mockResolvedValue({ outcome: 'PENDING' })

    setupDcbBindings(pinShadow, pinOptions)
    pinShadow.querySelector('button').click()

    await vi.waitFor(() => {
      expect(confirmDcbPincode).toHaveBeenCalledWith(expect.objectContaining({ visitId: 91, pin: '1234' }))
      expect(pinOptions.loadPage).toHaveBeenCalledWith('INPROGRESS', {
        direct: true,
      })
    })
    expect(confirmDcbPincode.mock.calls[0][0]).not.toHaveProperty('requestId')
  })

  it('sends partner OTP when a manual number is already entitled', async () => {
    const shadow = createShadow(`
      <input data-otp-field="phone" value="500000001" />
      <input data-otp-field="otp" />
      <button data-otp-action="send">Check</button>
      <button data-otp-action="verify">Verify</button>
      <div data-otp-slot="error"></div>
      <div data-otp-slot="status"></div>
    `)
    const options = bindingsOptions({
      pageType: 'OTP',
      verificationMode: 'UNIVERSE_DCB',
      flowContext: { stage: 'MANUAL_MSISDN', mode: 'UNIVERSE_DCB' },
    })
    checkDcbMsisdn.mockResolvedValue({
      outcome: 'ENTITLED',
      nextPage: 'OTP',
      stage: 'AUTH_OTP',
      authorization: 'PARTNER_OTP',
    })
    sendOtp.mockResolvedValue({ message: 'OTP sent' })

    setupDcbBindings(shadow, options)
    shadow.querySelector('[data-otp-action="send"]').click()

    await vi.waitFor(() => {
      expect(sendOtp).toHaveBeenCalledWith(expect.objectContaining({ phone: '500000001', visitId: 91 }))
    })
    expect(options.saveSession).toHaveBeenCalledWith(expect.objectContaining({ dcbStage: 'AUTH_OTP' }))
    expect(shadow.querySelector('[data-otp-action="verify"]').textContent).toBe('Verify OTP')

    shadow.querySelector('[data-otp-field="otp"]').value = '1234'
    verifyOtp.mockResolvedValue({ verified: true })
    shadow.querySelector('[data-otp-action="verify"]').click()

    await vi.waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith(expect.objectContaining({ phone: '500000001', otp: '1234' }))
      expect(options.loadPage).toHaveBeenCalledWith('THANKYOU', { direct: true })
    })
  })
})
