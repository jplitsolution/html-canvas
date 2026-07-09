import { apiClient } from './client'

export async function sendOtp({ phone, visitId, pack }) {
  return apiClient('/otp/send', {
    method: 'POST',
    body: {
      phone,
      ...(visitId ? { visitId: Number(visitId) } : {}),
      ...(pack ? { pack } : {}),
    },
    dedupe: false,
  })
}

export async function verifyOtp({ phone, otp, visitId }) {
  return apiClient('/otp/verify', {
    method: 'POST',
    body: { phone, otp, ...(visitId ? { visitId: Number(visitId) } : {}) },
    dedupe: false,
  })
}

