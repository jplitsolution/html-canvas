import { sendOtp, verifyOtp } from '../../services/api/otp'
import { persistPhone } from '../../services/flow/resolvePhoneNumber'
import { trackEvent } from '../../utils/analytics'

function setupOtpBindings(shadow, { transitionFlow, cachePage, loadPage, country, operator, campid, trackingCampid, visitIdRef, phoneRef, packRef, setPhone, setTransitioning, setError: _setError, pageCacheRef, transitionLockRef }) {
  const sendBtn = shadow.querySelector('[data-action="send-otp"], [data-otp-action="send"]')
  const verifyBtn = shadow.querySelector('[data-action="verify-otp"], [data-otp-action="verify"]')
  const phoneInput = shadow.querySelector('[data-otp-field="phone"], [data-field="phone"], input[type="tel"]')
  const otpInput = shadow.querySelector('[data-otp-field="otp"], [data-field="otp"]')
  const errorSlot = shadow.querySelector('[data-otp-slot="error"], [data-slot="error"]')
  const statusSlot = shadow.querySelector('[data-otp-slot="status"], [data-slot="status"]')

  let timer = null
  let isSending = false
  let isVerifying = false

  const setSlotText = (slot, text, isError = false) => {
    if (!slot) return
    slot.textContent = text || ''
    slot.style.color = isError ? '#dc2626' : '#4b5563'
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

  // Country-code dropdown disabled for now — campaign country isn't mapped to a
  // dial code yet, so auto-prepending +91 (etc.) produces wrong MSISDNs.
  // User enters the full number they want to use (local or with country code).

  if (phoneInput && phoneRef.current) {
    phoneInput.value = phoneRef.current
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

  const handleSendClick = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (isSending) return

    if (resendAttempts >= 5) {
      setSlotText(errorSlot, 'Maximum resend attempts reached. Please try again later.', true)
      return
    }
    
    const basePhone = phoneInput ? phoneInput.value.trim() : ''
    const cleanBasePhone = basePhone.replace(/\D/g, '')
    
    // No fixed MSISDN length — markets differ (local / with country code).
    if (!cleanBasePhone) {
      setSlotText(errorSlot, 'Please enter a valid mobile number', true)
      return
    }

    // Use number as entered — do not invent a country code.
    const msisdn = cleanBasePhone
    
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
        setSlotText(errorSlot, 'Maximum resend attempts reached. Please try again later.', true)
        return
      }

      // Start Resend countdown timer (30s)
      let seconds = 30
      if (sendBtn) {
        sendBtn.disabled = true
        timer = setInterval(() => {
          seconds -= 1
          if (seconds <= 0) {
            clearInterval(timer)
            if (resendAttempts < 5) {
              sendBtn.disabled = false
              sendBtn.style.opacity = '1'
              sendBtn.textContent = 'Get OTP'
            }
            setSlotText(statusSlot, '')
          } else {
            sendBtn.textContent = `Resend in ${seconds}s`
          }
        }, 1000)
      }
    } catch (err) {
      setSlotText(statusSlot, '')
      setSlotText(errorSlot, err.message, true)
      if (sendBtn && resendAttempts < 5) {
        sendBtn.disabled = false
        sendBtn.style.opacity = '1'
        sendBtn.textContent = 'Get OTP'
      }
    } finally {
      isSending = false
    }
  }

  const handleVerifyClick = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (isVerifying) return

    const basePhone = phoneInput ? phoneInput.value.trim() : ''
    const cleanBasePhone = basePhone.replace(/\D/g, '')
    const msisdn = cleanBasePhone || phoneRef.current
    const code = otpInput ? otpInput.value.trim() : ''

    if (!msisdn) {
      setSlotText(errorSlot, 'Mobile number is missing', true)
      return
    }
    if (!code) {
      setSlotText(errorSlot, 'Please enter the verification code', true)
      return
    }
    // OTP length is partner-defined (4, 5, 6, …) — do not enforce a fixed size.

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
    const val = e.target.value.trim()
    // Auto-submit only when the template sets maxlength (e.g. 4 or 6).
    // Never hardcode 6 — PIN length is campaign/partner specific.
    const maxAttr = e.target.getAttribute('maxlength')
    const max =
      maxAttr != null && maxAttr !== ''
        ? parseInt(maxAttr, 10)
        : Number(e.target.maxLength) > 0 && Number(e.target.maxLength) < 100000
          ? Number(e.target.maxLength)
          : NaN
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

  return () => {
    if (timer) clearInterval(timer)
    if (sendBtn) sendBtn.removeEventListener('click', handleSendClick)
    if (verifyBtn) verifyBtn.removeEventListener('click', handleVerifyClick)
    if (otpInput) otpInput.removeEventListener('input', handleOtpInput)
  }
}

export { setupOtpBindings }
