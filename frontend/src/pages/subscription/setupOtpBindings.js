import { sendOtp, verifyOtp } from '../../services/api/otp'
import {
  formatMsisdnWithCountryCode,
  normalizeMsisdn,
  persistPhone,
  resolvePhoneFromStorage,
} from '../../services/flow/resolvePhoneNumber'
import { trackEvent } from '../../utils/analytics'

export function getCountryCodeFromDom(phoneInput, shadow) {
  if (phoneInput) {
    const attr =
      phoneInput.getAttribute('data-country-code') ||
      phoneInput.getAttribute('data-phone-prefix')
    if (attr && attr.trim()) return attr.trim()
  }
  if (shadow) {
    const badge = shadow.querySelector(
      '[data-country-code], .wjo-country-code, .country-code-prefix, .phone-prefix-badge, .country-code',
    )
    if (badge) {
      const val = badge.getAttribute('data-country-code') || badge.textContent || ''
      if (val && val.trim()) return val.trim()
    }
  }
  return ''
}

function setupOtpBindings(shadow, { transitionFlow, cachePage, loadPage, country, operator, campid, trackingCampid, visitIdRef, phoneRef, packRef, setPhone, setTransitioning, setError, pageCacheRef, transitionLockRef }) {
  const sendBtn = shadow.querySelector('[data-action="send-otp"], [data-otp-action="send"]')
  const verifyBtn = shadow.querySelector('[data-action="verify-otp"], [data-otp-action="verify"]')
  const phoneInput = shadow.querySelector('[data-otp-field="phone"], [data-field="phone"], input[type="tel"]')
  const otpInput = shadow.querySelector('[data-otp-field="otp"], [data-field="otp"]')
  const errorSlot = shadow.querySelector('[data-otp-slot="error"], [data-slot="error"]')
  const statusSlot = shadow.querySelector('[data-otp-slot="status"], [data-slot="status"]')

  let timer = null
  let isSending = false
  let isVerifying = false

  const isErrorSlot = (el) => {
    if (!el) return false
    return (
      el.matches?.(
        '[data-otp-slot="error"], [data-slot="error"], [data-dcb-slot="error"], .wjo-error, .bf-error-slot, .dcb-error-slot, .otp-error-slot, .otp-error',
      ) ||
      el.getAttribute?.('data-otp-slot') === 'error' ||
      el.getAttribute?.('data-slot') === 'error' ||
      el.getAttribute?.('data-dcb-slot') === 'error'
    )
  }

  const setErrorText = (text) => {
    const errorSlots = shadow.querySelectorAll(
      '[data-otp-slot="error"], [data-slot="error"], [data-dcb-slot="error"], .wjo-error, .bf-error-slot, .dcb-error-slot, .otp-error-slot, .otp-error',
    )
    if (errorSlots.length > 0) {
      errorSlots.forEach((slot) => {
        slot.textContent = text || ''
        slot.style.color = '#dc2626'
        if (text) {
          slot.hidden = false
          if (slot.style.display === 'none') {
            slot.style.display = ''
          }
        }
      })
    } else if (text && verifyBtn && verifyBtn.parentNode) {
      let fallbackSlot = shadow.querySelector('.otp-injected-error-slot')
      if (!fallbackSlot) {
        fallbackSlot = document.createElement('div')
        fallbackSlot.className = 'otp-injected-error-slot'
        fallbackSlot.style.cssText =
          'min-height:18px;color:#dc2626;font-size:13px;font-weight:600;margin:8px 0;text-align:center;'
        verifyBtn.parentNode.insertBefore(fallbackSlot, verifyBtn)
      }
      fallbackSlot.textContent = text
      fallbackSlot.hidden = false
      fallbackSlot.style.display = ''
    } else {
      const fallbackSlot = shadow.querySelector('.otp-injected-error-slot')
      if (fallbackSlot) {
        fallbackSlot.textContent = ''
      }
    }

    if (typeof setError === 'function') {
      if (errorSlots.length === 0 && !shadow.querySelector('.otp-injected-error-slot')) {
        setError(text || '')
      } else {
        setError('')
      }
    }
  }

  const setStatusText = (text) => {
    const statusSlots = shadow.querySelectorAll(
      '[data-otp-slot="status"], [data-slot="status"], [data-dcb-slot="status"], .wjo-status, .bf-status-slot, .dcb-status-slot, .otp-status-slot, .otp-status',
    )
    if (statusSlots.length > 0) {
      statusSlots.forEach((slot) => {
        slot.textContent = text || ''
        slot.style.color = '#4b5563'
        if (text) {
          slot.hidden = false
          if (slot.style.display === 'none') {
            slot.style.display = ''
          }
        }
      })
    } else if (statusSlot) {
      statusSlot.textContent = text || ''
      statusSlot.style.color = '#4b5563'
    }
  }

  const setSlotText = (slot, text, isError = false) => {
    if (isError || isErrorSlot(slot)) {
      setErrorText(text)
    } else {
      setStatusText(text)
    }
  }

  // Load resendAttempts from sessionStorage
  let initialResendAttempts = 0
  try {
    const saved = sessionStorage.getItem(`tc_session_${country}_${operator}`)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (typeof parsed.resendAttempts === 'number') {
        initialResendAttempts = parsed.resendAttempts
      }
    }
  } catch {
    /* ignore malformed session state */
  }
  let resendAttempts = initialResendAttempts

  const countryCode = getCountryCodeFromDom(phoneInput, shadow)

  if (phoneInput) {
    const initialPhone = phoneRef?.current || resolvePhoneFromStorage() || ''
    if (initialPhone) {
      if (phoneRef) phoneRef.current = initialPhone
      if (setPhone) setPhone(initialPhone)
      const cleanCode = normalizeMsisdn(countryCode)
      const hasVisibleBadge = Boolean(
        shadow.querySelector(
          '[data-country-code], .wjo-country-code, .country-code-prefix, .phone-prefix-badge',
        ),
      )
      if (
        hasVisibleBadge &&
        cleanCode &&
        initialPhone.startsWith(cleanCode) &&
        initialPhone.length > cleanCode.length + 4
      ) {
        phoneInput.value = initialPhone.slice(cleanCode.length)
      } else {
        phoneInput.value = initialPhone
      }
    }
  }

  const handlePhoneInput = (e) => {
    setErrorText('')
    let val = e.target.value.trim().replace(/\D/g, '')
    const maxAttr = phoneInput?.getAttribute('maxlength') || phoneInput?.getAttribute('data-max-length')
    const max = maxAttr != null && maxAttr !== '' ? parseInt(maxAttr, 10) : NaN
    if (Number.isFinite(max) && max > 0 && val.length > max) {
      val = val.slice(0, max)
    }
    if (e.target.value !== val) {
      e.target.value = val
    }
    const activeCountryCode = getCountryCodeFromDom(phoneInput, shadow)
    const fullMsisdn = formatMsisdnWithCountryCode(val, activeCountryCode)
    if (phoneRef) phoneRef.current = fullMsisdn
    if (setPhone) setPhone(fullMsisdn)
    if (fullMsisdn) persistPhone(fullMsisdn)
  }

  // Check if limit already exceeded on mount
  if (resendAttempts >= 5) {
    if (sendBtn) {
      sendBtn.disabled = true
      sendBtn.style.opacity = '0.5'
      sendBtn.textContent = 'Limit Exceeded'
    }
    setSlotText(errorSlot, 'Maximum resend attempts reached. Please try again later.', true)
  }

  const isTwoStepOtp = Boolean(phoneInput && otpInput && sendBtn && verifyBtn)

  const findContainer = (el, otherSelector) => {
    if (!el) return null
    const stage = el.closest?.('[data-otp-step], [data-dcb-stage]')
    if (stage) return stage
    const parent = el.parentElement
    if (parent && !parent.querySelector(otherSelector)) {
      return parent
    }
    return el
  }

  const phoneBlock = findContainer(phoneInput, '[data-otp-field="otp"], [data-field="otp"]')
  const otpBlock = findContainer(otpInput, '[data-otp-field="phone"], [data-field="phone"]')
  const existingResendRow = shadow.querySelector('.otp-resend-row')

  let changeNumberBtn = shadow.querySelector('[data-otp-action="change-phone"]')
  let step2Footer = shadow.querySelector('.otp-step2-actions')

  if (isTwoStepOtp && !changeNumberBtn && verifyBtn && verifyBtn.parentNode) {
    step2Footer = document.createElement('div')
    step2Footer.className = 'otp-step2-actions'
    step2Footer.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;margin-top:14px;font-size:12.5px;gap:8px;'

    changeNumberBtn = document.createElement('button')
    changeNumberBtn.type = 'button'
    changeNumberBtn.setAttribute('data-otp-action', 'change-phone')
    changeNumberBtn.textContent = '← Change number'
    changeNumberBtn.style.cssText =
      'background:none;border:none;color:#059669;font-size:12.5px;font-weight:600;cursor:pointer;padding:0;text-decoration:underline;'

    const resendBtn = document.createElement('button')
    resendBtn.type = 'button'
    resendBtn.className = 'otp-resend-link'
    resendBtn.textContent = 'Resend code'
    resendBtn.style.cssText =
      'background:none;border:none;color:#64748b;font-size:12.5px;font-weight:600;cursor:pointer;padding:0;'

    step2Footer.appendChild(changeNumberBtn)
    step2Footer.appendChild(resendBtn)
    verifyBtn.insertAdjacentElement('afterend', step2Footer)

    resendBtn.addEventListener('click', (e) => {
      e.preventDefault()
      if (!resendBtn.disabled && !isSending) {
        handleSendClick(e)
      }
    })
  }

  const inlineResendBtn = step2Footer?.querySelector?.('.otp-resend-link') || null

  let currentStep = 1

  const setStep = (step) => {
    if (!isTwoStepOtp) return
    currentStep = step
    if (step === 1) {
      if (phoneBlock) {
        phoneBlock.hidden = false
        phoneBlock.style.display = ''
      }
      if (sendBtn) {
        sendBtn.hidden = false
        sendBtn.style.display = ''
      }
      if (otpBlock) {
        otpBlock.hidden = true
        otpBlock.style.display = 'none'
      }
      if (verifyBtn) {
        verifyBtn.hidden = true
        verifyBtn.style.display = 'none'
      }
      if (step2Footer) {
        step2Footer.hidden = true
        step2Footer.style.display = 'none'
      }
      if (existingResendRow) {
        existingResendRow.hidden = true
        existingResendRow.style.display = 'none'
      }
    } else if (step === 2) {
      if (phoneBlock) {
        phoneBlock.hidden = true
        phoneBlock.style.display = 'none'
      }
      if (sendBtn) {
        sendBtn.hidden = true
        sendBtn.style.display = 'none'
      }
      if (otpBlock) {
        otpBlock.hidden = false
        otpBlock.style.display = ''
      }
      if (verifyBtn) {
        verifyBtn.hidden = false
        verifyBtn.style.display = ''
      }
      if (step2Footer) {
        step2Footer.hidden = false
        step2Footer.style.display = 'flex'
      }
      if (existingResendRow) {
        existingResendRow.hidden = false
        existingResendRow.style.display = ''
      }
      if (otpInput) {
        setTimeout(() => otpInput.focus?.(), 50)
      }
    }
  }

  const handleChangePhone = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    setStep(1)
    setSlotText(errorSlot, '')
    setSlotText(statusSlot, '')
    if (sendBtn && resendAttempts < 5) {
      sendBtn.disabled = false
      sendBtn.style.opacity = '1'
      sendBtn.textContent = 'Get OTP'
    }
    if (phoneInput) {
      const activeCountryCode = getCountryCodeFromDom(phoneInput, shadow)
      const cleanCode = normalizeMsisdn(activeCountryCode)
      const hasVisibleBadge = Boolean(
        shadow.querySelector(
          '[data-country-code], .wjo-country-code, .country-code-prefix, .phone-prefix-badge',
        ),
      )
      if (
        hasVisibleBadge &&
        cleanCode &&
        phoneRef?.current?.startsWith(cleanCode) &&
        phoneRef.current.length > cleanCode.length + 4
      ) {
        phoneInput.value = phoneRef.current.slice(cleanCode.length)
      } else if (phoneRef?.current) {
        phoneInput.value = phoneRef.current
      }
      phoneInput.focus?.()
    }
  }

  if (changeNumberBtn) {
    changeNumberBtn.addEventListener('click', handleChangePhone)
  }

  if (isTwoStepOtp) {
    if (initialResendAttempts > 0) {
      setStep(2)
    } else {
      setStep(1)
    }
  }

  const updateCountdown = (text, disabled) => {
    if (sendBtn) {
      sendBtn.textContent = text
      sendBtn.disabled = disabled
    }
    if (inlineResendBtn) {
      inlineResendBtn.textContent = text
      inlineResendBtn.disabled = disabled
      inlineResendBtn.style.opacity = disabled ? '0.6' : '1'
      inlineResendBtn.style.cursor = disabled ? 'not-allowed' : 'pointer'
    }
  }

  const handleSendClick = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (isSending) return

    if (resendAttempts >= 5) {
      setSlotText(errorSlot, 'Maximum resend attempts reached. Please try again later.', true)
      return
    }
    
    const basePhone =
      (phoneInput ? phoneInput.value.trim() : '') ||
      phoneRef?.current ||
      resolvePhoneFromStorage() ||
      ''
    const cleanBasePhone = basePhone.replace(/\D/g, '')
    
    // No fixed MSISDN length — markets differ (local / with country code).
    if (!cleanBasePhone) {
      setSlotText(errorSlot, 'Please enter a valid mobile number', true)
      return
    }

    const minAttr = phoneInput?.getAttribute('minlength') || phoneInput?.getAttribute('data-min-length')
    const min = minAttr != null && minAttr !== '' ? parseInt(minAttr, 10) : NaN
    const maxAttr = phoneInput?.getAttribute('maxlength') || phoneInput?.getAttribute('data-max-length')
    const max = maxAttr != null && maxAttr !== '' ? parseInt(maxAttr, 10) : NaN

    const activeCountryCode = getCountryCodeFromDom(phoneInput, shadow)
    const cleanCountryDigits = normalizeMsisdn(activeCountryCode)
    const alreadyHasCountryCode = Boolean(
      cleanCountryDigits && cleanBasePhone.startsWith(cleanCountryDigits)
    )
    const effectiveMin =
      alreadyHasCountryCode && Number.isFinite(min) ? min + cleanCountryDigits.length : min
    const effectiveMax =
      alreadyHasCountryCode && Number.isFinite(max) ? max + cleanCountryDigits.length : max

    if (Number.isFinite(effectiveMin) && effectiveMin > 0 && cleanBasePhone.length < effectiveMin) {
      setSlotText(errorSlot, `Mobile number must be at least ${min} digits`, true)
      return
    }

    if (Number.isFinite(effectiveMax) && effectiveMax > 0 && cleanBasePhone.length > effectiveMax) {
      setSlotText(errorSlot, `Mobile number cannot exceed ${max} digits`, true)
      return
    }

    // Attach country code prefix to mobile number before sending
    const msisdn = formatMsisdnWithCountryCode(cleanBasePhone, activeCountryCode)
    
    setSlotText(errorSlot, '')
    setSlotText(statusSlot, 'Sending verification code...')
    
    if (sendBtn) {
      sendBtn.disabled = true
      sendBtn.style.opacity = '0.5'
      sendBtn.innerHTML = `Sending... <span class="otp-spinner"></span>`
    }

    isSending = true

    try {
      const data = await sendOtp({ phone: msisdn, visitId: visitIdRef.current, pack: packRef?.current })
      phoneRef.current = msisdn
      setPhone(msisdn)
      persistPhone(msisdn)
      // Drop pages rendered without MSISDN so CONFIRM re-fetches with the number.
      pageCacheRef?.current?.delete('CONFIRM')
      pageCacheRef?.current?.delete('THANKYOU')
      trackEvent('otp_sent')
      
      if (data?.isSubscribed || data?.status === 'ACTIVE') {
        if (data.forwardUrl) {
          setSlotText(statusSlot, 'Abonnement déjà actif ! Redirection en cours...')
          setTimeout(() => {
            window.location.href = data.forwardUrl
          }, 800)
          return
        }
      }

      if (!otpInput) {
        // Separate phone entry step (CONFIRM page) -> Transition to OTP verify step
        setSlotText(statusSlot, 'Code envoyé ! Chargement...')
        setTransitioning(true)
        if (transitionLockRef) transitionLockRef.current = true
        try {
          const next = await transitionFlow({
            visitId: visitIdRef.current,
            country,
            operator,
            campid: campid || undefined,
            trackingCampid: trackingCampid || undefined,
            fromPage: 'CONFIRM',
            action: 'OTP_SENT',
            phone: msisdn,
          })
          if (next) cachePage(next)
          if (loadPage && (!next || String(next.pageType).toUpperCase() === 'CONFIRM')) {
            await loadPage('OTP', { direct: true })
          }
        } catch {
          if (loadPage) await loadPage('OTP', { direct: true })
        } finally {
          setTransitioning(false)
          if (transitionLockRef) transitionLockRef.current = false
        }
        return
      }

      otpInput.value = ''
      
      let successText = 'Verification code sent!'
      const devOtp = data.devOtpCode || data.otp
      if (devOtp) {
        successText += ` (Dev OTP: ${devOtp})`
      }
      setSlotText(statusSlot, successText)

      setStep(2)

      // Increment resend attempts
      resendAttempts += 1
      try {
        const saved = sessionStorage.getItem(`tc_session_${country}_${operator}`)
        const sessionObj = saved ? JSON.parse(saved) : {}
        sessionObj.resendAttempts = resendAttempts
        sessionObj.phone = msisdn
        sessionStorage.setItem(`tc_session_${country}_${operator}`, JSON.stringify(sessionObj))
      } catch {
        /* ignore sessionStorage write failures */
      }

      if (resendAttempts >= 5) {
        if (sendBtn) {
          sendBtn.disabled = true
          sendBtn.style.opacity = '0.5'
          sendBtn.textContent = 'Limit Exceeded'
        }
        if (inlineResendBtn) {
          inlineResendBtn.disabled = true
          inlineResendBtn.textContent = 'Limit Exceeded'
        }
        setSlotText(errorSlot, 'Maximum resend attempts reached. Please try again later.', true)
        return
      }

      // Start Resend countdown timer (30s)
      let seconds = 30
      updateCountdown(`Resend in ${seconds}s`, true)
      timer = setInterval(() => {
        seconds -= 1
        if (seconds <= 0) {
          clearInterval(timer)
          if (resendAttempts < 5) {
            updateCountdown('Resend code', false)
            if (sendBtn) {
              sendBtn.style.opacity = '1'
              sendBtn.textContent = 'Get OTP'
            }
          }
          setSlotText(statusSlot, '')
        } else {
          updateCountdown(`Resend in ${seconds}s`, true)
        }
      }, 1000)
    } catch (err) {
      setSlotText(statusSlot, '')
      setSlotText(errorSlot, err.message, true)
      if (resendAttempts < 5) {
        updateCountdown('Resend code', false)
        if (sendBtn) {
          sendBtn.disabled = false
          sendBtn.style.opacity = '1'
          sendBtn.textContent = 'Get OTP'
        }
      }
    } finally {
      isSending = false
    }
  }

  const handleVerifyClick = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (isVerifying) return

    const basePhone =
      (phoneInput ? phoneInput.value.trim() : '') ||
      phoneRef?.current ||
      resolvePhoneFromStorage() ||
      ''
    const cleanBasePhone = basePhone.replace(/\D/g, '')
    const activeCountryCode = getCountryCodeFromDom(phoneInput, shadow)
    const msisdn =
      formatMsisdnWithCountryCode(cleanBasePhone, activeCountryCode) ||
      phoneRef?.current ||
      resolvePhoneFromStorage() ||
      ''
    const code = otpInput ? otpInput.value.trim() : ''

    if (!msisdn) {
      setSlotText(errorSlot, 'Mobile number is missing', true)
      return
    }
    if (!code) {
      setSlotText(errorSlot, 'Please enter the verification code', true)
      return
    }

    const minAttr = otpInput?.getAttribute('minlength') || otpInput?.getAttribute('data-min-length')
    const min = minAttr != null && minAttr !== '' ? parseInt(minAttr, 10) : NaN
    if (Number.isFinite(min) && min > 0 && code.length < min) {
      setSlotText(errorSlot, `Code must be at least ${min} characters`, true)
      return
    }

    const maxAttr = otpInput?.getAttribute('maxlength') || otpInput?.getAttribute('data-max-length')
    const max = maxAttr != null && maxAttr !== '' ? parseInt(maxAttr, 10) : NaN
    if (Number.isFinite(max) && max > 0 && code.length > max) {
      setSlotText(errorSlot, `Code cannot exceed ${max} characters`, true)
      return
    }

    const originalStatusText = statusSlot ? statusSlot.textContent : ''

    setSlotText(errorSlot, '')
    setSlotText(statusSlot, 'Verifying code...')
    
    if (verifyBtn) {
      verifyBtn.disabled = true
      verifyBtn.style.opacity = '0.5'
      verifyBtn.innerHTML = `Verifying... <span class="otp-spinner"></span>`
    }

    isVerifying = true

    try {
      await verifyOtp({ phone: msisdn, otp: code, visitId: visitIdRef.current })
      trackEvent('otp_verified')

      // Sync phone state and ref immediately upon successful verification
      phoneRef.current = msisdn
      setPhone(msisdn)
      persistPhone(msisdn)
      pageCacheRef?.current?.delete('CONFIRM')
      pageCacheRef?.current?.delete('THANKYOU')

      setSlotText(statusSlot, 'Verified! Continuing...')
      setTransitioning(true)
      if (transitionLockRef) transitionLockRef.current = true

      try {
        const next = await transitionFlow({
          visitId: visitIdRef.current,
          country,
          operator,
          campid: campid || undefined,
          trackingCampid: trackingCampid || undefined,
          fromPage: 'OTP',
          action: 'CONTINUE',
          phone: msisdn,
        })
        if (next?.externalRedirect && /^https?:\/\//i.test(next.externalRedirect)) {
          window.location.assign(next.externalRedirect)
          return
        }
        cachePage(next)
        const nextType = String(next?.pageType || '').toUpperCase()
        // Continue funnel must leave OTP. If the graph still returned OTP, load HOME.
        if (nextType === 'OTP' && loadPage) {
          await loadPage('HOME', { direct: true })
        }
      } catch (err) {
        setSlotText(errorSlot, err.message || 'Funnel transition failed', true)
        if (statusSlot) statusSlot.textContent = originalStatusText
        if (verifyBtn) {
          verifyBtn.disabled = false
          verifyBtn.style.opacity = '1'
          verifyBtn.textContent = 'Verify & Continue'
        }
      } finally {
        setTransitioning(false)
        if (transitionLockRef) transitionLockRef.current = false
      }
    } catch (err) {
      trackEvent('otp_failed')
      if (statusSlot) statusSlot.textContent = originalStatusText
      setSlotText(errorSlot, err.message, true)
      if (verifyBtn) {
        verifyBtn.disabled = false
        verifyBtn.style.opacity = '1'
        verifyBtn.textContent = 'Verify & Continue'
      }
    } finally {
      isVerifying = false
    }
  }

  const handleOtpInput = (e) => {
    setErrorText('')
    let val = e.target.value.trim().replace(/\D/g, '')
    const maxAttr = e.target.getAttribute('maxlength') || e.target.getAttribute('data-max-length')
    const max =
      maxAttr != null && maxAttr !== ''
        ? parseInt(maxAttr, 10)
        : Number(e.target.maxLength) > 0 && Number(e.target.maxLength) < 100000
          ? Number(e.target.maxLength)
          : NaN
    if (Number.isFinite(max) && max > 0 && val.length > max) {
      val = val.slice(0, max)
    }
    if (e.target.value !== val) {
      e.target.value = val
    }
    if (Number.isFinite(max) && max > 0 && val.length === max) {
      handleVerifyClick({ preventDefault: () => {} })
    }
  }

  // Inject spinner animation styles
  if (!shadow.querySelector('#otp-spinner-styles')) {
    const styleEl = document.createElement('style')
    styleEl.id = 'otp-spinner-styles'
    styleEl.textContent = `
      .otp-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: currentColor;
        animation: otpSpin 0.8s linear infinite;
        vertical-align: middle;
        margin-left: 6px;
      }
      @keyframes otpSpin {
        to { transform: rotate(360deg); }
      }
    `
    shadow.appendChild(styleEl)
  }

  if (sendBtn) sendBtn.addEventListener('click', handleSendClick)
  if (verifyBtn) verifyBtn.addEventListener('click', handleVerifyClick)
  if (otpInput) otpInput.addEventListener('input', handleOtpInput)
  if (phoneInput) phoneInput.addEventListener('input', handlePhoneInput)

  return () => {
    if (timer) clearInterval(timer)
    if (sendBtn) sendBtn.removeEventListener('click', handleSendClick)
    if (verifyBtn) verifyBtn.removeEventListener('click', handleVerifyClick)
    if (otpInput) otpInput.removeEventListener('input', handleOtpInput)
    if (phoneInput) phoneInput.removeEventListener('input', handlePhoneInput)
    if (changeNumberBtn) changeNumberBtn.removeEventListener('click', handleChangePhone)
  }
}

export { setupOtpBindings }
