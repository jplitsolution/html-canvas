import { apiClient } from './client'

function compactPayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )
}

function stripProviderRequestIds(value) {
  return value
}

async function postDcb(path, payload) {
  const response = await apiClient(`/flow/dcb/${path}`, {
    method: 'POST',
    body: compactPayload(payload),
    dedupe: false,
    timeout: 30000,
  })
  return stripProviderRequestIds(response)
}

export async function getDcbConfig(params = {}) {
  const query = new URLSearchParams(compactPayload(params))
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const response = await apiClient(`/flow/dcb/config${suffix}`, { method: 'GET' })
  return stripProviderRequestIds(response)
}

export function checkDcbMsisdn(payload) {
  return postDcb('manual-check', payload)
}

export function sendDcbPincode(payload) {
  return postDcb('pincode', payload)
}

export function confirmDcbPincode(payload) {
  return postDcb('confirm', payload)
}

export function fetchDcbStatus(payload) {
  return postDcb('status', payload)
}

export { stripProviderRequestIds }
