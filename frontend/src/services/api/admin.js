import { apiClient } from './client'

export async function getCacheStats() {
  return apiClient('/admin/cache/stats')
}

export async function clearCache({ scope = 'all', pattern = '' } = {}) {
  return apiClient('/admin/cache/clear', {
    method: 'POST',
    body: { scope, pattern },
  })
}

export async function listCacheKeys({ pattern = '*', limit = 50 } = {}) {
  const params = new URLSearchParams()
  if (pattern) params.set('pattern', pattern)
  if (limit) params.set('limit', String(limit))
  return apiClient(`/admin/cache/keys?${params.toString()}`)
}

export async function deleteCacheKey(key) {
  return apiClient('/admin/cache/key', {
    method: 'DELETE',
    body: { key },
  })
}
