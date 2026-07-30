import { apiClient } from './client'

export async function sendOtp({ phone, visitId, pack, campaignId }) {
  return apiClient('/otp/send', {
    method: 'POST',
    body: {
      phone,
      ...(visitId ? { visitId: Number(visitId) } : {}),
      ...(campaignId ? { campaignId: Number(campaignId) } : {}),
      ...(pack ? { pack } : {}),
    },
    dedupe: false,
  })
}

export async function verifyOtp({ phone, otp, visitId, campaignId }) {
  return apiClient('/otp/verify', {
    method: 'POST',
    body: {
      phone,
      otp,
      otpCode: otp,
      ...(visitId ? { visitId: Number(visitId) } : {}),
      ...(campaignId ? { campaignId: Number(campaignId) } : {}),
    },
    dedupe: false,
  })
}

