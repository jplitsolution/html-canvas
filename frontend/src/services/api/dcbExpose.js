/**
 * Client helpers for vendor-scoped Universe DCB API expose URLs + payload download.
 */

export function buildDcbExposeUrls(origin, campaignId, vendorId) {
  const host = origin || 'https://your-domain.com'
  const cid = campaignId || '{campaignId}'
  const vid = vendorId || '{vendorId}'
  const base = `${host}/api/flow/dcb/${cid}/${vid}`
  return {
    base,
    pincodeUrl: `${base}/pincode`,
    confirmUrl: `${base}/confirm`,
    statusUrl: `${base}/status?msisdn=`,
    screenUrl: `${base}/screen`,
  }
}

const SAMPLE_MSISDN = '566891023'
const SAMPLE_REQUEST_ID = '16726123'

export function buildDcbExposeApiPayload({ origin, campaign, vendor, vendorId } = {}) {
  const cid = campaign?.id || '{campaignId}'
  const vid = vendorId || vendor?.id || '{vendorId}'
  const urls = buildDcbExposeUrls(origin, cid, vid)
  return [
    {
      comment:
        'Step 1 — send billing PIN to this MSISDN. Save requestId from the response; confirm needs it.',
      method: 'POST',
      url: urls.pincodeUrl,
      request: {
        msisdn: SAMPLE_MSISDN,
        purchaseTypeId: 3,
        transactionChannel: 'Wifi',
      },
      response: {
        sent: true,
        requestId: SAMPLE_REQUEST_ID,
        msisdn: SAMPLE_MSISDN,
        stage: 'PIN_REQUIRED',
        outcome: 'PENDING',
        message: 'PIN requested successfully',
      },
    },
    {
      comment:
        'Step 2 — confirm the PIN. Send only requestId + pin (no msisdn). Then poll status.',
      method: 'POST',
      url: urls.confirmUrl,
      request: {
        requestId: SAMPLE_REQUEST_ID,
        pin: '1234',
      },
      response: {
        verified: true,
        requestId: SAMPLE_REQUEST_ID,
        stage: 'POLLING',
        outcome: 'PENDING',
        message: 'PIN confirmed. Poll status until the subscription is entitled.',
      },
    },
    {
      comment:
        'Step 3 — poll subscription status until outcome is ENTITLED (user is billed / active).',
      method: 'GET',
      url: `${urls.statusUrl}${SAMPLE_MSISDN}`,
      request: {
        msisdn: SAMPLE_MSISDN,
      },
      response: {
        msisdn: SAMPLE_MSISDN,
        outcome: 'ENTITLED',
        status: 'ACTIVE',
        entitlementActive: true,
        current: true,
      },
    },
  ]
}

export function buildDcbExposeApiGuide(opts = {}) {
  return JSON.stringify(
    {
      comment:
        'Vendor DCB billing APIs. Call in order: pincode → confirm → status. GET or POST. Query or JSON body.',
      apis: buildDcbExposeApiPayload(opts),
    },
    null,
    2,
  )
}
