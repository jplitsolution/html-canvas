import { useCallback, useEffect } from 'react'

/**
 * Session persistence + stable landing rcid / attribution ref sync.
 */
function useFlowSession({
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
}) {
  // Stable landing seed so parallel detect + /page share one visit when URL has no click_id.
  useEffect(() => {
    if (urlRcid) {
      rcidRef.current = urlRcid
      return
    }
    if (urlClickId && !rcidRef.current) {
      rcidRef.current = urlClickId
      return
    }
    if (rcidRef.current) return
    try {
      const key = `tc_landing_rcid_${country}_${operator}_${trackingCampid || campid || 'x'}`
      let seed = sessionStorage.getItem(key)
      if (!seed) {
        seed =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `land_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        sessionStorage.setItem(key, seed)
      }
      rcidRef.current = seed
    } catch {
      rcidRef.current = `land_${Date.now()}`
    }
  }, [country, operator, campid, trackingCampid, urlRcid, urlClickId, rcidRef])

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
    if (trackingCampid) trackingCampidRef.current = trackingCampid
  }, [
    urlClickId,
    urlRcid,
    vid,
    affId,
    campid,
    trackingCampid,
    rcidRef,
    clickIdRef,
    vidRef,
    affIdRef,
    campidRef,
    trackingCampidRef,
  ])

  // Keep ref in sync, but never wipe a phone set mid-async (e.g. OTP verify)
  // with a stale empty React state before setPhone commits.
  useEffect(() => {
    if (phone || !phoneRef.current) {
      phoneRef.current = phone
    }
  }, [phone, phoneRef])

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
    } catch (err) {
      console.warn('Failed to save session:', err)
    }
  }, [country, operator, getSavedSession])

  return { getSavedSession, saveSession }
}

export { useFlowSession }
