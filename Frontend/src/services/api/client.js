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

export async function apiClient(path, options = {}) {
  const token = getAuthToken()
  const isFormData = options.body instanceof FormData

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  if (!isFormData && options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body:
      options.body instanceof FormData || typeof options.body === 'string' || options.body == null
        ? options.body
        : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || 'API request failed')
  }

  if (response.status === 204) return null

  const json = await response.json()
  return unwrapResponse(json)
}
