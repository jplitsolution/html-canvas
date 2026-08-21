import { apiClient } from './client'

export function clampPayoutPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 100
  return Math.min(100, Math.max(0, Math.round(n)))
}

export function buildOtpExposeUrls(origin, campaignId, vendorId) {
  const host = origin || 'https://your-domain.com'
  const cid = campaignId || '{campaignId}'
  const vid = vendorId || '{vendorId}'
  const base = `${host}/api/otp/${cid}/${vid}`
  return {
    base,
    sendUrl: `${base}/send?msisdn=`,
    verifyUrl: `${base}/verify?msisdn=&otp=`,
  }
}

const SAMPLE_MSISDN = '566891023'

export function buildOtpExposeApiPayload({ origin, campaign, vendor, vendorId } = {}) {
  const cid = campaign?.id || '{campaignId}'
  const vid = vendorId || vendor?.id || '{vendorId}'
  const urls = buildOtpExposeUrls(origin, cid, vid)
  return [
    {
      comment: 'Step 1 — send OTP to this MSISDN. Use the same msisdn on verify.',
      method: 'POST',
      url: urls.sendUrl.replace(/\?.*$/, ''),
      request: {
        msisdn: SAMPLE_MSISDN,
        pack: 'daily',
      },
      response: {
        sent: true,
        visitId: 1,
        msisdn: SAMPLE_MSISDN,
        message: 'OTP sent successfully',
      },
    },
    {
      comment: 'Step 2 — verify the OTP the user received. Conversion is counted on success.',
      method: 'POST',
      url: urls.verifyUrl.replace(/\?.*$/, ''),
      request: {
        msisdn: SAMPLE_MSISDN,
        otp: '1234',
      },
      response: {
        verified: true,
        visitId: 1,
        msisdn: SAMPLE_MSISDN,
        message: 'OTP verified successfully',
      },
    },
  ]
}

export function buildOtpExposeApiGuide(opts = {}) {
  return JSON.stringify(
    {
      comment: 'Vendor OTP APIs. Call in order: send → verify. GET or POST. Query or JSON body.',
      apis: buildOtpExposeApiPayload(opts),
    },
    null,
    2,
  )
}

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

