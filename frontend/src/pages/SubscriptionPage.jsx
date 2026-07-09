import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchFlowPage, prefetchFlowPage, transitionFlow } from '../services/api/flow'
import { resolvePhoneFromUrl, resolvePhoneNumber } from '../services/flow/resolvePhoneNumber'
import { getApiBase } from '../services/api/client'
import { sendOtp, verifyOtp } from '../services/api/otp'
import { trackEvent } from '../utils/analytics'
import { saveCampaignPage } from '../services/api/campaigns'
import { OTP_STARTER_TEMPLATES, CONFIRM_STARTER_TEMPLATES } from '../editor/templates/starterTemplates'


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

function getSelectedPackFromShadow(shadow) {
  const selected = shadow.querySelector('[data-pack].flow-pack-selected')
  return normalizePack(selected?.getAttribute('data-pack'))
}

function setupOtpBindings(shadow, { transitionFlow, cachePage, country, operator, visitIdRef, phoneRef, packRef, setPhone, setTransitioning, setError }) {
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

  // Inject Country Code selector dynamically if not present in shadow DOM
  let countryCodeSelect = shadow.querySelector('[data-otp-field="country-code"], select.country-code-select')
  if (phoneInput && !countryCodeSelect) {
    const container = document.createElement('div')
    container.className = 'country-code-container'
    container.style.display = 'inline-flex'
    container.style.alignItems = 'center'
    container.style.gap = '8px'
    container.style.width = '100%'
    container.style.marginBottom = '12px'

    countryCodeSelect = document.createElement('select')
    countryCodeSelect.className = 'country-code-select'
    countryCodeSelect.style.padding = '8px 8px'
    countryCodeSelect.style.width = '95px'
    countryCodeSelect.style.borderRadius = '8px'
    countryCodeSelect.style.border = '1px solid var(--border, #d1d5db)'
    countryCodeSelect.style.backgroundColor = 'var(--bg-elevated, #ffffff)'
    countryCodeSelect.style.color = 'var(--fg, #1f2937)'
    countryCodeSelect.style.fontSize = '14px'
    countryCodeSelect.style.fontWeight = '500'
    countryCodeSelect.style.cursor = 'pointer'

    const codes = [
      { code: '91', country: '🇮🇳 +91' },
      { code: '966', country: '🇸🇦 +966' },
      { code: '971', country: '🇦🇪 +971' },
      { code: '965', country: '🇰🇼 +965' },
      { code: '973', country: '🇧🇭 +973' },
      { code: '968', country: '🇴🇲 +968' },
    ]
    codes.forEach(c => {
      const opt = document.createElement('option')
      opt.value = c.code
      opt.textContent = c.country
      countryCodeSelect.appendChild(opt)
    })

    phoneInput.parentNode.insertBefore(container, phoneInput)
    container.appendChild(countryCodeSelect)
    container.appendChild(phoneInput)
    
    phoneInput.style.flex = '1'
    phoneInput.style.marginBottom = '0'
  }

  if (phoneInput && phoneRef.current) {
    const val = phoneRef.current
    if (val.length > 10) {
      const cc = val.substring(0, val.length - 10)
      const number = val.substring(val.length - 10)
      phoneInput.value = number
      if (countryCodeSelect) {
        countryCodeSelect.value = cc
      }
    } else {
      phoneInput.value = val
    }
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
    
    if (cleanBasePhone.length !== 10) {
      setSlotText(errorSlot, 'Please enter a valid 10-digit mobile number', true)
      return
    }

    const countryCode = countryCodeSelect ? countryCodeSelect.value : ''
    const msisdn = countryCode + cleanBasePhone
    
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
    const countryCode = countryCodeSelect ? countryCodeSelect.value : ''
    const msisdn = cleanBasePhone ? (countryCode + cleanBasePhone) : phoneRef.current
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

  const [isAdmin, setIsAdmin] = useState(false)
  const [showLayoutSelector, setShowLayoutSelector] = useState(false)
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('templatecraft_auth_token')
    if (token) {
      setIsAdmin(true)
    }
  }, [])

  const templates = useMemo(() => {
    if (!pageData) return []
    if (pageData.pageType === 'OTP') {
      return OTP_STARTER_TEMPLATES
    } else if (pageData.pageType === 'CONFIRM') {
      return CONFIRM_STARTER_TEMPLATES
    }
    return []
  }, [pageData])

  const handleApplyTemplate = async (template) => {
    if (!pageData?.campaignId || !pageData?.pageType) return
    setApplyingTemplate(true)
    try {
      await saveCampaignPage(pageData.campaignId, pageData.pageType, {
        html: template.html,
        css: template.css || '',
        projectData: {}
      })
      setShowLayoutSelector(false)
      window.location.reload()
    } catch (err) {
      alert(err.message || 'Failed to apply template')
    } finally {
      setApplyingTemplate(false)
    }
  }

  const hostRef = useRef(null)
  const visitIdRef = useRef(null)
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

  phoneRef.current = phone

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
      phoneRef.current = resolved
      setPhone(resolved)
      setPhoneResolving(false)

      const currentParams = new URLSearchParams(window.location.search)
      if (resolved && !resolvePhoneFromUrl(currentParams)) {
        currentParams.set('msisdn', resolved)
        setSearchParams(currentParams, { replace: true })
      }
    })

    return () => {
      cancelled = true
    }
  }, [country, operator, setSearchParams])

  const cachePage = useCallback((data) => {
    if (!data?.pageType) return
    pageCacheRef.current.set(data.pageType, data)
    if (data.visitId) visitIdRef.current = data.visitId
    pageDataRef.current = data
    setPageData(data)

    // Save session in sessionStorage
    const isVerified = (data.pageType === 'CONFIRM' || data.pageType === 'THANKYOU' || data.verified === true)
    saveSession({
      verificationStatus: isVerified ? 'verified' : 'unverified',
      flowId: data.campaignId,
      campaignId: data.campaignId,
      visitId: data.visitId || visitIdRef.current,
      phone: phoneRef.current,
      step: data.pageType,
    })

    // Sync URL step parameter without breaking history
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      if (nextParams.get('step') !== data.pageType) {
        nextParams.set('step', data.pageType)
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
    
    const savedSession = getSavedSession()
    if (savedSession && savedSession.visitId) {
      visitIdRef.current = savedSession.visitId
      phoneRef.current = savedSession.phone || ''
      setPhone(savedSession.phone || '')
      
      const targetStep = searchParams.get('step') || savedSession.step || 'HOME'
      setBooting(true)
      loadPage(targetStep)
    } else {
      selectedPackRef.current = 'daily'
      pageCacheRef.current.clear()
      prefetchingRef.current.clear()
      visitIdRef.current = null
      pageDataRef.current = null
      setPageData(null)
      setBooting(true)
      
      const targetStep = searchParams.get('step') || 'HOME'
      loadPage(targetStep)
    }
  }, [country, operator, phoneResolving, loadPage, getSavedSession])

  // Sync step changes from browser history back/forward buttons
  useEffect(() => {
    if (phoneResolving || booting || !pageData) return
    const currentStep = pageData.pageType
    const urlStep = searchParams.get('step') || 'HOME'

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

      {/* Floating Button for Admin to choose template */}
      {isAdmin && templates.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => setShowLayoutSelector(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all font-semibold text-sm border border-indigo-500/20 active:scale-95 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/></svg>
            Choose Template
          </button>
        </div>
      )}

      {/* Template Selector Modal */}
      {showLayoutSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">Change Page Template</h3>
                <p className="text-xs text-slate-500">Select a prebuilt style for {pageData?.pageType} page</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLayoutSelector(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={applyingTemplate}
                  onClick={() => handleApplyTemplate(tpl)}
                  className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50/20 active:bg-indigo-50/50 transition-all flex items-start gap-4 disabled:opacity-50 group cursor-pointer"
                >
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0 text-lg font-bold group-hover:bg-indigo-100 transition-colors">
                    🎨
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 group-hover:text-indigo-900 transition-colors">
                      {tpl.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={applyingTemplate}
                onClick={() => setShowLayoutSelector(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(SubscriptionPage)
