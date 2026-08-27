import { startTransition, useCallback, useEffect } from 'react'
import {
  resolvePhoneFromUrl,
  resolvePhoneNumber,
  persistPhone,
  pickHeFailRedirectUrl,
  appendHeAttributionToUrl,
  isHeRedirectUrl,
} from '../../services/flow/resolvePhoneNumber'
import {
  isApiHeProvider,
  isExternalHttpRedirect,
  isHeSilentExitMode,
  isHeSuppressedFunnelPage,
  normalizeDetectNextPage,
  shouldTreatCgAsHeFailRedirect,
} from './flowHelpers'

/**
 * HE detect-msisdn resolve + HOME CTA gate (warnIfHeUnresolved).
 *
 * Product contract (token/API HE):
 * - Success/fail (or CG fail) URL set → silent exit, never flash HOME
 * - Both exit URLs empty → show HOME after detect (funnel mode)
 */
function useHeDetect({
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
}) {
  useEffect(() => {
    if (!country || !operator) {
      phoneResolvingRef.current = false
      heExitPendingRef.current = false
      window.setTimeout(() => {
        startTransition(() => {
          setPhoneResolving(false)
          setHeExitPending(false)
        })
      }, 0)
      return undefined
    }

    const detectKey = `${country}|${operator}|${campid}|${trackingCampid}`
    if (detectKeyRef.current !== detectKey) {
      detectKeyRef.current = detectKey
      // Attribution fill-in (campid / click_id in the URL after OTP) must not
      // reset a finished detect — that re-runs HE and yanks the user back to OTP.
      if (!heDetectSettledRef.current) {
        detectInFlightRef.current = false
        heOnlyModeRef.current = false
        setHeFunnelSuppressed(false)
      }
    }
    if (heDetectSettledRef.current) return undefined
    if (detectInFlightRef.current) return undefined
    detectInFlightRef.current = true

    let cancelled = false

    const runHeFailRedirect = (baseFailUrl, errMsg) => {
      if (!baseFailUrl) return false
      // Placeholder fill only — do not auto-append click_id.
      const dest = appendHeAttributionToUrl(baseFailUrl, {
        msisdn: '',
        clickId: clickIdRef.current || '',
        rcid: rcidRef.current || '',
        campid: campidRef.current || campid,
        trackingCampid: trackingCampidRef.current || trackingCampid,
      })
      if (!dest) {
        heExitPendingRef.current = false
        setHeExitPending(false)
        heOnlyModeRef.current = false
        setHeFunnelSuppressed(false)
        phoneResolvingRef.current = false
        setPhoneResolving(false)
        return false
      }
      heExitPendingRef.current = true
      setHeExitPending(true)
      console.log('[HE] no MSISDN — fail redirect (skip HOME)', {
        dest,
        heError: errMsg,
      })
      window.location.replace(dest)
      return true
    }
    phoneResolvingRef.current = true
    heExitPendingRef.current = false
    window.setTimeout(() => {
      if (cancelled) return
      startTransition(() => {
        setPhoneResolving(true)
        setHeExitPending(false)
      })
    }, 0)
    heMetaRef.current = {
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
      verificationMode: null,
    }

    const resolveWithTimeout = Promise.race([
      resolvePhoneNumber(new URLSearchParams(window.location.search), {
        country,
        operator,
        campid,
        trackingCampid,
        vid: vidRef.current || vid || undefined,
        visitId: visitIdRef.current || undefined,
        clickId: clickIdRef.current || undefined,
        rcid: rcidRef.current || undefined,
      }),
      new Promise((resolve) => {
        setTimeout(() => resolve({ phone: '', source: 'timeout' }), 10000)
      }),
    ])

    resolveWithTimeout
      .then((result) => {
        if (cancelled) return
        const {
          phone: resolved,
          failRedirectUrl,
          successRedirectUrl,
          cgRedirectUrl,
          nextPage,
          blocked,
          blockReason,
          subscriptionStatus,
          isActive,
          heError,
          heProvider,
          visitId: heVisitId,
          clickId: heClickId,
          rcid: heRcid,
          verificationMode,
          flowContext,
        } = result || {}

        // Visit-first: store our click_id / visitId from detect so /page reuses them.
        if (heVisitId) visitIdRef.current = heVisitId
        if (heClickId) clickIdRef.current = String(heClickId)
        if (heRcid) rcidRef.current = String(heRcid)
        else if (heClickId && !rcidRef.current) {
          /* keep existing affiliate rcid */
        }

        heMetaRef.current = {
          done: true,
          heProvider: heProvider || null,
          heError: heError || null,
          failRedirectUrl: failRedirectUrl || null,
          successRedirectUrl: successRedirectUrl || null,
          cgRedirectUrl: cgRedirectUrl || null,
          nextPage: normalizeDetectNextPage(nextPage),
          blocked: Boolean(blocked),
          blockReason: blockReason || null,
          subscriptionStatus: subscriptionStatus || null,
          isActive: Boolean(isActive),
          verificationMode: String(
            verificationMode || flowContext?.verificationMode || '',
          ).toUpperCase() || null,
        }

        const landingCgUrl = result?.externalRedirect
        if (isExternalHttpRedirect(landingCgUrl)) {
          heOnlyModeRef.current = true
          setHeFunnelSuppressed(true)
          heExitPendingRef.current = true
          setHeExitPending(true)
          console.log('[CG] landing redirect (skip HOME)', landingCgUrl)
          window.location.replace(landingCgUrl)
          return
        }

        const detectedNextPage = normalizeDetectNextPage(nextPage)
        const mode = heMetaRef.current.verificationMode
        const cgAsHeFail = shouldTreatCgAsHeFailRedirect(mode)
          ? cgRedirectUrl
          : ''

        // Silent exit only when success URL (phone) or fail/CG URL (no phone).
        // OTP nextPage (packs_on_home BOTH / OTP_ONLY) must not use HE fail/CG exit.
        // CG_HOME: CG URL is for Subscribe, never landing skip-HOME.
        const silentExit =
          isApiHeProvider(heProvider) &&
          detectedNextPage !== 'OTP' &&
          isHeSilentExitMode({
            phone: resolved,
            successRedirectUrl,
            failRedirectUrl,
            cgRedirectUrl: cgAsHeFail,
            verificationMode: mode,
          })
        if (silentExit) {
          heOnlyModeRef.current = true
          setHeFunnelSuppressed(true)
        } else {
          heOnlyModeRef.current = false
          setHeFunnelSuppressed(false)
        }

        // No MSISDN + fail URL → leave immediately BEFORE setSearchParams.
        // Updating React Router history first races with location.replace and can
        // leave the overlay stuck on "Redirecting…".
        if (!resolved) {
          if (detectedNextPage !== 'OTP') {
            const baseFailUrl = pickHeFailRedirectUrl({
              failRedirectUrl,
              cgRedirectUrl: cgAsHeFail,
            })
            if (runHeFailRedirect(baseFailUrl, heError)) {
              return
            }
          }
          if (detectedNextPage) {
            heOnlyModeRef.current = false
            setHeFunnelSuppressed(false)
            phoneResolvingRef.current = false
            setPhoneResolving(false)
            setHeExitPending(false)
            setSearchParams((prev) => {
              const nextParams = new URLSearchParams(prev)
              if (nextParams.get('step') === detectedNextPage) return prev
              nextParams.set('step', detectedNextPage)
              return nextParams
            }, { replace: true })
            window.setTimeout(() => {
              loadPageRef.current?.(detectedNextPage, { direct: true })
            }, 0)
            return
          }
          // No fail exit URL → drop overlay so boot can paint HOME.
          heOnlyModeRef.current = false
          setHeFunnelSuppressed(false)
        }

        if (heVisitId || heClickId || heRcid) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            let changed = false
            if (heClickId && next.get('click_id') !== String(heClickId)) {
              next.set('click_id', String(heClickId))
              changed = true
            }
            if (heRcid && next.get('rcid') !== String(heRcid)) {
              next.set('rcid', String(heRcid))
              changed = true
            }
            if (heVisitId && next.get('visitId') !== String(heVisitId)) {
              next.set('visitId', String(heVisitId))
              changed = true
            }
            return changed ? next : prev
          }, { replace: true })
        }

        if (resolved) {
          if (
            String(verificationMode || flowContext?.verificationMode || '').toUpperCase() ===
            'UNIVERSE_DCB'
          ) {
            try {
              const sessionKey = `tc_session_${country}_${operator}`
              const saved = JSON.parse(sessionStorage.getItem(sessionKey) || '{}')
              sessionStorage.setItem(
                sessionKey,
                JSON.stringify({
                  ...saved,
                  msisdnSource: 'HE',
                  transactionChannel: 'HE',
                })
              )
            } catch {
              /* session persistence is best effort */
            }
          }
          phoneRef.current = resolved
          setPhone(resolved)
          persistPhone(resolved)
          const currentParams = new URLSearchParams(window.location.search)
          if (!resolvePhoneFromUrl(currentParams)) {
            currentParams.set('msisdn', resolved)
            if (clickIdRef.current) currentParams.set('click_id', clickIdRef.current)
            if (rcidRef.current) currentParams.set('rcid', rcidRef.current)
            if (visitIdRef.current) currentParams.set('visitId', String(visitIdRef.current))
            setSearchParams(currentParams, { replace: true })
          }

          const detectedNextPage = normalizeDetectNextPage(nextPage)
          if (
            detectedNextPage &&
            !(heOnlyModeRef.current && isHeSuppressedFunnelPage(detectedNextPage))
          ) {
            phoneResolvingRef.current = false
            setPhoneResolving(false)
            setHeExitPending(false)
            setSearchParams((prev) => {
              const nextParams = new URLSearchParams(prev)
              if (nextParams.get('step') === detectedNextPage) return prev
              nextParams.set('step', detectedNextPage)
              return nextParams
            }, { replace: true })
            window.setTimeout(() => {
              loadPageRef.current?.(detectedNextPage, { direct: true })
            }, 0)
            return
          }
          if (heOnlyModeRef.current && detectedNextPage) {
            phoneResolvingRef.current = true
            setPhoneResolving(true)
            return
          }

          // Success URL set → never show HOME; overlay until leave.
          if (isHeRedirectUrl(successRedirectUrl)) {
            heOnlyModeRef.current = true
            setHeFunnelSuppressed(true)
            heExitPendingRef.current = true
            setHeExitPending(true)
            const go = () => {
              const dest = appendHeAttributionToUrl(successRedirectUrl, {
                clickId: clickIdRef.current || '',
                rcid: rcidRef.current || '',
                msisdn: resolved,
                campid: campidRef.current || campid,
                trackingCampid: trackingCampidRef.current || trackingCampid,
              })
              if (!dest) {
                heExitPendingRef.current = false
                setHeExitPending(false)
                heOnlyModeRef.current = false
                setHeFunnelSuppressed(false)
                phoneResolvingRef.current = false
                setPhoneResolving(false)
                return
              }
              console.log('[HE] MSISDN resolved — success redirect (skip HOME)', dest)
              window.location.replace(dest)
            }
            // clickId is issued by detect-msisdn now — redirect immediately when present.
            if (clickIdRef.current) {
              go()
            } else {
              const started = Date.now()
              const tick = () => {
                if (clickIdRef.current || Date.now() - started > 2500) {
                  go()
                  return
                }
                window.setTimeout(tick, 150)
              }
              tick()
            }
            return
          }
          // Phone found, no success URL → funnel mode (HOME).
          heOnlyModeRef.current = false
          setHeFunnelSuppressed(false)
          if (!cancelled) {
            phoneResolvingRef.current = false
            setPhoneResolving(false)
          }
          return
        }

        // Fall back to session phone from a prior OTP in this tab (not for failed API HE).
        try {
          const saved = sessionStorage.getItem(`tc_session_${country}_${operator}`)
          const sessionPhone = saved ? JSON.parse(saved)?.phone : ''
          if (sessionPhone && !(isApiHeProvider(heProvider) && heError)) {
            phoneRef.current = sessionPhone
            setPhone(sessionPhone)
            persistPhone(sessionPhone)
            if (isHeRedirectUrl(successRedirectUrl)) {
              heOnlyModeRef.current = true
              setHeFunnelSuppressed(true)
              heExitPendingRef.current = true
              setHeExitPending(true)
              const dest = appendHeAttributionToUrl(successRedirectUrl, {
                clickId: clickIdRef.current,
                rcid: rcidRef.current,
                msisdn: sessionPhone,
                campid: campidRef.current || campid,
                trackingCampid: trackingCampidRef.current || trackingCampid,
              })
              if (dest) {
                console.log('[HE] session MSISDN — success redirect (skip HOME)', dest)
                window.location.replace(dest)
                return
              }
              heExitPendingRef.current = false
              setHeExitPending(false)
              heOnlyModeRef.current = false
              setHeFunnelSuppressed(false)
            }
            // Session phone, no success URL → funnel (HOME).
            heOnlyModeRef.current = false
            setHeFunnelSuppressed(false)
            if (!cancelled) {
              phoneResolvingRef.current = false
              setPhoneResolving(false)
            }
            return
          }
        } catch {
          /* ignore */
        }

        // No MSISDN and no fail URL → funnel mode: show HOME.
        console.log('[HE] no MSISDN and no fail URL — show HOME (funnel mode)', {
          heError,
        })
        heOnlyModeRef.current = false
        setHeFunnelSuppressed(false)
        if (!cancelled) {
          phoneResolvingRef.current = false
          setPhoneResolving(false)
        }
      })
      .catch(() => {
        heMetaRef.current = { ...heMetaRef.current, done: true }
        heOnlyModeRef.current = false
        setHeFunnelSuppressed(false)
      })
      .finally(() => {
        detectInFlightRef.current = false
        if (!cancelled) {
          heDetectSettledRef.current = true
        }
        // Keep overlay if we are about to leave (success or fail redirect).
        if (!cancelled && !heExitPendingRef.current && !heOnlyModeRef.current) {
          phoneResolvingRef.current = false
          setPhoneResolving(false)
        }
      })

    return () => {
      cancelled = true
      detectInFlightRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, operator, campid, trackingCampid, setSearchParams])

  /** HOME CTA: silent-exit URLs still redirect; empty exit URLs allow funnel. */
  const warnIfHeUnresolved = useCallback(() => {
    const meta = heMetaRef.current
    const isApiHe = isApiHeProvider(meta.heProvider)

    // Still detecting — block CTA; status stays in console (not on-screen copy).
    if (phoneResolvingRef.current || !meta.done) {
      console.log(
        '[subscription] Detecting mobile number… please wait a moment and try again.',
      )
      return true
    }

    // CG via HOME / null flow: Subscribe must not be treated as HE-fail.
    if (!shouldTreatCgAsHeFailRedirect(meta.verificationMode)) return false

    // Only gate Token/Custom HE flows (OTP / header paths continue normally).
    if (!isApiHe) return false

    const nextPage = normalizeDetectNextPage(meta.nextPage)
    if (phoneRef.current && nextPage) {
      setSearchParams((prev) => {
        const nextParams = new URLSearchParams(prev)
        nextParams.set('step', nextPage)
        return nextParams
      }, { replace: true })
      loadPageRef.current?.(nextPage, { direct: true })
      return true
    }

    // MSISDN found + success redirect configured → leave funnel on CTA too.
    if (phoneRef.current && isHeRedirectUrl(meta.successRedirectUrl)) {
      const dest = appendHeAttributionToUrl(meta.successRedirectUrl, {
        clickId: clickIdRef.current,
        rcid: rcidRef.current,
        msisdn: phoneRef.current,
        campid: campidRef.current || campid,
        trackingCampid: trackingCampidRef.current || trackingCampid,
      })
      if (dest) {
        console.log('[HE] CTA — success redirect', dest)
        window.location.assign(dest)
        return true
      }
    }

    // Phone present (no success URL) → funnel CTA may proceed.
    if (phoneRef.current) return false

    const baseFailUrl = pickHeFailRedirectUrl({
      failRedirectUrl: meta.failRedirectUrl,
      cgRedirectUrl: shouldTreatCgAsHeFailRedirect(meta.verificationMode)
        ? meta.cgRedirectUrl
        : '',
    })
    const failUrl = baseFailUrl
      ? appendHeAttributionToUrl(baseFailUrl, {
          clickId: clickIdRef.current,
          rcid: rcidRef.current,
          msisdn: phoneRef.current,
          campid: campidRef.current || campid,
          trackingCampid: trackingCampidRef.current || trackingCampid,
        })
      : ''

    // No phone + no fail exit → funnel mode (HOME Subscribe / OTP).
    if (!failUrl) return false

    const message =
      meta.heError ||
      'Could not detect your mobile number. Please use operator mobile data.'
    setError(message)
    console.warn('[HE] CTA blocked — no MSISDN', { message, failUrl })
    window.setTimeout(() => {
      window.location.assign(failUrl)
    }, 2000)
    return true
  }, [campid, trackingCampid, setSearchParams, setError, heMetaRef, phoneResolvingRef, phoneRef, clickIdRef, rcidRef, campidRef, trackingCampidRef, loadPageRef])

  return { warnIfHeUnresolved }
}

export { useHeDetect }
