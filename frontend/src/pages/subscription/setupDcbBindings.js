import { checkDcbMsisdn, confirmDcbPincode, getDcbConfig, sendDcbPincode } from '../../services/api/dcb'
import { sendOtp, verifyOtp } from '../../services/api/otp'
import { persistPhone } from '../../services/flow/resolvePhoneNumber'

const DCB_STAGES = new Set([
  'MANUAL_MSISDN',
  'MANUAL_CHECK',
  'MANUAL_ENTRY',
  'MSISDN_REQUIRED',
  'PLAN_SELECT',
  'SELECT_PLAN',
  'PLAN_REQUIRED',
  'PURCHASE_TYPE_SELECTION',
  'BILLING_PIN',
  'PIN_ENTRY',
  'PIN_SENT',
  'PIN_REQUIRED',
  'AUTH_OTP',
  'AUTHORIZATION_REQUIRED',
  'POLLING',
  'INPROGRESS',
])

function normalizeDcbStage(pageData) {
  const context = pageData?.flowContext || {}
  return String(context.stage || context.step || context.action || '')
    .trim()
    .toUpperCase()
}

function isDcbFlowContext(pageData) {
  const context = pageData?.flowContext
  if (!context || typeof context !== 'object') return false
  const marker = String(
    pageData?.verificationMode || context.verificationMode || context.mode || context.provider || ''
  ).toUpperCase()
  return (
    marker.includes('UNIVERSE') ||
    marker.includes('DCB') ||
    DCB_STAGES.has(normalizeDcbStage(pageData)) ||
    Array.isArray(context.purchaseTypes) ||
    Boolean(context.purchaseTypeId)
  )
}

function normalizedOutcome(response) {
  return String(response?.outcome || response?.routeOutcome || response?.flowContext?.outcome || response?.status || '')
    .trim()
    .toUpperCase()
}

function pageForDcbOutcome(outcome) {
  if (outcome === 'ENTITLED') return 'THANKYOU'
  if (outcome === 'LOW_BALANCE') return 'LOW_BALANCE'
  if (outcome === 'TERMINAL_FAILURE' || outcome === 'PARSE_ERROR') return 'ERROR'
  if (outcome === 'PENDING') return 'INPROGRESS'
  if (outcome === 'NEW') return 'HOME'
  return null
}

async function routeDcbResponse(response, { currentPage, cachePage, loadPage }) {
  if (!response) return null
  const explicitPage = String(response.nextPage || response.pageType || '')
    .trim()
    .toUpperCase()
  const targetPage = explicitPage || pageForDcbOutcome(normalizedOutcome(response))

  if (response.pageType && response.html) {
    cachePage(response)
    return response.pageType
  }
  if (targetPage && targetPage !== String(currentPage || '').toUpperCase()) {
    await loadPage(targetPage, { direct: true })
  } else if (response.pageType) {
    cachePage(response)
  }
  return targetPage
}

function purchaseTypesFrom(source) {
  const raw = source?.purchaseTypes || source?.purchaseTypeMappings || source?.purchaseTypeMap || []
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([packKey, value]) => ({
      packKey,
      ...(value && typeof value === 'object' ? value : { purchaseTypeId: value }),
    }))
  }
  return []
}

function resolvePurchaseType(source, packKey, directId) {
  if (directId) return String(directId)
  const wanted = String(packKey || '')
    .trim()
    .toLowerCase()
  const match = purchaseTypesFrom(source).find((item) => {
    const keys = [item?.packKey, item?.pack, item?.key, item?.slug, item?.id]
    return keys.some(
      (key) =>
        String(key || '')
          .trim()
          .toLowerCase() === wanted
    )
  })
  return String(match?.purchaseTypeId ?? match?.id ?? '')
}

function setFieldVisibility(input, visible) {
  if (!input) return
  const container = input.parentElement
  if (container) container.hidden = !visible
  else input.hidden = !visible
}

function adaptDcbStageUi(shadow, stage, { phoneInput, pinInput }) {
  const heading = shadow.querySelector('h1')
  const description = heading?.nextElementSibling
  const sendButton = shadow.querySelector('[data-dcb-action="manual-check"], [data-otp-action="send"]')
  const verifyButton = shadow.querySelector('[data-dcb-action="confirm-pin"], [data-otp-action="verify"]')
  const footnote = shadow.querySelector('.flow-footnote')

  if (['MANUAL_MSISDN', 'MANUAL_CHECK', 'MANUAL_ENTRY', 'MSISDN_REQUIRED'].includes(stage)) {
    setFieldVisibility(phoneInput, true)
    setFieldVisibility(pinInput, false)
    if (sendButton) {
      sendButton.hidden = false
      sendButton.textContent = 'Check subscription'
    }
    if (verifyButton) verifyButton.hidden = true
    if (heading) heading.textContent = 'Enter Mobile Number'
    if (description) description.textContent = 'Enter your number to check your current subscription status.'
    if (footnote) footnote.textContent = 'We will only request a billing PIN if you select a plan.'
    return
  }

  if (['BILLING_PIN', 'PIN_ENTRY', 'PIN_SENT', 'PIN_REQUIRED'].includes(stage)) {
    setFieldVisibility(phoneInput, false)
    setFieldVisibility(pinInput, true)
    if (sendButton) sendButton.hidden = true
    if (verifyButton) {
      verifyButton.hidden = false
      verifyButton.textContent = 'Confirm billing PIN'
    }
    if (heading) heading.textContent = 'Confirm Subscription'
    if (description) description.textContent = 'Enter the billing PIN sent to your mobile number.'
    if (footnote) footnote.textContent = 'Your subscription will activate after the PIN is confirmed.'
    return
  }

  if (['AUTH_OTP', 'AUTHORIZATION_REQUIRED'].includes(stage)) {
    setFieldVisibility(phoneInput, false)
    setFieldVisibility(pinInput, true)
    if (sendButton) {
      sendButton.hidden = false
      sendButton.textContent = 'Send OTP'
    }
    if (verifyButton) {
      verifyButton.hidden = false
      verifyButton.textContent = 'Verify OTP'
    }
    if (heading) heading.textContent = 'Verify subscription'
    if (description) {
      description.textContent =
        'This number is already subscribed. Enter the authorization OTP to continue.'
    }
    if (footnote) footnote.textContent = 'Dummy OTP is printed in the server log. 1234 also works.'
  }
}

function setupDcbBindings(
  shadow,
  {
    pageData,
    cachePage,
    loadPage,
    country,
    operator,
    campid,
    trackingCampid,
    visitIdRef,
    phoneRef,
    selectedPackRef,
    setPhone,
    setTransitioning,
    setError,
    saveSession,
    transitionLockRef,
  }
) {
  if (!isDcbFlowContext(pageData)) return null

  const context = pageData.flowContext || {}
  const saved = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(`tc_session_${country}_${operator}`) || '{}')
    } catch {
      return {}
    }
  })()
  let currentStage =
    saved.dcbStage === 'AUTH_OTP' && String(pageData.pageType || '').toUpperCase() === 'OTP'
      ? 'AUTH_OTP'
      : normalizeDcbStage(pageData)
  const phoneInput = shadow.querySelector(
    '[data-dcb-field="phone"], [data-otp-field="phone"], [data-field="phone"], input[type="tel"]'
  )
  const pinInput = shadow.querySelector(
    '[data-dcb-field="pin"], [data-otp-field="otp"], [data-field="otp"], [data-field="pin"]'
  )
  const errorSlot = shadow.querySelector('[data-dcb-slot="error"], [data-otp-slot="error"], [data-slot="error"]')
  const statusSlot = shadow.querySelector('[data-dcb-slot="status"], [data-otp-slot="status"], [data-slot="status"]')
  let busy = false

  adaptDcbStageUi(shadow, currentStage, { phoneInput, pinInput })
  if (phoneInput && phoneRef.current) phoneInput.value = phoneRef.current

  const setSlot = (slot, text, error = false) => {
    if (!slot) return
    slot.textContent = text || ''
    slot.style.color = error ? '#dc2626' : '#4b5563'
  }
  const commonPayload = (phone) => ({
    visitId: visitIdRef.current,
    phone: phone || phoneRef.current || undefined,
    msisdn: phone || phoneRef.current || undefined,
    country,
    operator,
    campid: campid || undefined,
    trackingCampid: trackingCampid || undefined,
  })
  const savedDcbSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem(`tc_session_${country}_${operator}`) || '{}')
    } catch {
      return {}
    }
  }
  const run = async (work, pendingText) => {
    if (busy || transitionLockRef.current) return
    busy = true
    transitionLockRef.current = true
    setTransitioning(true)
    setError('')
    setSlot(errorSlot, '')
    setSlot(statusSlot, pendingText)
    try {
      await work()
    } catch (error) {
      setSlot(statusSlot, '')
      setSlot(errorSlot, error.message || 'DCB request failed', true)
    } finally {
      busy = false
      transitionLockRef.current = false
      setTransitioning(false)
    }
  }

  const handleManualCheck = (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    const phone = String(phoneInput?.value || phoneRef.current || '').replace(/\D/g, '')
    if (!phone) {
      setSlot(errorSlot, 'Please enter a valid mobile number', true)
      return
    }
    run(async () => {
      const response = await checkDcbMsisdn(commonPayload(phone))
      phoneRef.current = phone
      setPhone(phone)
      persistPhone(phone)
      const responseStage = String(response?.stage || response?.flowContext?.stage || '').toUpperCase()
      const authOtp = responseStage === 'AUTH_OTP' || response?.authorization === 'PARTNER_OTP'
      saveSession({
        phone,
        msisdnSource: 'MANUAL',
        transactionChannel: 'Wifi',
        dcbStage: authOtp ? 'AUTH_OTP' : undefined,
      })
      if (authOtp) {
        currentStage = 'AUTH_OTP'
        adaptDcbStageUi(shadow, 'AUTH_OTP', { phoneInput, pinInput })
        await sendOtp({ phone, visitId: visitIdRef.current })
        setSlot(statusSlot, 'OTP sent. Check the server log or enter 1234.')
        if (String(pageData.pageType || '').toUpperCase() !== 'OTP') {
          await loadPage('OTP', { direct: true })
        }
        return
      }
      setSlot(statusSlot, 'Number checked')
      await routeDcbResponse(response, {
        currentPage: pageData.pageType,
        cachePage,
        loadPage,
      })
    }, 'Checking subscription...')
  }

  const handlePlanClick = (event, node) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    const packKey = node.getAttribute('data-pack') || node.getAttribute('data-plan') || selectedPackRef.current || ''
    const directId = node.getAttribute('data-purchase-type-id')
    run(async () => {
      let purchaseTypeId = resolvePurchaseType(context, packKey, directId) || String(context.purchaseTypeId || '')
      if (!purchaseTypeId) {
        const config = await getDcbConfig(commonPayload())
        purchaseTypeId = resolvePurchaseType(config, packKey, directId)
      }
      if (!purchaseTypeId) {
        throw new Error('This plan is not mapped to a Universe purchase type.')
      }
      const saved = savedDcbSession()
      const msisdnSource = context.msisdnSource || saved.msisdnSource
      const transactionChannel =
        context.transactionChannel ||
        saved.transactionChannel ||
        (String(msisdnSource || '').toUpperCase() === 'HE' ? 'HE' : 'Wifi')
      selectedPackRef.current = packKey || selectedPackRef.current
      saveSession({
        purchaseTypeId,
        transactionChannel,
        msisdnSource: msisdnSource || undefined,
        dcbStage: 'PIN_REQUIRED',
      })
      const response = await sendDcbPincode({
        ...commonPayload(),
        purchaseTypeId,
        transactionChannel,
      })
      setSlot(statusSlot, 'PIN sent')
      const responseStage = String(response?.stage || response?.flowContext?.stage || '').toUpperCase()
      if (responseStage === 'PIN_REQUIRED' && !response?.nextPage && !response?.pageType) {
        await loadPage('OTP', { direct: true })
      } else {
        await routeDcbResponse(response, {
          currentPage: pageData.pageType,
          cachePage,
          loadPage,
        })
      }
    }, 'Sending PIN...')
  }

  const handleConfirm = (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    const pin = String(pinInput?.value || '').trim()
    if (!pin) {
      setSlot(errorSlot, 'Please enter the PIN', true)
      return
    }
    run(async () => {
      const response = await confirmDcbPincode({
        ...commonPayload(),
        pin,
      })
      setSlot(statusSlot, 'PIN confirmed. Activating subscription...')
      await routeDcbResponse(response, {
        currentPage: pageData.pageType,
        cachePage,
        loadPage,
      })
    }, 'Confirming PIN...')
  }

  const handleAuthSend = (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    const phone = String(phoneRef.current || phoneInput?.value || '').replace(/\D/g, '')
    if (!phone) {
      setSlot(errorSlot, 'Please enter a valid mobile number', true)
      return
    }
    run(async () => {
      await sendOtp({ phone, visitId: visitIdRef.current })
      setSlot(statusSlot, 'OTP sent. Check the server log or enter 1234.')
    }, 'Sending OTP...')
  }

  const handleAuthVerify = (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    const phone = String(phoneRef.current || phoneInput?.value || '').replace(/\D/g, '')
    const otp = String(pinInput?.value || '').trim()
    if (!otp) {
      setSlot(errorSlot, 'Please enter the OTP', true)
      return
    }
    run(async () => {
      await verifyOtp({ phone, otp, visitId: visitIdRef.current })
      saveSession({ dcbStage: undefined })
      setSlot(statusSlot, 'OTP verified')
      await loadPage('THANKYOU', { direct: true })
    }, 'Verifying OTP...')
  }

  const handleClick = (event) => {
    const path = event.composedPath?.() || []
    const node = path.find(
      (item) =>
        item instanceof HTMLElement &&
        item.matches('[data-dcb-action], [data-otp-action], [data-action], [data-purchase-type-id]')
    )
    if (!node) return
    const action = String(
      node.getAttribute('data-dcb-action') ||
        node.getAttribute('data-otp-action') ||
        node.getAttribute('data-action') ||
        ''
    ).toUpperCase()

    if (['MANUAL_MSISDN', 'MANUAL_CHECK', 'MANUAL_ENTRY', 'MSISDN_REQUIRED'].includes(currentStage)) {
      if (['MANUAL-CHECK', 'MANUAL_CHECK', 'SEND'].includes(action)) {
        handleManualCheck(event)
      }
      return
    }
    if (['PLAN_SELECT', 'SELECT_PLAN', 'PLAN_REQUIRED', 'PURCHASE_TYPE_SELECTION'].includes(currentStage)) {
      if (
        node.hasAttribute('data-purchase-type-id') ||
        ['SEND-PIN', 'SEND_PIN', 'SUBSCRIBE', 'CONFIRM'].includes(action)
      ) {
        handlePlanClick(event, node)
      }
      return
    }
    if (['BILLING_PIN', 'PIN_ENTRY', 'PIN_SENT', 'PIN_REQUIRED'].includes(currentStage)) {
      if (['CONFIRM-PIN', 'CONFIRM_PIN', 'VERIFY', 'VERIFY-OTP'].includes(action)) {
        handleConfirm(event)
      }
      return
    }
    if (['AUTH_OTP', 'AUTHORIZATION_REQUIRED'].includes(currentStage)) {
      if (['MANUAL-CHECK', 'MANUAL_CHECK', 'SEND', 'SEND-PIN', 'SEND_PIN'].includes(action)) {
        handleAuthSend(event)
      }
      if (['CONFIRM-PIN', 'CONFIRM_PIN', 'VERIFY', 'VERIFY-OTP'].includes(action)) {
        handleAuthVerify(event)
      }
    }
  }

  shadow.addEventListener('click', handleClick)
  return () => {
    shadow.removeEventListener('click', handleClick)
  }
}

export {
  isDcbFlowContext,
  normalizeDcbStage,
  normalizedOutcome,
  pageForDcbOutcome,
  resolvePurchaseType,
  routeDcbResponse,
  setupDcbBindings,
}
