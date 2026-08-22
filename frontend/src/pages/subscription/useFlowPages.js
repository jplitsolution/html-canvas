import { useCallback, useEffect, useRef } from 'react'
import { fetchFlowEntry, fetchFlowPage, prefetchFlowPage } from '../../services/api/flow'
import { persistPhone, pickHeFailRedirectUrl } from '../../services/flow/resolvePhoneNumber'
import { trackEvent } from '../../utils/analytics'
import { FLOW_FONT, FLOW_PAGE_CACHE_ENABLED, PRELOAD_BY_PAGE } from './constants'
import { isHeSuppressedFunnelPage, normalizeDetectNextPage, shouldTreatCgAsHeFailRedirect } from './flowHelpers'

/**
 * Page load/cache/prefetch, boot, URL step sync, and redirect side-effects.
 */
function useFlowPages({
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
}) {
  // cachePage writes ?step= after paint; keep this so the URL-sync effect
  // does not reload the previous step (Save & preview always has step=HOME).
  const appStepRef = useRef(null)

  const cachePage = useCallback(
    (data) => {
      if (!data?.pageType) return
      if (heOnlyModeRef.current && isHeSuppressedFunnelPage(data.pageType)) {
        console.log('[HE] suppressing funnel page render:', data.pageType)
        return
      }

      // Immediate portal redirect: leave before painting thank-you (or any page with resolved URL).
      const mode = String(data.successRedirectMode || 'thankyou').toLowerCase()
      const dest = String(data.successRedirect || '').trim()
      if (
        mode === 'immediate' &&
        dest &&
        /^https?:\/\//i.test(dest) &&
        String(data.pageType || '').toUpperCase() === 'THANKYOU'
      ) {
        if (data.visitId) visitIdRef.current = data.visitId
        window.location.assign(dest)
        return
      }

      if (data.entryPage) entryPageRef.current = data.entryPage
      pageCacheRef.current.set(data.pageType, data)
      if (data.visitId) visitIdRef.current = data.visitId
      pageDataRef.current = data
      appStepRef.current = String(data.pageType || '').toUpperCase()
      setPageData(data)

      // Backend dual IDs: our clickId + affiliate rcid (stable for the visit).
      if (data.clickId) clickIdRef.current = String(data.clickId)
      if (data.rcid) rcidRef.current = String(data.rcid)

      const resolvedPhone = phoneRef.current || data.variables?.phone || data.variables?.msisdn || ''
      if (resolvedPhone) {
        phoneRef.current = resolvedPhone
        setPhone(resolvedPhone)
        persistPhone(resolvedPhone)
      }

      // Save session in sessionStorage
      const isVerified = data.pageType === 'CONFIRM' || data.pageType === 'THANKYOU' || data.verified === true
      saveSession({
        verificationStatus: isVerified ? 'verified' : 'unverified',
        flowId: data.campaignId,
        campaignId: data.campaignId,
        visitId: data.visitId || visitIdRef.current,
        phone: resolvedPhone,
        step: data.pageType,
        clickId: clickIdRef.current || undefined,
        rcid: rcidRef.current || undefined,
        purchaseTypeId: data.flowContext?.purchaseTypeId || undefined,
        transactionChannel: data.flowContext?.transactionChannel || undefined,
        msisdnSource: data.flowContext?.msisdnSource || undefined,
      })

      // Sync URL step + msisdn + dual click attribution params.
      setSearchParams(
        (prev) => {
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
          const tc = trackingCampidRef.current
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
          if (tc && nextParams.get('tracking_campid') !== tc) {
            nextParams.set('tracking_campid', tc)
            changed = true
          }
          return changed ? nextParams : prev
        },
        { replace: true }
      )
    },
    [saveSession, setSearchParams]
  )

  // Null-flow CG: backend sends externalRedirect with click_id → leave immediately
  useEffect(() => {
    const dest = pageData?.externalRedirect
    if (dest && /^https?:\/\//i.test(dest)) {
      window.location.assign(dest)
    }
  }, [pageData?.externalRedirect])

  // THANKYOU → optional success/content portal
  // thankyou mode: show page ~2s then redirect; immediate handled in cachePage
  useEffect(() => {
    if (String(pageData?.pageType || '').toUpperCase() !== 'THANKYOU') return undefined
    if (String(pageData?.successRedirectMode || 'thankyou').toLowerCase() === 'immediate') {
      return undefined
    }
    const dest = String(pageData?.successRedirect || pageData?.successRedirectUrl || '').trim()
    if (!dest || !/^https?:\/\//i.test(dest)) return undefined
    const timer = window.setTimeout(() => {
      window.location.assign(dest)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [pageData?.pageType, pageData?.successRedirect, pageData?.successRedirectUrl, pageData?.successRedirectMode])

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
            trackingCampid,
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
        })
      )
    },
    [country, operator, campid, trackingCampid, vid, affId]
  )

  const loadPage = useCallback(
    async (page = 'HOME', options = {}) => {
      const requested =
        String(page || 'HOME')
          .trim()
          .toUpperCase() || 'HOME'
      if (!country || !operator) {
        setError('Missing country or operator in URL')
        setBooting(false)
        return
      }
      if (heOnlyModeRef.current && isHeSuppressedFunnelPage(requested)) {
        console.log('[HE] suppressing funnel page load:', requested)
        phoneResolvingRef.current = true
        setPhoneResolving(true)
        setBooting(false)
        return
      }
      setError('')
      const generation = ++loadGenerationRef.current

      // Direct page-link navigations must not reuse a guarded/prefetch rewrite cache.
      if (FLOW_PAGE_CACHE_ENABLED && !options.direct && pageCacheRef.current.has(requested)) {
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
          trackingCampid,
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
    [country, operator, cachePage, campid, trackingCampid, vid, affId, setPhoneResolving]
  )

  useEffect(() => {
    loadPageRef.current = loadPage
  }, [loadPage])

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

  // Fresh landing: wait for HE detect before HOME so fail/success redirects never flash HOME.
  // Do NOT depend on searchParams — cachePage updates step/msisdn and would re-boot in a loop.
  useEffect(() => {
    if (!country || !operator) return undefined
    let cancelled = false

    async function waitForHeDetect(maxMs = 12000) {
      const start = Date.now()
      while (!heDetectSettledRef.current && Date.now() - start < maxMs) {
        if (cancelled || heExitPendingRef.current) return false
        await new Promise((resolve) => {
          window.setTimeout(resolve, 40)
        })
      }
      return heDetectSettledRef.current
    }

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
        const resumeStep = urlStep || savedSession.step || entryPageRef.current || 'HOME'
        if (isHeSuppressedFunnelPage(resumeStep)) {
          await waitForHeDetect()
          if (cancelled || heExitPendingRef.current || heOnlyModeRef.current) return
        }
        if (!cancelled) {
          await loadPage(resumeStep)
        }
        return
      }

      selectedPackRef.current = 'daily'
      pageCacheRef.current.clear()
      prefetchingRef.current.clear()
      // Do not clear visitIdRef — detect-msisdn may have already created the visit.
      pageDataRef.current = null
      setPageData(null)
      setBooting(true)

      if (urlStep) {
        if (isHeSuppressedFunnelPage(urlStep)) {
          await waitForHeDetect()
          if (cancelled || heExitPendingRef.current || heOnlyModeRef.current) return
        }
        if (!cancelled) await loadPage(urlStep)
        return
      }

      // API HE may redirect away — do not paint HOME until detect settles.
      await waitForHeDetect()
      if (cancelled || heExitPendingRef.current) return
      const meta = heMetaRef.current
      const detectPage = normalizeDetectNextPage(meta.nextPage)
      if (
        !phoneRef.current &&
        detectPage !== 'OTP' &&
        pickHeFailRedirectUrl({
          failRedirectUrl: meta.failRedirectUrl,
          cgRedirectUrl: shouldTreatCgAsHeFailRedirect(meta.verificationMode)
            ? meta.cgRedirectUrl
            : '',
        })
      ) {
        return
      }
      if (heOnlyModeRef.current) return

      try {
        if (detectPage) {
          entryPageRef.current = detectPage
          await loadPage(detectPage)
          return
        }
        const { entryPage } = await fetchFlowEntry({ country, operator, campid, trackingCampid })
        if (cancelled || heExitPendingRef.current || heOnlyModeRef.current) return
        entryPageRef.current = entryPage || 'HOME'
        await loadPage(entryPageRef.current)
      } catch {
        if (!cancelled && !heExitPendingRef.current && !heOnlyModeRef.current) {
          await loadPage(detectPage || 'HOME')
        }
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [country, operator, campid, trackingCampid, loadPage, getSavedSession])

  // Sync step changes from browser history / page-link navigation.
  const urlStep = (searchParams.get('step') || '').toUpperCase()
  useEffect(() => {
    if (booting || !pageData) return
    if (!urlStep) return
    const pageType = String(pageData.pageType || '').toUpperCase()
    if (pageType === urlStep) {
      if (appStepRef.current === urlStep) appStepRef.current = null
      return
    }
    if (heOnlyModeRef.current && isHeSuppressedFunnelPage(urlStep)) return
    // Ignore while a transition is in flight — cachePage will align URL + page together.
    if (transitionLockRef.current) return
    // Stale ?step= from editor preview (HOME) must not overwrite a CTA result.
    if (appStepRef.current && appStepRef.current !== urlStep) return
    setBooting(true)
    loadPage(urlStep)
  }, [urlStep, booting, pageData, loadPage])

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

  return { cachePage, loadPage }
}

export { useFlowPages }
