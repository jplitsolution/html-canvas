/**
 * Public /subscription runtime shell.
 *
 * Lifecycle: useHeDetect (Layer A) → useFlowPages boot HOME/status →
 * useShadowInteractions for button clicks (Layer B via /transition, or Layer C
 * canvas jumps / Priority Chain). File map: docs/FLOW-ARCHITECTURE.md §0–§8.
 */
import { memo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SubscriptionOverlays from './SubscriptionOverlays'
import { isHeSuppressedFunnelPage } from './flowHelpers'
import { useFlowPages } from './useFlowPages'
import { useFlowSession } from './useFlowSession'
import { useHeDetect } from './useHeDetect'
import { useShadowInteractions } from './useShadowInteractions'

function deriveOverlayFlags({
  phoneResolving,
  heExitPending,
  heFunnelSuppressed,
  pageData,
  booting,
  error,
}) {
  const hideHomeForHe =
    phoneResolving ||
    heExitPending ||
    (heFunnelSuppressed &&
      (!pageData || isHeSuppressedFunnelPage(pageData?.pageType)))
  const showBootSpinner = (booting && !pageData) || hideHomeForHe
  const showFatalError = Boolean(error && !pageData && !hideHomeForHe && !(booting && !pageData))
  const notAvailable =
    showFatalError &&
    (/not available|not active|inactive/i.test(error) || error === 'This offer is not available')

  return { hideHomeForHe, showBootSpinner, showFatalError, notAvailable }
}

function SubscriptionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const country = searchParams.get('country') || ''
  const operator = searchParams.get('operator') || ''
  // Dual campaign ids:
  // - campid = vendor/network (postback {campid})
  // - tracking_campid = ours (BF-OBF-11) for resolve
  // Legacy: only campid that looks like our tracking id → treat as tracking.
  const urlCampidRaw = searchParams.get('campid') || ''
  const urlTrackingRaw =
    searchParams.get('tracking_campid') || searchParams.get('trackingCampid') || ''
  const looksLikeOurs =
    /^[A-Z0-9]+-[A-Z0-9]+-\d+$/i.test(urlCampidRaw.trim()) ||
    /^\d+$/.test(urlCampidRaw.trim())
  let trackingCampid = urlTrackingRaw
  let campid = urlCampidRaw
  if (!trackingCampid && looksLikeOurs) {
    trackingCampid = urlCampidRaw
    campid = ''
  }
  const vid = searchParams.get('vid') || ''
  const affId = searchParams.get('aff_id') || ''
  const urlRcid = searchParams.get('rcid') || ''
  const urlClickId = searchParams.get('click_id') || ''

  const [phone, setPhone] = useState('')
  const [phoneResolving, setPhoneResolving] = useState(true)
  /** When successRedirectUrl is set — keep overlay, never flash HOME. */
  const [heExitPending, setHeExitPending] = useState(false)
  /** API HE — block internal HOME/OTP; overlay until external redirect. */
  const [heFunnelSuppressed, setHeFunnelSuppressed] = useState(false)
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
  const phoneResolvingRef = useRef(true)
  const heExitPendingRef = useRef(false)
  const heMetaRef = useRef({
    done: false,
    heProvider: null,
    heError: null,
    failRedirectUrl: null,
    successRedirectUrl: null,
    cgRedirectUrl: null,
    nextPage: null,
    blocked: false,
    blockReason: null,
    subscriptionStatus: null,
    isActive: false,
  })
  const loadPageRef = useRef(null)
  const detectKeyRef = useRef('')
  const detectInFlightRef = useRef(false)
  const heDetectSettledRef = useRef(false)
  const heOnlyModeRef = useRef(false)
  const loadGenerationRef = useRef(0)
  // Our click_id is empty until detect-msisdn /flow/page returns it; affiliate seed goes in rcid.
  const clickIdRef = useRef('')
  const rcidRef = useRef(urlRcid || urlClickId || '')
  const vidRef = useRef(vid)
  const affIdRef = useRef(affId)
  const campidRef = useRef(campid)
  const trackingCampidRef = useRef(trackingCampid)

  const { getSavedSession, saveSession } = useFlowSession({
    country,
    operator,
    campid,
    trackingCampid,
    urlRcid,
    urlClickId,
    vid,
    affId,
    phone,
    phoneRef,
    rcidRef,
    clickIdRef,
    vidRef,
    affIdRef,
    campidRef,
    trackingCampidRef,
  })

  const { warnIfHeUnresolved } = useHeDetect({
    country,
    operator,
    campid,
    trackingCampid,
    vid,
    setSearchParams,
    setPhone,
    setPhoneResolving,
    setHeExitPending,
    setHeFunnelSuppressed,
    setError,
    phoneResolvingRef,
    heExitPendingRef,
    heMetaRef,
    heOnlyModeRef,
    heDetectSettledRef,
    detectKeyRef,
    detectInFlightRef,
    visitIdRef,
    clickIdRef,
    rcidRef,
    phoneRef,
    campidRef,
    trackingCampidRef,
    loadPageRef,
    vidRef,
  })

  const { cachePage, loadPage } = useFlowPages({
    country,
    operator,
    campid,
    trackingCampid,
    vid,
    affId,
    searchParams,
    setSearchParams,
    setPhone,
    setPhoneResolving,
    setBooting,
    setError,
    setPageData,
    pageData,
    booting,
    getSavedSession,
    saveSession,
    phoneRef,
    phoneResolvingRef,
    visitIdRef,
    entryPageRef,
    pageCacheRef,
    prefetchingRef,
    pageDataRef,
    selectedPackRef,
    heOnlyModeRef,
    heDetectSettledRef,
    heExitPendingRef,
    heMetaRef,
    loadGenerationRef,
    clickIdRef,
    rcidRef,
    vidRef,
    affIdRef,
    campidRef,
    trackingCampidRef,
    loadPageRef,
    transitionLockRef,
  })

  useShadowInteractions({
    hostRef,
    pageData,
    country,
    operator,
    campid,
    trackingCampid,
    cachePage,
    loadPage,
    setSearchParams,
    warnIfHeUnresolved,
    saveSession,
    setPhone,
    setTransitioning,
    setError,
    pageDataRef,
    selectedPackRef,
    phoneRef,
    visitIdRef,
    clickIdRef,
    rcidRef,
    campidRef,
    trackingCampidRef,
    vidRef,
    affIdRef,
    pageCacheRef,
    transitionLockRef,
  })

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

  const { hideHomeForHe, showBootSpinner, showFatalError, notAvailable } = deriveOverlayFlags({
    phoneResolving,
    heExitPending,
    heFunnelSuppressed,
    pageData,
    booting,
    error,
  })

  // Keep the shadow host mounted across loading states. Unmounting it and remounting
  // with the same pageData skips the mount effect → permanent blank white page.
  return (
    <div className="flow-runtime-root relative min-h-screen w-full">
      <SubscriptionOverlays
        transitioning={transitioning}
        error={error}
        pageData={pageData}
        hideHomeForHe={hideHomeForHe}
        showBootSpinner={showBootSpinner}
        showFatalError={showFatalError}
        notAvailable={notAvailable}
        heExitPending={heExitPending}
        heFunnelSuppressed={heFunnelSuppressed}
        phoneResolving={phoneResolving}
      />
      <div
        ref={hostRef}
        className="flow-runtime-host is-visible"
        aria-hidden={showBootSpinner || showFatalError || !pageData?.html}
        style={hideHomeForHe ? { visibility: 'hidden' } : undefined}
      />
    </div>
  )
}

export default memo(SubscriptionPage)
