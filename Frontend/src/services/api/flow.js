const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function parseResponse(response) {
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(json.message || response.statusText || 'Request failed')
  }
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data
  }
  return json
}

export async function fetchFlowPage({ country, operator, page, msisdn, visitId, pack }) {
  const params = new URLSearchParams({
    country,
    operator,
    page,
  })
  if (msisdn) params.set('msisdn', msisdn)
  if (visitId) params.set('visitId', String(visitId))
  if (pack) params.set('pack', pack)

  const response = await fetch(`${API_BASE}/flow/page?${params.toString()}`)
  return parseResponse(response)
}

export async function prefetchFlowPage(params) {
  try {
    return await fetchFlowPage(params)
  } catch {
    return null
  }
}

export async function transitionFlow(body) {
  const response = await fetch(`${API_BASE}/flow/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseResponse(response)
}
