import { getApiBase, getAuthToken } from './client'

export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${getApiBase()}/uploads`, {
    method: 'POST',
    headers: {
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || 'Upload failed')
  }

  const json = await response.json()
  return json.data || json
}
