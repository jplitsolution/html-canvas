/**
 * Safaricom Kenya HE — browser-side token → masked MSISDN.
 * Matches safwap-server-backup SPA (identity.safaricom.com must see handset IP).
 */

function normalizeMsisdn(value) {
  if (value == null || value === '') return ''
  return String(value).replace(/\D/g, '')
}

function getOrCreateSessionId(preferred) {
  const fromArg = String(preferred || '').trim()
  if (fromArg) return fromArg
  if (typeof window === 'undefined') {
    return `sid_${Date.now()}`
  }
  try {
    let sid =
      sessionStorage.getItem('session_id') ||
      sessionStorage.getItem('templatecraft_he_session_id')
    if (!sid) {
      sid = `sid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      sessionStorage.setItem('session_id', sid)
      sessionStorage.setItem('templatecraft_he_session_id', sid)
    }
    return sid
  } catch {
    return `sid_${Date.now()}`
  }
}

function extractMaskedPhone(body) {
  if (!body || typeof body !== 'object') return ''
  return (
    body?.data?.ServiceResponse?.ResponseBody?.Response?.Msisdn ||
    body?.ServiceResponse?.ResponseBody?.Response?.Msisdn ||
    body?.msisdn ||
    body?.MSISDN ||
    body?.data?.msisdn ||
    body?.MaskedMsisdn ||
    body?.maskedMsisdn ||
    ''
  )
}

async function readJsonSafe(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * @param {object} heClientConfig — from detect-msisdn needsClientHe response
 * @param {{ sessionId?: string }} [opts]
 * @returns {Promise<{
 *   phone: string,
 *   error: string|null,
 *   sessionId: string,
 *   heClientLogs: { token: object, msisdn?: object }
 * }>}
 */
export async function resolveSafaricomMaskedInBrowser(heClientConfig, opts = {}) {
  const cfg = heClientConfig || {}
  const tokenUrl = String(cfg.tokenUrl || '').trim()
  const maskedUrl = String(cfg.maskedUrl || '').trim()
  const failMessage =
    cfg.failMessage || 'Please use Safaricom Mobile Data'
  const sessionId = getOrCreateSessionId(opts.sessionId)

  if (!tokenUrl || !maskedUrl) {
    return {
      phone: '',
      error: 'Safaricom HE requires tokenUrl + maskedUrl',
      sessionId,
      heClientLogs: {},
    }
  }

  const tokenMethod = String(cfg.tokenMethod || 'POST').toUpperCase()
  const tokenHeaders = {
    'X-Session-ID': sessionId,
    'Content-Type': 'application/json',
  }
  const tokenBody = cfg.tokenBody && typeof cfg.tokenBody === 'object' ? cfg.tokenBody : {}

  let token = null
  let tokenResponseBody = null
  let tokenStatus = null
  let tokenError = null

  try {
    const tokenRes =
      tokenMethod === 'GET'
        ? await fetch(tokenUrl, { method: 'GET', headers: tokenHeaders })
        : await fetch(tokenUrl, {
            method: 'POST',
            headers: tokenHeaders,
            body: JSON.stringify(tokenBody),
          })
    tokenStatus = tokenRes.status
    tokenResponseBody = await readJsonSafe(tokenRes)
    if (!tokenRes.ok) {
      throw new Error(`HE token failed with status ${tokenRes.status}`)
    }
    token =
      tokenResponseBody?.access_token ||
      tokenResponseBody?.token ||
      tokenResponseBody?.data?.access_token ||
      tokenResponseBody?.data?.token ||
      (typeof tokenResponseBody === 'string' ? tokenResponseBody : null)
    if (!token) {
      throw new Error('HE token missing from tokenUrl response')
    }
  } catch (err) {
    tokenError = err?.message || String(err)
  }

  const heClientLogs = {
    token: {
      requestUrl: tokenUrl,
      method: tokenMethod,
      headers: tokenHeaders,
      body: tokenBody,
      requestBody: {
        method: tokenMethod,
        headers: tokenHeaders,
        body: tokenBody,
        source: 'browser',
      },
      responseStatus: tokenStatus,
      responseBody: tokenResponseBody,
      success: Boolean(token),
      errorMessage: tokenError,
    },
  }

  if (!token) {
    return {
      phone: '',
      error: tokenError || 'HE token missing from tokenUrl response',
      sessionId,
      heClientLogs,
    }
  }

  const maskedHeaders = {
    Authorization: `Bearer ${token}`,
    'X-App': cfg.xApp || 'he-partner',
    'X-MessageID': String(cfg.xMessageId || '1234'),
    'X-Source-System': cfg.xSourceSystem || 'he-partner',
  }

  let msisdnStatus = null
  let msisdnBody = null
  let msisdnError = null
  let phone = ''

  try {
    const msisdnRes = await fetch(maskedUrl, {
      method: 'GET',
      headers: maskedHeaders,
    })
    msisdnStatus = msisdnRes.status
    msisdnBody = await readJsonSafe(msisdnRes)
    if (!msisdnRes.ok) {
      throw new Error(`Request failed with status code ${msisdnRes.status}`)
    }
    phone = normalizeMsisdn(extractMaskedPhone(msisdnBody))
    if (!phone) {
      const customerMessage =
        msisdnBody?.header?.customerMessage || failMessage
      throw new Error(customerMessage)
    }
  } catch (err) {
    msisdnError = err?.message || String(err)
  }

  heClientLogs.msisdn = {
    requestUrl: maskedUrl,
    method: 'GET',
    headers: {
      ...maskedHeaders,
      // Keep full bearer in Session Detail (same as server HE logging).
    },
    requestBody: {
      method: 'GET',
      headers: maskedHeaders,
      source: 'browser',
    },
    responseStatus: msisdnStatus,
    responseBody: msisdnBody,
    success: Boolean(phone),
    errorMessage: msisdnError,
  }

  return {
    phone,
    error: phone ? null : msisdnError || failMessage,
    sessionId,
    heClientLogs,
  }
}
