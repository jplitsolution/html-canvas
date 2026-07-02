/**
 * MSISDN / phone resolution for the subscription funnel.
 *
 * Priority order:
 * 1. URL params (msisdn, phone, mobile) — testing / deep links
 * 2. window.__templatecraft_resolvePhone() — your custom async hook
 * 3. resolvePhoneFromOperator() below — paste operator SDK here
 * 4. sessionStorage / localStorage
 * 5. window.__TC_MSISDN__ or window.msisdn — injected by external script
 * 6. localhost dev fallback (development only)
 */

const URL_KEYS = ['msisdn', 'phone', 'mobile', 'mob', 'MSISDN']
const STORAGE_KEYS = ['templatecraft_msisdn', 'msisdn', 'phone', 'mobile']

export function normalizeMsisdn(value) {
  if (value == null || value === '') return ''
  return String(value).replace(/\D/g, '')
}

export function resolvePhoneFromUrl(searchParams) {
  if (!searchParams) return ''
  for (const key of URL_KEYS) {
    const raw = searchParams.get(key)
    if (raw) return normalizeMsisdn(raw)
  }
  return ''
}

export function resolvePhoneFromStorage() {
  if (typeof window === 'undefined') return ''
  for (const key of STORAGE_KEYS) {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key)
    if (raw) return normalizeMsisdn(raw)
  }
  return ''
}

export function resolvePhoneFromWindow() {
  if (typeof window === 'undefined') return ''
  const candidates = [window.__TC_MSISDN__, window.__MSISDN__, window.msisdn]
  for (const value of candidates) {
    if (value) return normalizeMsisdn(value)
  }
  return ''
}

export function persistPhone(phone) {
  if (!phone || typeof window === 'undefined') return
  try {
    sessionStorage.setItem('templatecraft_msisdn', phone)
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Replace this function body when you receive operator / header-enrichment code.
 *
 * @example
 * export async function resolvePhoneFromOperator() {
 *   const response = await fetch('https://operator-api.example/msisdn', { credentials: 'include' })
 *   const data = await response.json()
 *   return normalizeMsisdn(data.msisdn)
 * }
 */
export async function resolvePhoneFromOperator() {
  return null
}

async function resolveCustomHook() {
  if (typeof window === 'undefined') return ''
  const resolver = window.__templatecraft_resolvePhone
  if (typeof resolver !== 'function') return ''
  try {
    const result = await resolver()
    return normalizeMsisdn(result)
  } catch (err) {
    console.warn('[resolvePhoneNumber] custom hook failed:', err)
    return ''
  }
}

function resolveDevFallback() {
  // Keep URLs clean and ensure the OTP gate appears when MSISDN
  // isn't truly available. If you need a dev override, pass it
  // explicitly via URL (?msisdn=...) or storage.
  return ''
}

/**
 * @param {URLSearchParams} searchParams
 * @returns {Promise<{ phone: string, source: string }>}
 */
export async function resolvePhoneNumber(searchParams) {
  const fromUrl = resolvePhoneFromUrl(searchParams)
  if (fromUrl) {
    persistPhone(fromUrl)
    return { phone: fromUrl, source: 'url' }
  }

  const fromCustom = await resolveCustomHook()
  if (fromCustom) {
    persistPhone(fromCustom)
    return { phone: fromCustom, source: 'custom' }
  }

  const fromOperator = normalizeMsisdn(await resolvePhoneFromOperator())
  if (fromOperator) {
    persistPhone(fromOperator)
    return { phone: fromOperator, source: 'operator' }
  }

  const fromStorage = resolvePhoneFromStorage()
  if (fromStorage) return { phone: fromStorage, source: 'storage' }

  const fromWindow = resolvePhoneFromWindow()
  if (fromWindow) {
    persistPhone(fromWindow)
    return { phone: fromWindow, source: 'window' }
  }

  const devPhone = resolveDevFallback()
  if (devPhone) return { phone: devPhone, source: 'dev' }

  return { phone: '', source: 'none' }
}
