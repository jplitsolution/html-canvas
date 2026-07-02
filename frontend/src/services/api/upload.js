import { getApiBase, getAuthToken } from './client'

/** Unwrap Nest transform interceptor + legacy nested `{ data: { url } }` shapes */
function unwrapUploadPayload(json) {
  let payload = json

  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    payload = payload.data
  }

  if (payload && typeof payload === 'object' && payload.data?.url) {
    payload = payload.data
  }

  return payload
}

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
  const result = unwrapUploadPayload(json)

  if (!result?.url) {
    throw new Error('Upload succeeded but no image URL was returned')
  }

  return result
}
