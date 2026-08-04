import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { detectMsisdnApi, fetchFlowEntry, fetchFlowPage, prefetchFlowPage, transitionFlow, priorityCheckApi } from '../services/api/flow'
import { resolvePhoneFromUrl, resolvePhoneNumber, persistPhone } from '../services/flow/resolvePhoneNumber'
import { evaluatePriorityApiMatch } from '../services/flow/priorityApiMatch'
import { getApiBase } from '../services/api/client'
import { sendOtp, verifyOtp } from '../services/api/otp'
import { trackEvent } from '../utils/analytics'


const FLOW_FONT =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'

/** Set VITE_FLOW_PAGE_CACHE=false to disable in-memory page prefetch/cache on live funnel. */
const FLOW_PAGE_CACHE_ENABLED =
  String(import.meta.env.VITE_FLOW_PAGE_CACHE ?? 'true').toLowerCase() !== 'false'

const VALID_PACKS = ['daily', 'weekly', 'monthly']
const VALID_PAGES = [
  'HOME',
  'OTP',
  'CONFIRM',
  'THANKYOU',
  'INPROGRESS',
  'LOW_BALANCE',
  'BLOCKED',
  'ERROR',
]

function pageForChecksubStatus(currentStatus) {
  const s = String(currentStatus || '')
    .trim()
    .toLowerCase()
  if (s === 'active') return 'THANKYOU'
  if (s === 'pending') return 'INPROGRESS'
  if (s === 'grace' || s === 'parking') return 'LOW_BALANCE'
  if (s && s !== 'new' && s !== 'unknown') return 'INPROGRESS'
  return null
}

/** Editor stores campaign page links as bare tokens (href="CONFIRM"), not full URLs. */
function isCampaignPageHref(href) {
  return VALID_PAGES.includes(String(href || '').trim().toUpperCase())
}

const FLOW_SHADOW_STYLES = `
  :host { display: block; width: 100%; min-height: 100vh; }
  body, .flow-page-inner > div {
    width: 100%;
    min-height: 100vh;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .flow-page-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin: 0 auto;
    opacity: 1;
  }
  .flow-page-inner > * {
    max-width: 100%;
  }
  .flow-pack-option.flow-pack-selected {
    border-color: #7c4dff !important;
    background: #f5f3ff !important;
    box-shadow: 0 0 0 1px #7c4dff;
  }
`

const PRELOAD_BY_PAGE = {
  HOME: ['CONFIRM', 'THANKYOU', 'INPROGRESS', 'LOW_BALANCE', 'ERROR', 'BLOCKED'],
  CONFIRM: ['THANKYOU', 'INPROGRESS', 'LOW_BALANCE', 'ERROR', 'BLOCKED'],
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
    if (!node.matches('[data-action], [data-actions], button, a')) continue
    const action =
      node.getAttribute('data-action') ||
      (node.hasAttribute('data-actions') ? 'CHAIN' : null) ||
      (node.textContent?.toLowerCase().includes('confirm') ? 'CONFIRM' : null) ||
      (node.textContent?.toLowerCase().includes('subscribe') ? 'SUBSCRIBE' : null)
    if (action) return { node, action }
  }
  return null
}

function mountPageInShadow(shadow, pageData) {
  const { customWidth, customHeight } = pageData.projectData || {}
  
  let inlineStyles = ''
  if (customWidth) {
    inlineStyles += `width: ${customWidth}px; max-width: ${customWidth}px; `
  }
  if (customHeight) {
    inlineStyles += `height: ${customHeight}px; min-height: ${customHeight}px; overflow: hidden; position: relative; `
  }

  // Transform <body> tag to <div> to avoid invalid nested <body> inside Shadow DOM,
  // which browser parsers often collapse or strip.
  let cleanedHtml = pageData.html || ''
  if (cleanedHtml.trim().toLowerCase().startsWith('<body')) {
    cleanedHtml = cleanedHtml.replace(/^<body/i, '<div').replace(/<\/body>$/i, '</div>')
  }

  const cleanCss = (pageData.css || '').replace(/#wrapper\s*/gi, '')

  shadow.innerHTML = `
    <style>${FLOW_SHADOW_STYLES}</style>
    <style>${cleanCss}</style>
    <div class="flow-page-inner" id="wrapper" style="${inlineStyles}">${cleanedHtml}</div>
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

function setupOtpBindings(shadow, { transitionFlow, cachePage, country, operator, campid, visitIdRef, phoneRef, packRef, setPhone, setTransitioning, setError, pageCacheRef }) {
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
          campid: campid || undefined,
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
  // Incoming affiliate click may arrive as click_id or rcid; after first /flow/page
  // response, click_id becomes ours and rcid stays the affiliate original.
  const campid = searchParams.get('campid') || ''
  const vid = searchParams.get('vid') || ''
  const affId = searchParams.get('aff_id') || ''
  const urlRcid = searchParams.get('rcid') || ''
  const urlClickId = searchParams.get('click_id') || ''

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
  const loadGenerationRef = useRef(0)
  // Our click_id is empty until /flow/page returns it; affiliate seed goes in rcid.
  const clickIdRef = useRef('')
  const rcidRef = useRef(urlRcid || urlClickId || '')
  const vidRef = useRef(vid)
  const affIdRef = useRef(affId)
  const campidRef = useRef(campid)

  useEffect(() => {
    if (urlRcid) rcidRef.current = urlRcid
    else if (urlClickId && !rcidRef.current) rcidRef.current = urlClickId
    // After backend issues our click_id, URL click_id !== rcid — keep it.
    if (urlClickId && urlClickId !== rcidRef.current) {
      clickIdRef.current = urlClickId
    }
    if (vid) vidRef.current = vid
    if (affId) affIdRef.current = affId
    if (campid) campidRef.current = campid
  }, [urlClickId, urlRcid, vid, affId, campid])

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

    // TEMP: always hit detect-msisdn so HE headers show in console even when
    // URL/storage already has a phone (resolvePhoneNumber would otherwise skip the API).
    console.log('[HE DEBUG] SubscriptionPage mount — forcing detect-msisdn for header dump', {
      country,
      operator,
      campid,
      href: window.location.href,
    })
    detectMsisdnApi({ country, operator, campid }).catch(() => {})

    const resolveWithTimeout = Promise.race([
      resolvePhoneNumber(new URLSearchParams(window.location.search), {
        country,
        operator,
        campid,
      }),
      // Never block the funnel on a hanging HE / detect call.
      new Promise((resolve) => {
        setTimeout(() => resolve({ phone: '', source: 'timeout' }), 4000)
      }),
    ])

    resolveWithTimeout
      .then(({ phone: resolved }) => {
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
      })
      .catch(() => {
        /* detection is best-effort — continue without MSISDN */
      })
      .finally(() => {
        if (!cancelled) setPhoneResolving(false)
      })

    return () => {
      cancelled = true
    }
    // setSearchParams omitted from deps on purpose — including it re-runs detection
    // on every URL step sync and covers the page with the detecting overlay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, operator, campid])

  const cachePage = useCallback((data) => {
    if (!data?.pageType) return
    if (data.entryPage) entryPageRef.current = data.entryPage
    pageCacheRef.current.set(data.pageType, data)
    if (data.visitId) visitIdRef.current = data.visitId
    pageDataRef.current = data
    setPageData(data)

    // Backend dual IDs: our clickId + affiliate rcid (stable for the visit).
    if (data.clickId) clickIdRef.current = String(data.clickId)
    if (data.rcid) rcidRef.current = String(data.rcid)

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
      clickId: clickIdRef.current || undefined,
      rcid: rcidRef.current || undefined,
    })

    // Sync URL step + msisdn + dual click attribution params.
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      let changed = false
      if (nextParams.get('step') !== data.pageType) {
        nextParams.set('step', data.pageType)
        changed = true
      }
      if (resolvedPhone && !nextParams.get('msisdn')) {
        nextParams.set('msisdn', resolvedPhone)
        changed = true
      }
      const cid = clickIdRef.current
      const rid = rcidRef.current
      const v = vidRef.current
      const a = affIdRef.current
      const c = campidRef.current
      if (cid && nextParams.get('click_id') !== cid) {
        nextParams.set('click_id', cid)
        changed = true
      }
      if (rid && nextParams.get('rcid') !== rid) {
        nextParams.set('rcid', rid)
        changed = true
      }
      if (v && nextParams.get('vid') !== v) {
        nextParams.set('vid', v)
        changed = true
      }
      if (a && nextParams.get('aff_id') !== a) {
        nextParams.set('aff_id', a)
        changed = true
      }
      if (c && nextParams.get('campid') !== c) {
        nextParams.set('campid', c)
        changed = true
      }
      return changed ? nextParams : prev
    }, { replace: true })
  }, [saveSession, setSearchParams])

  // Null-flow CG: backend sends externalRedirect with click_id → leave immediately
  useEffect(() => {
    const dest = pageData?.externalRedirect
    if (dest && /^https?:\/\//i.test(dest)) {
      window.location.assign(dest)
    }
  }, [pageData?.externalRedirect])

  // THANKYOU → optional success/content portal (show page first, then redirect)
  useEffect(() => {
    if (pageData?.pageType !== 'THANKYOU') return undefined
    const dest = pageData?.successRedirect
    if (!dest || !/^https?:\/\//i.test(dest)) return undefined
    const timer = window.setTimeout(() => {
      window.location.assign(dest)
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [pageData?.pageType, pageData?.successRedirect])

  const prefetchPages = useCallback(
    async (pages, visitId) => {
      if (!FLOW_PAGE_CACHE_ENABLED) return
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
            campid,
            vid,
            affId,
            clickId: clickIdRef.current || undefined,
            rcid: rcidRef.current || undefined,
          })
          prefetchingRef.current.delete(page)
          // Only cache if backend returned the page we asked for (guards may rewrite CONFIRM→OTP).
          if (data?.pageType === page) {
            pageCacheRef.current.set(page, data)
          } else if (data?.pageType && !pageCacheRef.current.has(data.pageType)) {
            pageCacheRef.current.set(data.pageType, data)
          }
        }),
      )
    },
    [country, operator, campid, vid, affId],
  )

  const loadPage = useCallback(
    async (page = 'HOME', options = {}) => {
      const requested = String(page || 'HOME').trim().toUpperCase() || 'HOME'
      if (!country || !operator) {
        setError('Missing country or operator in URL')
        setBooting(false)
        return
      }
      setError('')
      const generation = ++loadGenerationRef.current

      // Direct page-link navigations must not reuse a guarded/prefetch rewrite cache.
      if (
        FLOW_PAGE_CACHE_ENABLED &&
        !options.direct &&
        pageCacheRef.current.has(requested)
      ) {
        const cachedData = pageCacheRef.current.get(requested)
        if (generation !== loadGenerationRef.current) return
        pageDataRef.current = cachedData
        setPageData(cachedData)
        setBooting(false)
        return
      }

      try {
        const data = await fetchFlowPage({
          country,
          operator,
          page: requested,
          msisdn: phoneRef.current,
          visitId: visitIdRef.current,
          campid,
          vid,
          affId,
          clickId: clickIdRef.current || undefined,
          rcid: rcidRef.current || undefined,
          direct: Boolean(options.direct),
        })
        if (generation !== loadGenerationRef.current) return
        // Backend may rewrite requested page (e.g. CONFIRM → OTP) unless direct=1.
        cachePage(data)
      } catch (err) {
        if (generation !== loadGenerationRef.current) return
        setError(err.message || 'Failed to load page')
      } finally {
        if (generation === loadGenerationRef.current) {
          setBooting(false)
        }
      }
    },
    [country, operator, cachePage, campid, vid, affId],
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

  // Boot once per market/campaign after phone detection settles.
  // Do NOT depend on searchParams — cachePage updates step/msisdn and would re-boot in a loop.
  useEffect(() => {
    if (phoneResolving) return
    let cancelled = false

    async function boot() {
      const savedSession = getSavedSession()
      const urlStep = new URLSearchParams(window.location.search).get('step')

      if (savedSession?.visitId) {
        visitIdRef.current = savedSession.visitId
        if (savedSession.phone) {
          phoneRef.current = savedSession.phone
          setPhone(savedSession.phone)
        }
        setBooting(true)
        if (!cancelled) {
          await loadPage(urlStep || savedSession.step || entryPageRef.current || 'HOME')
        }
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
        if (!cancelled) await loadPage(urlStep)
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
  }, [country, operator, campid, phoneResolving, loadPage, getSavedSession])

  // Sync step changes from browser history / page-link navigation.
  const urlStep = (searchParams.get('step') || '').toUpperCase()
  useEffect(() => {
    if (phoneResolving || booting || !pageData) return
    if (!urlStep) return
    if (String(pageData.pageType || '').toUpperCase() === urlStep) return
    // Ignore while a transition is in flight — cachePage will align URL + page together.
    if (transitionLockRef.current) return
    setBooting(true)
    loadPage(urlStep)
  }, [urlStep, phoneResolving, booting, pageData, loadPage])

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

    const handleAnchorClick = (event) => {
      const path = event.composedPath?.() || []
      const anchor = path.find((node) => node instanceof HTMLAnchorElement)
      if (!anchor) return
      // Flow hotspots use href="#" + data-action — let handleClick own those.
      if (anchor.getAttribute('data-action') || anchor.hasAttribute('data-actions')) return

      const href = (anchor.getAttribute('href') || '').trim()
      if (!href) return

      // Page tokens like href="CONFIRM" must load that campaign page directly.
      // Without direct=1 the flow guard rewrites CONFIRM→HOME when MSISDN is missing,
      // which flashes ?step=CONFIRM then bounces back to HOME.
      if (isCampaignPageHref(href)) {
        event.preventDefault()
        event.stopPropagation()
        if (transitionLockRef.current) return
        const targetPage = href.toUpperCase()
        if (String(pageDataRef.current?.pageType || '').toUpperCase() === targetPage) return

        transitionLockRef.current = true
        setTransitioning(true)
        setError('')
        loadPage(targetPage, { direct: true }).finally(() => {
          setTransitioning(false)
          transitionLockRef.current = false
        })
        return
      }

      if (!href.startsWith('#') || href === '#') return

      event.preventDefault()
      const targetId = decodeURIComponent(href.slice(1))
      const targetEl = shadow.getElementById(targetId)
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    const handleClick = async (event) => {
      const hit = findActionTarget(event)
      if (!hit || !visitIdRef.current || transitionLockRef.current) return

      const { action, node } = hit

      // Handle Sequential Action Chain (Priority Flow)
      if (action === 'CHAIN' || node.hasAttribute('data-actions')) {
        event.preventDefault()
        let actions = []
        try {
          actions = JSON.parse(node.getAttribute('data-actions') || '[]')
        } catch (e) {
          console.error('[Priority Chain] FAIL — Invalid data-actions JSON:', e)
        }

        if (actions.length > 0) {
          console.groupCollapsed(
            `%c[Priority Chain] START — ${actions.length} step(s)`,
            'color:#6366f1;font-weight:bold',
          )
          console.log('Button label:', (node.textContent || '').trim().slice(0, 80) || '(no label)')
          console.table(
            actions.map((s, idx) => ({
              priority: idx + 1,
              type: s.type,
              url: s.url || '',
              page: s.page || '',
              section: s.section || '',
            })),
          )

          transitionLockRef.current = true
          setTransitioning(true)
          setError('')

          let chainOutcome = 'NO_MATCH'
          try {
            for (let i = 0; i < actions.length; i++) {
              const step = actions[i]
              const tag = `Priority ${i + 1} (${step.type})`
              if (step.type === 'api') {
                const rawUrl = (step.url || '').trim()
                const isInvalidUrl = !rawUrl || rawUrl === 'https://' || rawUrl === 'http://' || rawUrl === 'https:///' || rawUrl === 'http:///'
                if (isInvalidUrl) {
                  console.error(`[Priority Chain] ${tag} FAIL — API URL missing/incomplete:`, rawUrl || '(empty)')
                  throw new Error(`Priority ${i + 1} Error: API URL is missing or incomplete ("${rawUrl || ''}")`)
                }

                // Check for invalid URL format
                const tempUrl = rawUrl.replace(/\{\{[^}]+\}\}/g, 'placeholder')
                if (!tempUrl.startsWith('/')) {
                  try {
                    const parsed = new URL(tempUrl)
                    if (!parsed.hostname) {
                      console.error(`[Priority Chain] ${tag} FAIL — API URL host missing:`, rawUrl)
                      throw new Error(`Priority ${i + 1} Error: API URL host is missing ("${rawUrl}")`)
                    }
                  } catch (e) {
                    if (e.message?.startsWith('Priority ')) throw e
                    console.error(`[Priority Chain] ${tag} FAIL — Invalid API URL format:`, rawUrl)
                    throw new Error(`Priority ${i + 1} Error: Invalid API URL format ("${rawUrl}")`)
                  }
                }

                // If phone is missing, we cannot check subscription status yet — proceed to Priority 2 (OTP/CONFIRM page)
                if ((rawUrl.includes('{{msisdn}}') || rawUrl.includes('{{phone}}')) && !phoneRef.current) {
                  console.warn(`[Priority Chain] ${tag} SKIP — phone/msisdn not available yet → next step`)
                  continue
                }

                const formattedUrl = rawUrl
                  .replace(/\{\{msisdn\}\}/gi, phoneRef.current || '')
                  .replace(/\{\{phone\}\}/gi, phoneRef.current || '')
                  .replace(/\{\{country\}\}/gi, country || '')
                  .replace(/\{\{operator\}\}/gi, operator || '')

                console.log(`[Priority Chain] ${tag} calling:`, formattedUrl)

                const navigateChainPage = async (targetPage, reason) => {
                  console.log(
                    `%c[Priority Chain] ${tag} PASS — ${reason} → ${targetPage}`,
                    'color:#16a34a;font-weight:bold',
                  )
                  chainOutcome = `PASS_${targetPage}`
                  saveSession({
                    verificationStatus: 'verified',
                    visitId: visitIdRef.current,
                    phone: phoneRef.current,
                    step: targetPage,
                  })
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('step', targetPage)
                    return next
                  })
                  await loadPage(targetPage, { direct: true })
                }

                const redirectExternal = (rawUrl, reason) => {
                  const dest = String(rawUrl || '').trim()
                  if (!dest || dest === 'https://' || dest === 'http://') {
                    console.warn(`[Priority Chain] ${tag} ${reason} — external URL missing`)
                    return false
                  }
                  const resolved = dest
                    .replace(/\{\{msisdn\}\}/gi, phoneRef.current || '')
                    .replace(/\{\{phone\}\}/gi, phoneRef.current || '')
                    .replace(/\{\{country\}\}/gi, country || '')
                    .replace(/\{\{operator\}\}/gi, operator || '')
                  console.log(
                    `%c[Priority Chain] ${tag} PASS — ${reason} → external ${resolved}`,
                    'color:#16a34a;font-weight:bold',
                  )
                  chainOutcome = 'PASS_EXTERNAL'
                  window.location.assign(resolved)
                  return true
                }

                const goConfiguredOrContinue = async (action, page, reason, externalUrl = '') => {
                  if (action === 'external') {
                    return redirectExternal(externalUrl, reason)
                  }
                  if (action === 'page') {
                    const configured = String(page || '')
                      .trim()
                      .toUpperCase()
                    if (VALID_PAGES.includes(configured)) {
                      await navigateChainPage(configured, reason)
                      return true
                    }
                    console.warn(
                      `[Priority Chain] ${tag} ${reason} — invalid page:`,
                      page,
                      '→ next step',
                    )
                  }
                  return false
                }

                // Absolute http(s) URLs go through backend proxy (browser CORS blocks partner APIs).
                // Relative /api paths still use same-origin fetch.
                let resOk = false
                let json = null
                let fetchFailed = false
                let fetchError = null
                const isAbsoluteHttp =
                  formattedUrl.startsWith('http://') || formattedUrl.startsWith('https://')

                try {
                  if (isAbsoluteHttp) {
                    const proxied = await priorityCheckApi(formattedUrl)
                    resOk = Boolean(proxied?.ok)
                    json = proxied?.body ?? null
                    if (!resOk) {
                      fetchFailed = true
                      fetchError = proxied?.error || `HTTP ${proxied?.status || 0}`
                    }
                    console.log(`[Priority Chain] ${tag} proxy result:`, {
                      ok: resOk,
                      status: proxied?.status,
                      body: json,
                    })
                  } else {
                    let res = null
                    try {
                      res = await fetch(formattedUrl, { method: 'GET', mode: 'cors' })
                    } catch (err) {
                      fetchFailed = true
                      fetchError = err
                    }
                    if (fetchFailed || !res || !res.ok) {
                      fetchFailed = true
                      if (!fetchError) {
                        fetchError = { status: res?.status, statusText: res?.statusText }
                      }
                    } else {
                      resOk = true
                      json = await res.json().catch(() => null)
                    }
                  }
                } catch (err) {
                  fetchFailed = true
                  fetchError = err
                }

                if (fetchFailed || !resOk) {
                  console.warn(
                    `[Priority Chain] ${tag} FAIL (network/CORS/HTTP)`,
                    fetchError,
                  )
                  const navigated = await goConfiguredOrContinue(
                    step.failAction,
                    step.failPage,
                    'API fail → configured destination',
                    step.failUrl,
                  )
                  if (navigated) break
                  console.warn(`[Priority Chain] ${tag} → next step`)
                  continue
                }

                if (json) {
                  if (json.responseCode === '500') {
                    console.error(
                      `[Priority Chain] ${tag} FAIL — engine error:`,
                      json.responseMessage || json,
                    )
                    const navigated = await goConfiguredOrContinue(
                      step.failAction,
                      step.failPage,
                      'engine error → configured destination',
                      step.failUrl,
                    )
                    if (navigated) break
                    throw new Error(
                      `Priority ${i + 1} Check Failed: ${json.responseMessage || 'Engine error'}`,
                    )
                  }

                  const matchResult = evaluatePriorityApiMatch(json, step)
                  const shouldSkipSubscribe = matchResult.matched

                  console.log(`[Priority Chain] ${tag} response:`, {
                    matchMode: matchResult.mode,
                    successKey: matchResult.key || step.successKey || '',
                    successValue: step.successValue ?? '',
                    rules: step.rules || [],
                    actual: matchResult.actual,
                    matched: shouldSkipSubscribe,
                    matchedGo: matchResult.go || 'page',
                    matchedPage: matchResult.page || '',
                    matchedUrl: matchResult.url || '',
                    currentStatus: matchResult.currentStatus || '',
                    matchPage: step.matchPage || '',
                    missAction: step.missAction || 'continue',
                    missPage: step.missPage || '',
                    missUrl: step.missUrl || '',
                    failAction: step.failAction || 'continue',
                    failPage: step.failPage || '',
                    failUrl: step.failUrl || '',
                    responseCode: json.responseCode,
                    body: json,
                  })

                  if (shouldSkipSubscribe) {
                    if (matchResult.go === 'external') {
                      if (
                        redirectExternal(
                          matchResult.url,
                          `rule ${matchResult.key}=${matchResult.actual}`,
                        )
                      ) {
                        break
                      }
                    } else {
                      const fromRule = String(matchResult.page || '')
                        .trim()
                        .toUpperCase()
                      const configuredMatch = String(step.matchPage || '')
                        .trim()
                        .toUpperCase()
                      const targetPage = VALID_PAGES.includes(fromRule)
                        ? fromRule
                        : VALID_PAGES.includes(configuredMatch)
                          ? configuredMatch
                          : pageForChecksubStatus(matchResult.currentStatus) || 'THANKYOU'
                      await navigateChainPage(
                        targetPage,
                        matchResult.mode === 'rules' || matchResult.mode === 'rule'
                          ? `rule ${matchResult.key}=${matchResult.actual}`
                          : `status=${matchResult.currentStatus || 'active'} (legacy)`,
                      )
                      break
                    }
                  }

                  // Success rule did not match
                  const missNavigated = await goConfiguredOrContinue(
                    step.missAction,
                    step.missPage,
                    'rule fail → configured destination',
                    step.missUrl,
                  )
                  if (missNavigated) break

                  // continue → next priority step. If this is the LAST step, nowhere to go:
                  // use fail destination when configured.
                  const isLastStep = i === actions.length - 1
                  if (isLastStep) {
                    const fallbackNavigated = await goConfiguredOrContinue(
                      step.failAction === 'page' || step.failAction === 'external'
                        ? step.failAction
                        : step.missAction,
                      step.failAction === 'page' || step.failAction === 'external'
                        ? step.failPage
                        : step.missPage,
                      'rule fail + no next step → fallback',
                      step.failAction === 'external'
                        ? step.failUrl
                        : step.missAction === 'external'
                          ? step.missUrl
                          : '',
                    )
                    if (fallbackNavigated) break
                    console.warn(
                      `[Priority Chain] ${tag} FAIL — no match, no next step, no fallback page`,
                    )
                  } else {
                    console.warn(`[Priority Chain] ${tag} FAIL — no match → next step`)
                  }
                } else {
                  console.warn(`[Priority Chain] ${tag} FAIL — empty/invalid JSON`)
                  const navigated = await goConfiguredOrContinue(
                    step.failAction,
                    step.failPage,
                    'invalid JSON → configured destination',
                    step.failUrl,
                  )
                  if (navigated) break
                  console.warn(`[Priority Chain] ${tag} → next step`)
                }
              } else if (step.type === 'page') {
                const targetPage = (step.page || '').toUpperCase()
                if (VALID_PAGES.includes(targetPage)) {
                  console.log(
                    `%c[Priority Chain] ${tag} PASS — navigate to ${targetPage}`,
                    'color:#16a34a;font-weight:bold',
                  )
                  chainOutcome = `PASS_PAGE_${targetPage}`
                  if (targetPage === 'THANKYOU' || targetPage === 'CONFIRM') {
                    saveSession({
                      verificationStatus: 'verified',
                      visitId: visitIdRef.current,
                      phone: phoneRef.current,
                      step: targetPage,
                    })
                  }
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('step', targetPage)
                    return next
                  })
                  await loadPage(targetPage, { direct: true })
                  break
                }
                console.error(`[Priority Chain] ${tag} FAIL — invalid page:`, step.page)
              } else if (step.type === 'flow') {
                console.log(
                  `%c[Priority Chain] ${tag} PASS — continue HE / OTP verification flow`,
                  'color:#16a34a;font-weight:bold',
                )
                chainOutcome = 'PASS_FLOW'
                const fromPage = pageDataRef.current?.pageType
                const next = await transitionFlow({
                  visitId: visitIdRef.current,
                  country,
                  operator,
                  fromPage: fromPage || 'HOME',
                  action: 'SUBSCRIBE',
                  phone: phoneRef.current,
                })
                cachePage(next)
                break
              } else if (step.type === 'anchor') {
                const targetId = step.section
                if (targetId) {
                  const targetEl = shadow.getElementById(targetId)
                  if (targetEl) {
                    console.log(
                      `%c[Priority Chain] ${tag} PASS — scroll to #${targetId}`,
                      'color:#16a34a;font-weight:bold',
                    )
                    chainOutcome = `PASS_ANCHOR_${targetId}`
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  } else {
                    console.warn(`[Priority Chain] ${tag} FAIL — section #${targetId} not found`)
                  }
                } else {
                  console.warn(`[Priority Chain] ${tag} FAIL — no section id`)
                }
              } else if (step.type === 'external') {
                if (step.url) {
                  console.log(
                    `%c[Priority Chain] ${tag} PASS — redirect to ${step.url}`,
                    'color:#16a34a;font-weight:bold',
                  )
                  chainOutcome = 'PASS_EXTERNAL'
                  window.open(step.url, node.getAttribute('target') || '_self')
                } else {
                  console.error(`[Priority Chain] ${tag} FAIL — external URL missing`)
                }
                break
              } else {
                console.warn(`[Priority Chain] ${tag} SKIP — unknown type:`, step.type)
              }
            }
            if (chainOutcome === 'NO_MATCH') {
              console.warn('[Priority Chain] END — no step completed navigation (all API checks failed / skipped)')
            } else {
              console.log(
                `%c[Priority Chain] END — ${chainOutcome}`,
                'color:#16a34a;font-weight:bold',
              )
            }
          } catch (err) {
            console.error('%c[Priority Chain] FAIL — chain aborted', 'color:#dc2626;font-weight:bold', err)
            setError(err.message || 'Action chain execution failed')
          } finally {
            console.groupEnd()
            setTransitioning(false)
            transitionLockRef.current = false
          }
          return
        }
      }

      // External / page links without a flow action should navigate normally.
      if (!node.getAttribute('data-action') && node.matches?.('a[href]')) {
        const href = (node.getAttribute('href') || '').trim()
        const targetPage = href.toUpperCase()

        if (VALID_PAGES.includes(targetPage)) {
          event.preventDefault()
          if (String(pageDataRef.current?.pageType || '').toUpperCase() === targetPage) return
          transitionLockRef.current = true
          setTransitioning(true)
          setError('')
          try {
            await loadPage(targetPage, { direct: true })
          } finally {
            setTransitioning(false)
            transitionLockRef.current = false
          }
          return
        }

        if (href && href !== '#' && !href.startsWith('#')) return
      }
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
          campid: campid || campidRef.current || undefined,
          fromPage,
          action,
          phone: phoneRef.current,
          clickId: clickIdRef.current || undefined,
          rcid: rcidRef.current || undefined,
          vid: vidRef.current || undefined,
          affId: affIdRef.current || undefined,
          ...(planId ? { planId } : {}),
        })
        cachePage(next)
        if (next.pageType === 'CONFIRM') {
          selectedPackRef.current = 'daily'
        }
        if (fromPage === 'CONFIRM' && action === 'CONFIRM' && next.pageType === 'THANKYOU') {
          trackEvent('confirm_completed')
        }
        if (next.externalRedirect && /^https?:\/\//i.test(next.externalRedirect)) {
          window.location.assign(next.externalRedirect)
          return
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
        campid,
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
    shadow.addEventListener('click', handleAnchorClick)
    return () => {
      shadow.removeEventListener('click', handlePackClick)
      shadow.removeEventListener('click', handleClick)
      shadow.removeEventListener('click', handleAnchorClick)
      if (otpCleanup) otpCleanup()
    }
  }, [pageData, country, operator, campid, cachePage, loadPage, setSearchParams])

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

  const showBootSpinner = (phoneResolving || booting) && !pageData
  const showFatalError = Boolean(error && !pageData && !showBootSpinner)
  const notAvailable =
    showFatalError &&
    (/not available|not active|inactive/i.test(error) || error === 'This offer is not available')

  // Keep the shadow host mounted across loading states. Unmounting it and remounting
  // with the same pageData skips the mount effect → permanent blank white page.
  return (
    <div className="flow-runtime-root relative min-h-screen w-full">
      {transitioning && <div className="flow-runtime-progress" aria-hidden="true" />}
      {error && pageData && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-red-100 text-red-700 text-sm text-center py-2 px-4 animate-fade-in">
          {error}
        </div>
      )}
      {showBootSpinner && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#f8fafc]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-[#7C4DFF]/30 border-t-[#7C4DFF] animate-spin" />
            <p className="text-slate-500 text-sm">
              {phoneResolving ? 'Detecting mobile number...' : 'Loading...'}
            </p>
          </div>
        </div>
      )}
      {showFatalError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-50">
          <div className="text-center max-w-md bg-white border border-slate-200 rounded-2xl px-8 py-10 shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              {notAvailable ? '🚫' : '⚠️'}
            </div>
            <h1 className="text-lg font-semibold text-slate-900 mb-2">
              {notAvailable ? 'Not available' : 'Unable to load'}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {notAvailable
                ? 'This offer is currently not available. Please try again later or contact your provider.'
                : error}
            </p>
          </div>
        </div>
      )}
      <div
        ref={hostRef}
        className="flow-runtime-host is-visible"
        aria-hidden={showBootSpinner || showFatalError || !pageData?.html}
      />
    </div>
  )
}

export default memo(SubscriptionPage)
