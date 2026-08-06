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

import { detectMsisdnApi } from '../api/flow'

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
 * Resolves phone number from operator header enrichment API.
 * Always returns an object (phone may be empty) so fail/success redirects stay available.
 */
export async function resolvePhoneFromOperator(context = {}) {
  try {
    const res = await detectMsisdnApi(context)
    if (!res) return null
    return {
      phone: normalizeMsisdn(res.phone),
      subscribed: res.subscribed,
      blocked: res.blocked,
      heProvider: res.heProvider || null,
      heError: res.heError || null,
      failRedirectUrl: res.failRedirectUrl || null,
      successRedirectUrl: res.successRedirectUrl || null,
      cgRedirectUrl: res.cgRedirectUrl || null,
    }
  } catch (err) {
    console.warn('[resolvePhoneFromOperator] detection failed:', err)
  }
  return null
}

/** Absolute http(s) HE redirect only. */
export function isHeRedirectUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

/**
 * Prefer backend-resolved failRedirectUrl (already includes CG fallback for API HE).
 * cgRedirectUrl is a secondary FE fallback if older backends omit failRedirectUrl.
 */
export function pickHeFailRedirectUrl({ failRedirectUrl, cgRedirectUrl } = {}) {
  if (isHeRedirectUrl(failRedirectUrl)) return String(failRedirectUrl).trim()
  if (isHeRedirectUrl(cgRedirectUrl)) return String(cgRedirectUrl).trim()
  return ''
}

/**
 * Ensure outbound CG / HE redirect carries attribution for postbacks:
 * click_id (ours), rcid (vendor/affiliate original), msisdn when known.
 * Replaces {{click_id}} / {{msisdn}} etc., or appends query params.
 */
export function appendHeAttributionToUrl(rawUrl, attrs = {}) {
  let url = String(rawUrl || '').trim()
  if (!isHeRedirectUrl(url)) return ''

  const clickId = String(attrs.clickId || attrs.click_id || '').trim()
  const rcid = String(attrs.rcid || '').trim()
  const msisdn = normalizeMsisdn(attrs.msisdn || attrs.phone || '')
  const campid = attrs.campid != null ? String(attrs.campid) : ''

  const vars = {
    click_id: clickId,
    clickId,
    rcid,
    msisdn,
    phone: msisdn,
    campid,
  }
  const original = url
  for (const [key, val] of Object.entries(vars)) {
    url = url.split(`{{${key}}}`).join(encodeURIComponent(val))
    url = url.split(`{${key}}`).join(encodeURIComponent(val))
  }

  const hadClick = /\{\{?(?:click_id|clickId|rcid)\}?\}/.test(original)
  const hadMsisdn = /\{\{?(?:msisdn|phone)\}?\}/.test(original)

  try {
    const u = new URL(url)
    if (clickId && !hadClick && !u.searchParams.has('click_id')) {
      u.searchParams.set('click_id', clickId)
    }
    if (rcid && rcid !== clickId && !u.searchParams.has('rcid')) {
      u.searchParams.set('rcid', rcid)
    }
    if (msisdn && !hadMsisdn && !u.searchParams.has('msisdn')) {
      u.searchParams.set('msisdn', msisdn)
    }
    if (campid && !u.searchParams.has('campid')) {
      u.searchParams.set('campid', campid)
    }
    return u.toString()
  } catch {
    return url
  }
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
  return ''
}

function redirectFields(operatorRes) {
  if (!operatorRes) {
    return {
      failRedirectUrl: null,
      successRedirectUrl: null,
      cgRedirectUrl: null,
    }
  }
  return {
    failRedirectUrl: operatorRes.failRedirectUrl || null,
    successRedirectUrl: operatorRes.successRedirectUrl || null,
    cgRedirectUrl: operatorRes.cgRedirectUrl || null,
  }
}

/**
 * @param {URLSearchParams} searchParams
 * @param {Object} [context]
 * @returns {Promise<{
 *   phone: string,
 *   source: string,
 *   subscribed?: boolean,
 *   blocked?: boolean,
 *   heProvider?: string|null,
 *   heError?: string|null,
 *   failRedirectUrl?: string|null,
 *   successRedirectUrl?: string|null,
 *   cgRedirectUrl?: string|null,
 * }>}
 */
export async function resolvePhoneNumber(searchParams, context = {}) {
  const fromUrl = resolvePhoneFromUrl(searchParams)
  // Still hit detect for HE redirect URLs even when msisdn is already in the query.
  const operatorRes = await resolvePhoneFromOperator(context)

  if (fromUrl) {
    persistPhone(fromUrl)
    return {
      phone: fromUrl,
      source: 'url',
      heProvider: operatorRes?.heProvider,
      heError: operatorRes?.heError,
      ...redirectFields(operatorRes),
    }
  }

  const fromCustom = await resolveCustomHook()
  if (fromCustom) {
    persistPhone(fromCustom)
    return {
      phone: fromCustom,
      source: 'custom',
      heProvider: operatorRes?.heProvider,
      heError: operatorRes?.heError,
      ...redirectFields(operatorRes),
    }
  }

  if (operatorRes?.phone) {
    const phone = normalizeMsisdn(operatorRes.phone)
    persistPhone(phone)
    return {
      phone,
      source: 'operator',
      subscribed: operatorRes.subscribed,
      blocked: operatorRes.blocked,
      heProvider: operatorRes.heProvider,
      heError: operatorRes.heError,
      ...redirectFields(operatorRes),
    }
  }

  const fromStorage = resolvePhoneFromStorage()
  if (fromStorage) {
    return {
      phone: fromStorage,
      source: 'storage',
      heProvider: operatorRes?.heProvider,
      heError: operatorRes?.heError,
      ...redirectFields(operatorRes),
    }
  }

  const fromWindow = resolvePhoneFromWindow()
  if (fromWindow) {
    persistPhone(fromWindow)
    return {
      phone: fromWindow,
      source: 'window',
      heProvider: operatorRes?.heProvider,
      heError: operatorRes?.heError,
      ...redirectFields(operatorRes),
    }
  }

  const devPhone = resolveDevFallback()
  if (devPhone) return { phone: devPhone, source: 'dev' }

  return {
    phone: '',
    source: operatorRes ? 'operator' : 'none',
    heProvider: operatorRes?.heProvider || null,
    heError: operatorRes?.heError || null,
    ...redirectFields(operatorRes),
  }
}
