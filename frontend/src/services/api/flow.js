import { apiClient } from './client'

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

  const res = await apiClient(`/flow/page?${params.toString()}`, {
    method: 'GET',
  })
  logHeDebug('flow/page', res)
  return res
}

/** TEMP — always print server-seen headers (or warn if backend not redeployed). */
function logHeDebug(label, res) {
  console.log(`%c[HE DEBUG] ${label} response received`, 'color:#0ea5e9;font-weight:bold', res)
  if (res?.debugHeaders) {
    console.log('%c[HE DEBUG] Full request headers seen by server:', 'color:#0ea5e9;font-weight:bold')
    console.log(res.debugHeaders)
    console.table(res.debugHeaders)
    console.log('[HE DEBUG] extracted MSISDN from headers:', res.debugHeaderPhone || '(none)')
  } else {
    console.warn(
      '[HE DEBUG] debugHeaders missing — backend/frontend deploy may be stale. Re-run ./deploy.sh on the server.',
      { keys: res ? Object.keys(res) : null },
    )
  }
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
  return apiClient(`/flow/entry?${params.toString()}`, { method: 'GET' })
}

export async function transitionFlow(body) {
  const payload = {
    ...body,
    visitId: body.visitId ? Number(body.visitId) : undefined,
  }
  return apiClient('/flow/transition', {
    method: 'POST',
    body: payload,
    dedupe: false,
  })
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
} = {}) {
  const params = new URLSearchParams()
  if (country) params.set('country', country)
  if (operator) params.set('operator', operator)
  if (campid) params.set('campid', String(campid))
  if (trackingCampid) params.set('tracking_campid', String(trackingCampid))
  if (phone) params.set('msisdn', String(phone))
  if (clickId) params.set('click_id', String(clickId))
  if (rcid) params.set('rcid', String(rcid))
  if (visitId) params.set('visitId', String(visitId))
  if (vid) params.set('vid', String(vid))

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

  console.log('[HE DEBUG] calling /flow/detect-msisdn…', Object.fromEntries(params))
  try {
    const res = await apiClient(`/flow/detect-msisdn?${params.toString()}`, { method: 'GET' })
    logHeDebug('detect-msisdn', res)
    console.log('[HE DEBUG] detect-msisdn result:', {
      phone: res?.phone,
      hasMsisdn: res?.hasMsisdn,
      heProvider: res?.heProvider,
      heError: res?.heError,
      failRedirectUrl: res?.failRedirectUrl,
      successRedirectUrl: res?.successRedirectUrl,
      cgRedirectUrl: res?.cgRedirectUrl,
      subscribed: res?.subscribed,
      isActive: res?.isActive,
      subscriptionStatus: res?.subscriptionStatus,
      blocked: res?.blocked,
      blockReason: res?.blockReason,
      nextPage: res?.nextPage,
      visitId: res?.visitId,
      clickId: res?.clickId,
      rcid: res?.rcid,
    })
    return res
  } catch (err) {
    console.warn('[HE DEBUG] detectMsisdnApi failed:', err)
    return null
  }
}

