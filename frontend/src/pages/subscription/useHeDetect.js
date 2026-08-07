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
  isHeSuppressedFunnelPage,
  normalizeDetectNextPage,
} from './flowHelpers'

/**
 * HE detect-msisdn resolve + HOME CTA gate (warnIfHeUnresolved).
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
      detectInFlightRef.current = false
      heDetectSettledRef.current = false
      heOnlyModeRef.current = false
      setHeFunnelSuppressed(false)
    }
    if (detectInFlightRef.current) return undefined
    detectInFlightRef.current = true

    let cancelled = false

    const runHeFailRedirect = (baseFailUrl, errMsg) => {
      if (!baseFailUrl) return false
      // Fail URL opens as-is — no clickId wait (we do not append attribution).
      const dest = appendHeAttributionToUrl(baseFailUrl, { msisdn: '' })
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
        }

        if (isApiHeProvider(heProvider)) {
          heOnlyModeRef.current = true
          setHeFunnelSuppressed(true)
        }

        // No MSISDN + fail URL → leave immediately BEFORE setSearchParams.
        // Updating React Router history first races with location.replace and can
        // leave the overlay stuck on "Redirecting…".
        if (!resolved) {
          const baseFailUrl = pickHeFailRedirectUrl({
            failRedirectUrl,
            cgRedirectUrl,
          })
          if (runHeFailRedirect(baseFailUrl, heError)) {
            return
          }
          // API HE with no fail URL — keep overlay; never infinite "Redirecting"
          // without an actual navigation.
          if (!isApiHeProvider(heProvider)) {
            heOnlyModeRef.current = false
            setHeFunnelSuppressed(false)
          }
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
          // API HE without outbound URL — keep overlay; never show HOME/OTP.
          if (heOnlyModeRef.current) {
            phoneResolvingRef.current = true
            setPhoneResolving(true)
            return
          }
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
            }
            if (heOnlyModeRef.current) {
              phoneResolvingRef.current = true
              setPhoneResolving(true)
            }
            return
          }
        } catch {
          /* ignore */
        }

        console.log('[HE] no MSISDN and no fail URL — HE-only overlay (no HOME/OTP)', {
          heError,
        })
        if (heOnlyModeRef.current) {
          phoneResolvingRef.current = true
          setPhoneResolving(true)
        } else if (!cancelled) {
          phoneResolvingRef.current = false
          setPhoneResolving(false)
        }
      })
      .catch(() => {
        heMetaRef.current = { ...heMetaRef.current, done: true }
      })
      .finally(() => {
        detectInFlightRef.current = false
        heDetectSettledRef.current = true
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

  /** HOME CTA: follow detect decision first, then fail → warn+CG. */
  const warnIfHeUnresolved = useCallback(() => {
    const meta = heMetaRef.current
    const isApiHe = isApiHeProvider(meta.heProvider)

    // Still detecting — ask user to wait instead of bouncing.
    if (phoneResolvingRef.current || !meta.done) {
      setError('Detecting your mobile number… please wait a moment and try again.')
      return true
    }

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

    if (phoneRef.current) return false

    const baseFailUrl = pickHeFailRedirectUrl({
      failRedirectUrl: meta.failRedirectUrl,
      cgRedirectUrl: meta.cgRedirectUrl,
    })
    const message =
      meta.heError ||
      'Could not detect your mobile number. Please use operator mobile data.'

    // Rebuild at CTA time so we send latest click_id (+ msisdn if any) for vendor postbacks.
    const failUrl = baseFailUrl
      ? appendHeAttributionToUrl(baseFailUrl, {
          clickId: clickIdRef.current,
          rcid: rcidRef.current,
          msisdn: phoneRef.current,
          campid: campidRef.current || campid,
          trackingCampid: trackingCampidRef.current || trackingCampid,
        })
      : ''

    setError(message)
    console.warn('[HE] CTA blocked — no MSISDN', { message, failUrl })

    if (failUrl) {
      window.setTimeout(() => {
        window.location.assign(failUrl)
      }, 2000)
    }
    return true
  }, [campid, trackingCampid, setSearchParams, setError, heMetaRef, phoneResolvingRef, phoneRef, clickIdRef, rcidRef, campidRef, trackingCampidRef, loadPageRef])

  return { warnIfHeUnresolved }
}

export { useHeDetect }
