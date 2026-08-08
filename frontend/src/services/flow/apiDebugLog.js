/**
 * Browser console helper for subscription-flow API debugging.
 * Collapsed groups keep DevTools tidy while still showing full request/response.
 */

const STYLE = {
  title: 'color:#0ea5e9;font-weight:bold',
  ok: 'color:#16a34a;font-weight:bold',
  fail: 'color:#dc2626;font-weight:bold',
  muted: 'color:#64748b',
}

/**
 * @param {string} label - e.g. "detect-msisdn", "Priority 1 (api)"
 * @param {{
 *   request?: object,
 *   response?: object|null,
 *   detected?: object,
 *   match?: object,
 *   outcome?: string,
 *   error?: unknown,
 * }} detail
 */
export function logFlowApi(label, detail = {}) {
  const { request, response, detected, match, outcome, error } = detail
  const failed = Boolean(error) || outcome?.toLowerCase?.().includes('fail')
  const titleStyle = failed ? STYLE.fail : STYLE.title

  console.groupCollapsed(`%c[Flow API] ${label}`, titleStyle)

  if (request != null) {
    console.log('%cRequest', STYLE.muted, request)
  }
  if (response !== undefined) {
    console.log('%cResponse', STYLE.muted, response)
  }
  if (detected != null) {
    console.log('%cDetected', STYLE.ok, detected)
  }
  if (match != null) {
    console.log('%cMatch', match.matched ? STYLE.ok : STYLE.fail, match)
  }
  if (outcome) {
    console.log(
      `%cOutcome: ${outcome}`,
      failed ? STYLE.fail : STYLE.ok,
    )
  }
  if (error) {
    console.warn('Error', error)
  }

  console.groupEnd()
}

/** Compact summary table for a priority-chain API step. */
export function logPriorityApiStep({
  tag,
  url,
  ok,
  status,
  body,
  matchResult,
  outcome,
  error,
}) {
  logFlowApi(tag, {
    request: { url },
    response: { ok, status, body },
    detected: body
      ? {
          currentStatus:
            matchResult?.currentStatus ||
            body.currentStatus ||
            body.status ||
            body.subscriptionStatus ||
            null,
          isActive: body.isActive ?? body.active ?? null,
          responseCode: body.responseCode ?? null,
          responseMessage: body.responseMessage ?? null,
        }
      : null,
    match: matchResult
      ? {
          mode: matchResult.mode,
          key: matchResult.key,
          actual: matchResult.actual,
          matched: matchResult.matched,
          go: matchResult.go,
          page: matchResult.page,
          url: matchResult.url,
        }
      : undefined,
    outcome,
    error,
  })
}
