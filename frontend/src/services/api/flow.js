import { apiClient } from './client'

export async function fetchFlowPage({ country, operator, page, msisdn, visitId, pack }) {
  const params = new URLSearchParams({
    country,
    operator,
    page,
  })
  if (visitId) params.set('visitId', String(visitId))
  if (pack) params.set('pack', pack)
  if (msisdn) params.set('msisdn', String(msisdn))

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
  return apiClient('/flow/transition', {
    method: 'POST',
    body,
    dedupe: false,
  })
}
