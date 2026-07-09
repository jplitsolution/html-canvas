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

  return apiClient(`/flow/page?${params.toString()}`, {
    method: 'GET',
    headers: msisdn ? { 'X-MSISDN': String(msisdn) } : undefined,
  })
}

export async function prefetchFlowPage(params) {
  try {
    return await fetchFlowPage(params)
  } catch {
    return null
  }
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
