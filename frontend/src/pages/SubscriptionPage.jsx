import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchFlowEntry, fetchFlowPage, prefetchFlowPage, transitionFlow } from '../services/api/flow'
import { resolvePhoneFromUrl, resolvePhoneNumber, persistPhone } from '../services/flow/resolvePhoneNumber'
import { getApiBase } from '../services/api/client'
import { sendOtp, verifyOtp } from '../services/api/otp'
import { trackEvent } from '../utils/analytics'


const FLOW_FONT =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'

const VALID_PACKS = ['daily', 'weekly', 'monthly']

const FLOW_SHADOW_STYLES = `
  :host { display: block; width: 100%; min-height: 100vh; }
  .flow-page-inner {
    animation: flowPageIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes flowPageIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .flow-pack-option.flow-pack-selected {
    border-color: #7c4dff !important;
    background: #f5f3ff !important;
    box-shadow: 0 0 0 1px #7c4dff;
  }
  @media (prefers-reduced-motion: reduce) {
    .flow-page-inner { animation: none; }
  }
`

const PRELOAD_BY_PAGE = {
  HOME: ['CONFIRM', 'THANKYOU', 'ERROR', 'BLOCKED'],
  CONFIRM: ['THANKYOU', 'ERROR', 'BLOCKED'],
}

function normalizePack(value) {
  const pack = (value || 'daily').toLowerCase()
  return VALID_PACKS.includes(pack) ? pack : 'daily'
}

function findActionTarget(event) {
  const path = event.composedPath?.() || []
  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue
    if (node.closest('[data-pack]')) continue
    if (!node.matches('[data-action], button, a')) continue
    const action =
      node.getAttribute('data-action') ||
      (node.textContent?.toLowerCase().includes('confirm') ? 'CONFIRM' : null) ||
      (node.textContent?.toLowerCase().includes('subscribe') ? 'SUBSCRIBE' : null)
    if (action) return { node, action }
  }
  return null
}

function mountPageInShadow(shadow, pageData) {
  shadow.innerHTML = `
    <style>${FLOW_SHADOW_STYLES}</style>
    <style>${pageData.css || ''}</style>
    <div class="flow-page-inner">${pageData.html}</div>
  `
}

function syncPackPicker(shadow, selectedPack) {
  shadow.querySelectorAll('[data-pack]').forEach((el) => {
    const isSelected = el.getAttribute('data-pack') === selectedPack
    el.classList.toggle('flow-pack-selected', isSelected)
  })
}

/** Fill empty {{phone}} slots on CONFIRM / thank-you style pages. */
function syncPhoneDisplay(shadow, phone) {
  if (!shadow || !phone) return
  shadow.querySelectorAll('.flow-info-value').forEach((el) => {
    const text = (el.textContent || '').trim()
    if (!text || text === '{{phone}}') {
      el.textContent = phone
    }
  })
}

function getSelectedPackFromShadow(shadow) {
  const selected = shadow.querySelector('[data-pack].flow-pack-selected')
  return normalizePack(selected?.getAttribute('data-pack'))
}

function setupOtpBindings(shadow, { transitionFlow, cachePage, country, operator, visitIdRef, phoneRef, packRef, setPhone, setTransitioning, setError, pageCacheRef }) {
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
  } catch (e) {}
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
    
    if (cleanBasePhone.length < 8) {
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
      
      if (otpInput) {
        otpInput.value = ''
      }
      
      let successText = 'Verification code sent!'
      if (data.otp) {
        successText += ` (Dev OTP: ${data.otp})`
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
      } catch (err) {}

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
      
      try {
        const next = await transitionFlow({
          visitId: visitIdRef.current,
          country,
          operator,
          fromPage: 'OTP',
          action: 'CONTINUE',
          phone: msisdn,
        })
        cachePage(next)
      } catch (err) {
        setSlotText(errorSlot, err.message || 'Funnel transition failed', true)
        if (statusSlot) statusSlot.textContent = originalStatusText
        if (verifyBtn) {
          verifyBtn.disabled = false
          verifyBtn.style.opacity = '1'
          verifyBtn.textContent = 'Verify & Continue'
        }
        setTransitioning(false)
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
    if (val.length === 6) {
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

function SubscriptionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const country = searchParams.get('country') || ''
  const operator = searchParams.get('operator') || ''
  // Affiliate / vendor click attribution (from the shared tracking URL).
  const campid = searchParams.get('campid') || ''
  const vid = searchParams.get('vid') || ''
  const affId = searchParams.get('aff_id') || ''
  const clickId = searchParams.get('click_id') || ''

  const [phone, setPhone] = useState('')
  const [phoneResolving, setPhoneResolving] = useState(true)
  const [booting, setBooting] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [error, setError] = useState('')
  const [pageData, setPageData] = useState(null)

  const hostRef = useRef(null)
  const visitIdRef = useRef(null)
  const entryPageRef = useRef('HOME')
  const pageCacheRef = useRef(new Map())
  const prefetchingRef = useRef(new Set())
  const transitionLockRef = useRef(false)
  const pageDataRef = useRef(null)
  const selectedPackRef = useRef('daily')
  const phoneRef = useRef('')

  const queryKey = useMemo(
    () => `${country}|${operator}|${phone}`,
    [country, operator, phone],
  )

  // Keep ref in sync, but never wipe a phone set mid-async (e.g. OTP verify)
  // with a stale empty React state before setPhone commits.
  if (phone || !phoneRef.current) {
    phoneRef.current = phone
  }

  // Helper to load session
  const getSavedSession = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(`tc_session_${country}_${operator}`)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }, [country, operator])

  // Helper to save session
  const saveSession = useCallback((data) => {
    try {
      const current = getSavedSession() || {}
      const updated = { ...current, ...data }
      sessionStorage.setItem(`tc_session_${country}_${operator}`, JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to save session:', e)
    }
  }, [country, operator, getSavedSession])

  useEffect(() => {
    if (!country || !operator) {
      setPhoneResolving(false)
      return undefined
    }

    let cancelled = false
    setPhoneResolving(true)

    resolvePhoneNumber(new URLSearchParams(window.location.search)).then(({ phone: resolved }) => {
      if (cancelled) return
      if (resolved) {
        phoneRef.current = resolved
        setPhone(resolved)
        const currentParams = new URLSearchParams(window.location.search)
        if (!resolvePhoneFromUrl(currentParams)) {
          currentParams.set('msisdn', resolved)
          setSearchParams(currentParams, { replace: true })
        }
      } else {
        // Fall back to session phone from a prior OTP in this tab
        try {
          const saved = sessionStorage.getItem(`tc_session_${country}_${operator}`)
          const sessionPhone = saved ? JSON.parse(saved)?.phone : ''
          if (sessionPhone) {
            phoneRef.current = sessionPhone
            setPhone(sessionPhone)
            persistPhone(sessionPhone)
          }
        } catch {
          /* ignore */
        }
      }
      setPhoneResolving(false)
    })

    return () => {
      cancelled = true
    }
  }, [country, operator, setSearchParams])

  const cachePage = useCallback((data) => {
    if (!data?.pageType) return
    if (data.entryPage) entryPageRef.current = data.entryPage
    pageCacheRef.current.set(data.pageType, data)
    if (data.visitId) visitIdRef.current = data.visitId
    pageDataRef.current = data
    setPageData(data)

    const resolvedPhone =
      phoneRef.current || data.variables?.phone || data.variables?.msisdn || ''
    if (resolvedPhone) {
      phoneRef.current = resolvedPhone
      setPhone(resolvedPhone)
      persistPhone(resolvedPhone)
    }

    // Save session in sessionStorage
    const isVerified = (data.pageType === 'CONFIRM' || data.pageType === 'THANKYOU' || data.verified === true)
    saveSession({
      verificationStatus: isVerified ? 'verified' : 'unverified',
      flowId: data.campaignId,
      campaignId: data.campaignId,
      visitId: data.visitId || visitIdRef.current,
      phone: resolvedPhone,
      step: data.pageType,
    })

    // Sync URL step + msisdn so refresh / share keeps the number
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      if (nextParams.get('step') !== data.pageType) {
        nextParams.set('step', data.pageType)
      }
      if (resolvedPhone && !nextParams.get('msisdn')) {
        nextParams.set('msisdn', resolvedPhone)
      }
      return nextParams
    }, { replace: false })
  }, [saveSession, setSearchParams])

  const prefetchPages = useCallback(
    async (pages, visitId) => {
      if (!country || !operator || !visitId) return
      await Promise.all(
        pages.map(async (page) => {
          if (pageCacheRef.current.has(page) || prefetchingRef.current.has(page)) return
          prefetchingRef.current.add(page)
          const data = await prefetchFlowPage({
            country,
            operator,
            page,
            msisdn: phoneRef.current,
            visitId,
          })
          prefetchingRef.current.delete(page)
          if (data) pageCacheRef.current.set(data.pageType, data)
        }),
      )
    },
    [country, operator],
  )

  const loadPage = useCallback(
    async (page = 'HOME') => {
      if (!country || !operator) {
        setError('Missing country or operator in URL')
        setBooting(false)
        return
      }
      setError('')

      if (pageCacheRef.current.has(page)) {
        const cachedData = pageCacheRef.current.get(page)
        setPageData(cachedData)
        setBooting(false)
        return
      }

      try {
        const data = await fetchFlowPage({
          country,
          operator,
          page,
          msisdn: phoneRef.current,
          visitId: visitIdRef.current,
          campid,
          vid,
          affId,
          clickId,
        })
        cachePage(data)
      } catch (err) {
        setError(err.message || 'Failed to load page')
      } finally {
        setBooting(false)
      }
    },
    [country, operator, cachePage, campid, vid, affId, clickId],
  )

  useEffect(() => {
    const existing = document.querySelector('link[data-flow-font]')
    if (!existing) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = FLOW_FONT
      link.dataset.flowFont = 'true'
      document.head.appendChild(link)
    }
  }, [])

  // Restore step/session on load/refresh (Refresh Safe)
  useEffect(() => {
    if (phoneResolving) return
    let cancelled = false

    async function boot() {
      const savedSession = getSavedSession()
      const urlStep = searchParams.get('step')

      if (savedSession?.visitId) {
        visitIdRef.current = savedSession.visitId
        phoneRef.current = savedSession.phone || ''
        setPhone(savedSession.phone || '')
        setBooting(true)
        await loadPage(urlStep || savedSession.step || entryPageRef.current || 'HOME')
        return
      }

      selectedPackRef.current = 'daily'
      pageCacheRef.current.clear()
      prefetchingRef.current.clear()
      visitIdRef.current = null
      pageDataRef.current = null
      setPageData(null)
      setBooting(true)

      if (urlStep) {
        await loadPage(urlStep)
        return
      }

      try {
        const { entryPage } = await fetchFlowEntry({ country, operator, campid })
        if (cancelled) return
        entryPageRef.current = entryPage || 'HOME'
        await loadPage(entryPageRef.current)
      } catch {
        if (!cancelled) await loadPage('HOME')
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [country, operator, campid, phoneResolving, loadPage, getSavedSession, searchParams])

  // Sync step changes from browser history back/forward buttons
  useEffect(() => {
    if (phoneResolving || booting || !pageData) return
    const currentStep = pageData.pageType
    const urlStep = searchParams.get('step') || pageData.entryPage || entryPageRef.current || 'HOME'

    if (currentStep !== urlStep) {
      setBooting(true)
      loadPage(urlStep)
    }
  }, [searchParams, phoneResolving, booting, pageData, loadPage])

  // Track Page Views
  useEffect(() => {
    if (!pageData?.pageType) return
    if (pageData.pageType === 'CONFIRM') {
      trackEvent('confirm_loaded')
    } else if (pageData.pageType === 'THANKYOU') {
      trackEvent('success_loaded')
    }
  }, [pageData?.pageType])

  useEffect(() => {
    if (!pageData?.pageType || !visitIdRef.current) return
    const nextPages = PRELOAD_BY_PAGE[pageData.pageType] || []
    if (nextPages.length) prefetchPages(nextPages, visitIdRef.current)
  }, [pageData?.pageType, prefetchPages])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !pageData?.html) return undefined

    let shadow = host.shadowRoot
    if (!shadow) shadow = host.attachShadow({ mode: 'open' })
    mountPageInShadow(shadow, pageData)

    if (pageData.pageType === 'CONFIRM') {
      syncPackPicker(shadow, selectedPackRef.current)
      syncPhoneDisplay(shadow, phoneRef.current)
    }

    const handlePackClick = (event) => {
      if (pageDataRef.current?.pageType !== 'CONFIRM') return
      const packBtn = event.composedPath?.().find(
        (node) => node instanceof HTMLElement && node.hasAttribute('data-pack'),
      )
      if (!packBtn || transitionLockRef.current) return
      event.preventDefault()
      event.stopPropagation()
      const nextPack = normalizePack(packBtn.getAttribute('data-pack'))
      selectedPackRef.current = nextPack
      syncPackPicker(shadow, nextPack)
    }

    const handleClick = async (event) => {
      const hit = findActionTarget(event)
      if (!hit || !visitIdRef.current || transitionLockRef.current) return

      const { action } = hit
      event.preventDefault()

      const currentPage = pageDataRef.current
      const fromPage = currentPage?.pageType
      if (fromPage === 'OTP') {
        return
      }
      if (
        (fromPage === 'HOME' && action !== 'SUBSCRIBE') ||
        (fromPage === 'CONFIRM' && action !== 'CONFIRM')
      ) {
        return
      }

      transitionLockRef.current = true
      setTransitioning(true)
      setError('')

      // Avoid optimistic page swaps here.
      // Backend may decide OTP is required even when CONFIRM is prefetched, which causes
      // a brief CONFIRM->OTP flash. Better UX: keep current page + show progress until response.

      const planId = fromPage === 'CONFIRM' ? getSelectedPackFromShadow(shadow) : undefined

      try {
        const next = await transitionFlow({
          visitId: visitIdRef.current,
          country,
          operator,
          fromPage,
          action,
          phone: phoneRef.current,
          ...(planId ? { planId } : {}),
        })
        cachePage(next)
        if (next.pageType === 'CONFIRM') {
          selectedPackRef.current = 'daily'
        }
        if (fromPage === 'CONFIRM' && action === 'CONFIRM' && next.pageType === 'THANKYOU') {
          trackEvent('confirm_completed')
        }
      } catch (err) {
        setError(err.message || 'Action failed')
      } finally {
        setTransitioning(false)
        transitionLockRef.current = false
      }
    }

    let otpCleanup = null
    if (pageData.pageType === 'OTP') {
      otpCleanup = setupOtpBindings(shadow, {
        transitionFlow,
        cachePage,
        country,
        operator,
        visitIdRef,
        phoneRef,
        packRef: selectedPackRef,
        setPhone,
        setTransitioning,
        setError,
        pageCacheRef,
      })
    }

    shadow.addEventListener('click', handlePackClick)
    shadow.addEventListener('click', handleClick)
    return () => {
      shadow.removeEventListener('click', handlePackClick)
      shadow.removeEventListener('click', handleClick)
      if (otpCleanup) otpCleanup()
    }
  }, [pageData, country, operator, cachePage])

  if (!country || !operator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base p-6">
        <div className="text-center max-w-md">
          <h1 className="text-lg font-semibold text-fg mb-2">Invalid subscription URL</h1>
          <p className="text-sm text-fg-muted">
            Use: /subscription?country=India&amp;operator=Zain
          </p>
          <p className="text-xs text-fg-subtle mt-2">
            Phone and pack are handled on the subscription pages automatically.
          </p>
        </div>
      </div>
    )
  }

  if (phoneResolving || (booting && !pageData)) {
    return (
      <div className="flow-runtime-root min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#7C4DFF]/30 border-t-[#7C4DFF] animate-spin" />
          <p className="text-slate-500 text-sm">
            {phoneResolving ? 'Detecting mobile number...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (error && !pageData) {
    return (
      <div className="flow-runtime-root min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Unable to load</h1>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flow-runtime-root relative min-h-screen w-full">
      {transitioning && <div className="flow-runtime-progress" aria-hidden="true" />}
      {error && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-red-100 text-red-700 text-sm text-center py-2 px-4 animate-fade-in">
          {error}
        </div>
      )}
      <div ref={hostRef} className="flow-runtime-host is-visible" />
    </div>
  )
}

export default memo(SubscriptionPage)
