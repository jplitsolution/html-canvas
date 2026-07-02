import { apiClient } from './client'

export async function sendOtp({ phone, visitId }) {
  return apiClient('/otp/send', {
    method: 'POST',
    body: { phone, ...(visitId ? { visitId: String(visitId) } : {}) },
    dedupe: false,
  })
}

export async function verifyOtp({ phone, otp }) {
  return apiClient('/otp/verify', {
    method: 'POST',
    body: { phone, otp },
    dedupe: false,
  })
}

