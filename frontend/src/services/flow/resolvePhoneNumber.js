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
import { resolveSafaricomMaskedInBrowser } from './safaricomHe'

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

function mapDetectResponse(res) {
  if (!res) return null
  return {
    phone: normalizeMsisdn(res.phone),
    subscribed: res.subscribed,
    isActive: Boolean(res.isActive),
    subscriptionStatus: res.subscriptionStatus || null,
    blocked: res.blocked,
    blockReason: res.blockReason || null,
    nextPage: res.nextPage || null,
    heProvider: res.heProvider || null,
    heError: res.heError || null,
    needsClientHe: Boolean(res.needsClientHe),
    heClientConfig: res.heClientConfig || null,
    failRedirectUrl: res.failRedirectUrl || null,
    successRedirectUrl: res.successRedirectUrl || null,
    cgRedirectUrl: res.cgRedirectUrl || null,
    visitId: res.visitId || null,
    clickId: res.clickId || null,
    rcid: res.rcid || null,
    campaignId: res.campaignId || null,
  }
}

/**
 * Resolves phone number from operator header enrichment API.
 * Always returns an object (phone may be empty) so fail/success redirects stay available.
 *
 * Safaricom masked HE: detect may return needsClientHe → browser token/MSISDN
 * (safwap parity) → second detect with heSource=browser.
 */
export async function resolvePhoneFromOperator(context = {}) {
  try {
    let res = await detectMsisdnApi(context)
    if (!res) return null

    if (res.needsClientHe && res.heClientConfig) {
      const browserHe = await resolveSafaricomMaskedInBrowser(res.heClientConfig, {
        sessionId: context.sessionId,
      })
      res = await detectMsisdnApi({
        ...context,
        phone: browserHe.phone || undefined,
        visitId: res.visitId || context.visitId,
        clickId: res.clickId || context.clickId,
        rcid: res.rcid || context.rcid,
        sessionId: browserHe.sessionId || context.sessionId,
        heSource: 'browser',
        heClientLogs: browserHe.heClientLogs,
        heClientError: browserHe.error || undefined,
      })
      if (!res) {
        return {
          phone: normalizeMsisdn(browserHe.phone),
          subscribed: false,
          isActive: false,
          subscriptionStatus: null,
          blocked: false,
          blockReason: null,
          nextPage: null,
          heProvider: 'safaricom_masked',
          heError: browserHe.error || null,
          failRedirectUrl: null,
          successRedirectUrl: null,
          cgRedirectUrl: null,
          visitId: null,
          clickId: null,
          rcid: null,
          campaignId: null,
        }
      }
    }

    return mapDetectResponse(res)
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
 * Open HE success/fail URL as configured.
 * Never append click_id / campid / rcid — those stay internal only.
 * Only fills {{msisdn}} / {{phone}} placeholders when present; does not
 * auto-append query params.
 */
export function appendHeAttributionToUrl(rawUrl, attrs = {}) {
  let url = String(rawUrl || '').trim()
  if (!isHeRedirectUrl(url)) return ''

  const msisdn = normalizeMsisdn(attrs.msisdn || attrs.phone || '')
  const vars = {
    msisdn,
    phone: msisdn,
  }
  for (const [key, val] of Object.entries(vars)) {
    url = url.split(`{{${key}}}`).join(encodeURIComponent(val))
    url = url.split(`{${key}}`).join(encodeURIComponent(val))
  }
  return url
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
      nextPage: null,
      visitId: null,
      clickId: null,
      rcid: null,
      campaignId: null,
    }
  }
  return {
    failRedirectUrl: operatorRes.failRedirectUrl || null,
    successRedirectUrl: operatorRes.successRedirectUrl || null,
    cgRedirectUrl: operatorRes.cgRedirectUrl || null,
    nextPage: operatorRes.nextPage || null,
    visitId: operatorRes.visitId || null,
    clickId: operatorRes.clickId || null,
    rcid: operatorRes.rcid || null,
    campaignId: operatorRes.campaignId || null,
  }
}

function detectDecisionFields(operatorRes) {
  return {
    subscribed: operatorRes?.subscribed,
    isActive: Boolean(operatorRes?.isActive),
    subscriptionStatus: operatorRes?.subscriptionStatus || null,
    blocked: Boolean(operatorRes?.blocked),
    blockReason: operatorRes?.blockReason || null,
  }
}

/**
 * @param {URLSearchParams} searchParams
 * @param {Object} [context]
 * @returns {Promise<{
 *   phone: string,
 *   source: string,
 *   subscribed?: boolean,
 *   isActive?: boolean,
 *   subscriptionStatus?: string|null,
 *   blocked?: boolean,
 *   blockReason?: string|null,
 *   heProvider?: string|null,
 *   heError?: string|null,
 *   failRedirectUrl?: string|null,
 *   successRedirectUrl?: string|null,
 *   cgRedirectUrl?: string|null,
 *   nextPage?: string|null,
 * }>}
 */
function isApiHeProviderName(heProvider) {
  const p = String(heProvider || '').toLowerCase()
  return p === 'safaricom_masked' || p === 'custom_http' || p === 'custom'
}

export async function resolvePhoneNumber(searchParams, context = {}) {
  const fromUrl = resolvePhoneFromUrl(searchParams)
  // Still hit detect for HE redirect URLs even when msisdn is already in the query.
  const operatorRes = await resolvePhoneFromOperator(context)
  const apiHeNoPhone =
    isApiHeProviderName(operatorRes?.heProvider) &&
    operatorRes &&
    !normalizeMsisdn(operatorRes.phone)

  // API HE failed (no phone from partner) — ignore stale URL/custom msisdn so
  // failRedirectUrl runs instead of getting stuck on "Redirecting…".
  if (apiHeNoPhone) {
    return {
      phone: '',
      source: 'operator',
      ...detectDecisionFields(operatorRes),
      heProvider: operatorRes.heProvider,
      heError: operatorRes.heError,
      ...redirectFields(operatorRes),
    }
  }

  if (fromUrl) {
    persistPhone(fromUrl)
    return {
      phone: fromUrl,
      source: 'url',
      ...detectDecisionFields(operatorRes),
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
      ...detectDecisionFields(operatorRes),
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
      ...detectDecisionFields(operatorRes),
      heProvider: operatorRes.heProvider,
      heError: operatorRes.heError,
      ...redirectFields(operatorRes),
    }
  }

  // Token/API HE with no MSISDN — do not fall back to storage/window; use fail redirect.
  if (isApiHeProviderName(operatorRes?.heProvider) && operatorRes) {
    return {
      phone: '',
      source: 'operator',
      ...detectDecisionFields(operatorRes),
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
      ...detectDecisionFields(operatorRes),
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
      ...detectDecisionFields(operatorRes),
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
