const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export function getApiBase() {
  return API_BASE
}

export function getAuthToken() {
  return localStorage.getItem('templatecraft_auth_token')
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('templatecraft_auth_token', token)
  } else {
    localStorage.removeItem('templatecraft_auth_token')
  }
}

function unwrapResponse(json) {
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data
  }
  return json
}

function stableStringify(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, Object.keys(value).sort())
  } catch {
    return String(value)
  }
}

const inflight = new Map()

export async function apiClient(path, options = {}) {
  const token = getAuthToken()
  const isFormData = options.body instanceof FormData

  const method = String(options.method || 'GET').toUpperCase()
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  if (!isFormData && options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const url = `${API_BASE}${path}`
  const body =
    options.body instanceof FormData || typeof options.body === 'string' || options.body == null
      ? options.body
      : JSON.stringify(options.body)

  // Deduplicate identical inflight requests (e.g. React StrictMode double-invokes effects in dev).
  // Only affects concurrent requests; completed responses are not cached.
  const dedupeEnabled = options.dedupe !== false
  const dedupeKey =
    dedupeEnabled && !(options.body instanceof FormData)
      ? [
          method,
          url,
          stableStringify(body),
          stableStringify(headers?.Authorization || ''),
          stableStringify(headers?.['X-MSISDN'] || headers?.['x-msisdn'] || ''),
        ].join('|')
      : null

  if (dedupeKey && inflight.has(dedupeKey)) return inflight.get(dedupeKey)

  const controller = new AbortController()
  const timeoutMs = options.timeout !== undefined ? options.timeout : 15000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const promise = (async () => {
    try {
      const response = await fetch(url, {
        ...options,
        method,
        headers,
        body,
        signal: controller.signal,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }))
        throw new Error(error.message || 'API request failed')
      }

      if (response.status === 204) return null

      const json = await response.json()
      return unwrapResponse(json)
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Network timeout. Please check your connection and try again.')
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }
  })()

  if (dedupeKey) inflight.set(dedupeKey, promise)
  try {
    return await promise
  } finally {
    if (dedupeKey) inflight.delete(dedupeKey)
  }
}
