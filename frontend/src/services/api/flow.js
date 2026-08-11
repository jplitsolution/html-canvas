import { apiClient } from './client'
import { logFlowApi } from '../flow/apiDebugLog'

export async function fetchFlowPage({
  country,
  operator,
  page,
  msisdn,
  visitId,
  pack,
  campid,
  trackingCampid,
  vid,
  affId,
  clickId,
  rcid,
  direct,
}) {
  const params = new URLSearchParams({
    country,
    operator,
    page,
  })
  if (visitId) params.set('visitId', String(visitId))
  if (pack) params.set('pack', pack)
  if (msisdn) params.set('msisdn', String(msisdn))
  // Vendor campid + our tracking_campid (dual).
  if (campid) params.set('campid', String(campid))
  if (trackingCampid) params.set('tracking_campid', String(trackingCampid))
  if (vid) params.set('vid', String(vid))
  if (affId) params.set('aff_id', String(affId))
  // Our click_id + affiliate rcid (dual attribution).
  if (clickId) params.set('click_id', String(clickId))
  if (rcid) params.set('rcid', String(rcid))
  // Builder page links: skip funnel rewrite guards (CONFIRM→HOME without MSISDN).
  if (direct) params.set('direct', '1')

  const request = Object.fromEntries(params)
  const res = await apiClient(`/flow/page?${params.toString()}`, {
    method: 'GET',
  })
  logFlowApi('flow/page', {
    request,
    response: {
      pageType: res?.pageType,
      campaignId: res?.campaignId,
      visitId: res?.visitId,
      entryPage: res?.entryPage,
      subscriptionStatus: res?.subscriptionStatus,
      blocked: res?.blocked,
      blockReason: res?.blockReason,
      successRedirect: res?.successRedirect,
      externalRedirect: res?.externalRedirect,
      clickId: res?.clickId,
      rcid: res?.rcid,
      hasHtml: Boolean(res?.html),
    },
    detected: {
      phone: msisdn || null,
      subscriptionStatus: res?.subscriptionStatus || null,
      blocked: Boolean(res?.blocked),
      blockReason: res?.blockReason || null,
    },
  })
  if (res?.debugHeaders) {
    logFlowApi('flow/page headers', {
      response: res.debugHeaders,
      detected: { headerPhone: res.debugHeaderPhone || null },
    })
  }
  return res
}

export async function prefetchFlowPage(params) {
  try {
    return await fetchFlowPage(params)
  } catch {
    return null
  }
}

/**
 * Server-side proxy for Priority Chain API URLs (avoids browser CORS on partner checksub).
 * Returns { ok, status, body } — body is parsed JSON when possible.
 * Also persists request/response to api_call_logs when visit context is provided.
 */
export async function priorityCheckApi(url, meta = {}) {
  return apiClient('/flow/priority-check', {
    method: 'POST',
    body: {
      url,
      visitId: meta.visitId || undefined,
      campaignId: meta.campaignId || undefined,
      msisdn: meta.msisdn || meta.phone || undefined,
      clickId: meta.clickId || undefined,
      rcid: meta.rcid || undefined,
      stepIndex: meta.stepIndex,
      pageType: meta.pageType || undefined,
      rules: meta.rules || undefined,
      successKey: meta.successKey || undefined,
      successValue: meta.successValue,
    },
    dedupe: false,
  })
}

export async function fetchFlowEntry({ country, operator, campid, trackingCampid }) {
  const params = new URLSearchParams({ country, operator, page: 'HOME' })
  if (campid) params.set('campid', String(campid))
  if (trackingCampid) params.set('tracking_campid', String(trackingCampid))
  const res = await apiClient(`/flow/entry?${params.toString()}`, { method: 'GET' })
  logFlowApi('flow/entry', {
    request: Object.fromEntries(params),
    response: res,
  })
  return res
}

export async function transitionFlow(body) {
  const payload = {
    ...body,
    visitId: body.visitId ? Number(body.visitId) : undefined,
  }
  const res = await apiClient('/flow/transition', {
    method: 'POST',
    body: payload,
    dedupe: false,
  })
  logFlowApi('flow/transition', {
    request: payload,
    response: {
      pageType: res?.pageType,
      visitId: res?.visitId,
      nextPage: res?.nextPage,
      routeOutcome: res?.routeOutcome,
      subscriptionStatus: res?.subscriptionStatus,
      blocked: res?.blocked,
      successRedirect: res?.successRedirect,
      hasHtml: Boolean(res?.html),
    },
    detected: {
      phone: payload.phone || null,
      pageType: res?.pageType || null,
      routeOutcome: res?.routeOutcome || null,
      subscriptionStatus: res?.subscriptionStatus || null,
    },
  })
  return res
}

export async function detectMsisdnApi({
  country,
  operator,
  campid,
  trackingCampid,
  phone,
  clickId,
  rcid,
  visitId,
  sessionId,
  vid,
  heSource,
  heClientLogs,
  heClientError,
} = {}) {
  const params = new URLSearchParams()
  if (country) params.set('country', country)
  if (operator) params.set('operator', operator)
  if (campid) params.set('campid', String(campid))
  if (trackingCampid) params.set('tracking_campid', String(trackingCampid))
  if (phone && !heSource) params.set('msisdn', String(phone))
  if (clickId) params.set('click_id', String(clickId))
  if (rcid) params.set('rcid', String(rcid))
  if (visitId) params.set('visitId', String(visitId))
  if (vid) params.set('vid', String(vid))
  if (heSource && !heClientLogs) params.set('heSource', String(heSource))

  // Pull attribution from the live landing URL when callers omit it.
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search)
    if (!params.get('click_id')) {
      const fromUrl = q.get('click_id') || q.get('clickId') || q.get('clickid')
      if (fromUrl) params.set('click_id', fromUrl)
    }
    if (!params.get('rcid')) {
      const fromUrl = q.get('rcid')
      if (fromUrl) params.set('rcid', fromUrl)
    }
    if (!params.get('campid')) {
      const fromUrl = q.get('campid')
      if (fromUrl) params.set('campid', fromUrl)
    }
    if (!params.get('tracking_campid')) {
      const fromUrl = q.get('tracking_campid') || q.get('trackingCampid')
      if (fromUrl) params.set('tracking_campid', fromUrl)
    }
    if (!params.get('vid')) {
      const fromUrl = q.get('vid')
      if (fromUrl) params.set('vid', fromUrl)
    }
    if (!params.get('visitId')) {
      const fromUrl = q.get('visitId')
      if (fromUrl) params.set('visitId', fromUrl)
    }
    // Stable browser session for Safaricom token (X-Session-ID) — same pattern as
    // partner sample sessionStorage `session_id` / `sid_<ts>_<rand>`.
    let sid = sessionId
    if (!sid) {
      try {
        sid =
          sessionStorage.getItem('session_id') ||
          sessionStorage.getItem('templatecraft_he_session_id')
        if (!sid) {
          sid = `sid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
          sessionStorage.setItem('session_id', sid)
          sessionStorage.setItem('templatecraft_he_session_id', sid)
        }
      } catch {
        sid = `sid_${Date.now()}`
      }
    }
    if (sid) params.set('sessionId', sid)
  } else if (sessionId) {
    params.set('sessionId', String(sessionId))
  }

  const usePost = Boolean(heSource === 'browser' || heClientLogs)
  const request = {
    ...Object.fromEntries(params),
    ...(usePost
      ? {
          heSource: heSource || 'browser',
          phone: phone || undefined,
          heClientError: heClientError || undefined,
          heClientLogs: heClientLogs ? '[omitted]' : undefined,
        }
      : {}),
  }

  try {
    const res = usePost
      ? await apiClient(`/flow/detect-msisdn?${params.toString()}`, {
          method: 'POST',
          body: JSON.stringify({
            heSource: heSource || 'browser',
            phone: phone || undefined,
            msisdn: phone || undefined,
            visitId: visitId || undefined,
            sessionId: params.get('sessionId') || sessionId || undefined,
            country: country || undefined,
            operator: operator || undefined,
            campid: campid || undefined,
            trackingCampid: trackingCampid || undefined,
            clickId: clickId || undefined,
            rcid: rcid || undefined,
            vid: vid || undefined,
            heClientError: heClientError || undefined,
            heClientLogs: heClientLogs || undefined,
          }),
        })
      : await apiClient(`/flow/detect-msisdn?${params.toString()}`, {
          method: 'GET',
        })
    logFlowApi('detect-msisdn', {
      request,
      response: res,
      detected: {
        phone: res?.phone || null,
        hasMsisdn: res?.hasMsisdn,
        heProvider: res?.heProvider || null,
        heError: res?.heError || null,
        needsClientHe: res?.needsClientHe || false,
        subscribed: res?.subscribed,
        isActive: res?.isActive,
        subscriptionStatus: res?.subscriptionStatus || null,
        blocked: res?.blocked,
        blockReason: res?.blockReason || null,
        nextPage: res?.nextPage || null,
        failRedirectUrl: res?.failRedirectUrl || null,
        successRedirectUrl: res?.successRedirectUrl || null,
        cgRedirectUrl: res?.cgRedirectUrl || null,
        visitId: res?.visitId || null,
        clickId: res?.clickId || null,
        rcid: res?.rcid || null,
        headerPhone: res?.debugHeaderPhone || null,
      },
      outcome: res?.needsClientHe
        ? 'needs_client_he'
        : res?.hasMsisdn
          ? 'msisdn_found'
          : 'msisdn_missing',
    })
    if (res?.debugHeaders) {
      logFlowApi('detect-msisdn headers', {
        response: res.debugHeaders,
        detected: { headerPhone: res.debugHeaderPhone || null },
      })
    }
    return res
  } catch (err) {
    logFlowApi('detect-msisdn', {
      request,
      error: err,
      outcome: 'fail',
    })
    return null
  }
}
