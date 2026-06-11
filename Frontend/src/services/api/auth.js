import { apiClient, setAuthToken, getAuthToken } from './client'

export async function register(credentials) {
  const result = await apiClient('/auth/register', {
    method: 'POST',
    body: credentials,
  })
  return result
}

export async function login(credentials) {
  const result = await apiClient('/auth/login', {
    method: 'POST',
    body: credentials,
  })
  if (result?.accessToken) {
    setAuthToken(result.accessToken)
  }
  return result
}

export async function logout() {
  setAuthToken(null)
}

export async function getCurrentUser() {
  if (!getAuthToken()) return null
  try {
    return await apiClient('/auth/me')
  } catch {
    setAuthToken(null)
    return null
  }
}
