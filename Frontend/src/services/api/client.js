const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function apiClient(path, options = {}) {
  const token = localStorage.getItem('templatecraft_auth_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || 'API request failed')
  }

  if (response.status === 204) return null
  return response.json()
}
