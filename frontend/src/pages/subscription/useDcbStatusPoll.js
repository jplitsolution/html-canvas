import { useEffect } from 'react'
import { fetchDcbStatus } from '../../services/api/dcb'
import { isDcbFlowContext, normalizedOutcome, routeDcbResponse } from './setupDcbBindings'

const DEFAULT_POLL_INTERVAL_MS = 2000
const DEFAULT_POLL_TIMEOUT_MS = 60000

function positiveNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function useDcbStatusPoll({
  pageData,
  country,
  operator,
  campid,
  trackingCampid,
  visitIdRef,
  phoneRef,
  cachePage,
  loadPage,
}) {
  useEffect(() => {
    if (String(pageData?.pageType || '').toUpperCase() !== 'INPROGRESS' || !isDcbFlowContext(pageData)) {
      return undefined
    }

    const context = pageData.flowContext || {}
    const intervalMs = positiveNumber(context.pollIntervalMs, DEFAULT_POLL_INTERVAL_MS)
    const timeoutMs = positiveNumber(context.pollTimeoutMs, DEFAULT_POLL_TIMEOUT_MS)
    const startedAt = Date.now()
    let cancelled = false
    let timer = null
    let inFlight = false

    const schedule = () => {
      if (cancelled || Date.now() - startedAt >= timeoutMs) return
      timer = window.setTimeout(poll, intervalMs)
    }

    const poll = async () => {
      if (cancelled || inFlight || Date.now() - startedAt >= timeoutMs) return
      inFlight = true
      try {
        const response = await fetchDcbStatus({
          visitId: visitIdRef.current,
          phone: phoneRef.current || undefined,
          msisdn: phoneRef.current || undefined,
          country,
          operator,
          campid: campid || undefined,
          trackingCampid: trackingCampid || undefined,
        })
        if (cancelled) return
        if (normalizedOutcome(response) === 'PENDING') {
          schedule()
          return
        }
        await routeDcbResponse(response, {
          currentPage: 'INPROGRESS',
          cachePage,
          loadPage,
        })
      } catch {
        if (!cancelled) schedule()
      } finally {
        inFlight = false
      }
    }

    schedule()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [pageData, country, operator, campid, trackingCampid, visitIdRef, phoneRef, cachePage, loadPage])
}

export { DEFAULT_POLL_INTERVAL_MS, DEFAULT_POLL_TIMEOUT_MS, positiveNumber, useDcbStatusPoll }
