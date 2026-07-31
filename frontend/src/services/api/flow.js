import { apiClient } from './client'

export async function fetchFlowPage({
  country,
  operator,
  page,
  msisdn,
  visitId,
  pack,
  campid,
  vid,
  affId,
  clickId,
}) {
  const params = new URLSearchParams({
    country,
    operator,
    page,
  })
  if (visitId) params.set('visitId', String(visitId))
  if (pack) params.set('pack', pack)
  if (msisdn) params.set('msisdn', String(msisdn))
  // Affiliate / vendor click attribution (tracking-URL params).
  if (campid) params.set('campid', String(campid))
  if (vid) params.set('vid', String(vid))
  if (affId) params.set('aff_id', String(affId))
  if (clickId) params.set('click_id', String(clickId))

  const res = await apiClient(`/flow/page?${params.toString()}`, {
    method: 'GET',
    headers: msisdn ? { 'X-MSISDN': String(msisdn) } : undefined,
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
      '[HE DEBUG] debugHeaders missing — backend/frontend deploy stale hai. Server pe ./deploy.sh dubara chalao.',
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

export async function fetchFlowEntry({ country, operator, campid }) {
  const params = new URLSearchParams({ country, operator, page: 'HOME' })
  if (campid) params.set('campid', String(campid))
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

export async function detectMsisdnApi({ country, operator, campid, phone } = {}) {
  const params = new URLSearchParams()
  if (country) params.set('country', country)
  if (operator) params.set('operator', operator)
  if (campid) params.set('campid', String(campid))
  if (phone) params.set('msisdn', String(phone))

  console.log('[HE DEBUG] calling /flow/detect-msisdn…', Object.fromEntries(params))
  try {
    const res = await apiClient(`/flow/detect-msisdn?${params.toString()}`, { method: 'GET' })
    logHeDebug('detect-msisdn', res)
    console.log('[HE DEBUG] detect-msisdn result:', {
      phone: res?.phone,
      hasMsisdn: res?.hasMsisdn,
      heProvider: res?.heProvider,
      heError: res?.heError,
      subscribed: res?.subscribed,
      blocked: res?.blocked,
    })
    return res
  } catch (err) {
    console.warn('[HE DEBUG] detectMsisdnApi failed:', err)
    return null
  }
}

