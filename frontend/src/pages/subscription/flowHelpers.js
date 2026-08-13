import {
  isHeRedirectUrl,
  pickHeFailRedirectUrl,
} from '../../services/flow/resolvePhoneNumber'
import { HE_SUPPRESSED_FUNNEL_PAGES, VALID_PACKS, VALID_PAGES } from './constants'

function isApiHeProvider(provider) {
  const p = String(provider || '').toLowerCase()
  return p === 'safaricom_masked' || p === 'custom_http' || p === 'custom'
}

function isHeSuppressedFunnelPage(page) {
  return HE_SUPPRESSED_FUNNEL_PAGES.has(String(page || '').toUpperCase())
}

/**
 * Silent exit (skip HOME) vs funnel (show HOME) for token/API HE.
 *
 * Contract:
 * - Success URL set + MSISDN → success redirect (no HOME)
 * - No MSISDN + fail/CG URL → fail redirect (no HOME)
 * - Success/fail exit empty → HOME funnel after detect
 */
function isHeSilentExitMode({
  phone,
  successRedirectUrl,
  failRedirectUrl,
  cgRedirectUrl,
} = {}) {
  const hasPhone = Boolean(String(phone || '').trim())
  if (hasPhone && isHeRedirectUrl(successRedirectUrl)) return true
  if (!hasPhone && pickHeFailRedirectUrl({ failRedirectUrl, cgRedirectUrl })) {
    return true
  }
  return false
}

function pageForChecksubStatus(currentStatus) {
  const s = String(currentStatus || '')
    .trim()
    .toLowerCase()
  if (s === 'active') return 'THANKYOU'
  if (s === 'pending') return 'INPROGRESS'
  if (s === 'grace' || s === 'parking') return 'LOW_BALANCE'
  if (s && s !== 'new' && s !== 'unknown') return 'INPROGRESS'
  return null
}

function normalizeDetectNextPage(page) {
  const normalized = String(page || '').trim().toUpperCase()
  return VALID_PAGES.includes(normalized) ? normalized : null
}

/** Editor stores campaign page links as bare tokens (href="CONFIRM"), not full URLs. */
function isCampaignPageHref(href) {
  return VALID_PAGES.includes(String(href || '').trim().toUpperCase())
}

/** True when href is a real jump (page token, URL, or in-page anchor) — not bare "#". */
function hrefIsNavigationTarget(href) {
  const h = String(href || '').trim()
  if (!h || h === '#') return false
  if (h.startsWith('#')) return true
  if (/^(https?:|mailto:|tel:)/i.test(h)) return true
  if (isCampaignPageHref(h)) return true
  return false
}

function normalizePack(value) {
  const pack = (value || 'daily').toLowerCase()
  return VALID_PACKS.includes(pack) ? pack : 'daily'
}

/** Pack params + postback flag from a pack / subscribe button. */
function packSubscribeExtras(node) {
  const serviceId = String(node?.getAttribute?.('data-service-id') || '').trim()
  const subServiceId = String(node?.getAttribute?.('data-sub-service-id') || '').trim()
  const postbackAttr = node?.getAttribute?.('data-postback')
  const idOk = (v) => v && !/^https?:/i.test(v) && !/\{\{|\}\}/.test(v)
  return {
    ...(idOk(serviceId) ? { serviceId } : {}),
    ...(idOk(subServiceId) ? { subServiceId } : {}),
    queuePostback: postbackAttr === '0' || postbackAttr === 'false' ? false : true,
  }
}

function isPackSubscribeAction(action) {
  const a = String(action || '').toUpperCase()
  return a === 'SUBSCRIBE_ROUTE' || a === 'CONFIRM' || a === 'SUBSCRIBE'
}

/** True when data-pack is only a picker (not subscribe and not a URL/page jump). */
function shouldSelectPackOnly(el) {
  if (!el?.hasAttribute?.('data-pack')) return false
  if (isPackSubscribeAction(el.getAttribute('data-action'))) return false
  const href = (el.getAttribute('href') || '').trim()
  if (hrefIsNavigationTarget(href)) return false
  return true
}

function findActionTarget(event) {
  const path = event.composedPath?.() || []
  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue
    if (node.closest('[data-pack]')) {
      const packEl = node.hasAttribute('data-pack')
        ? node
        : node.closest('[data-pack]')
      const packAction = String(packEl.getAttribute('data-action') || '').toUpperCase()
      if (isPackSubscribeAction(packAction)) {
        return { node: packEl, action: packAction }
      }
      if (hrefIsNavigationTarget(packEl.getAttribute('href'))) {
        return { node: packEl, action: null }
      }
      continue
    }
    if (!node.matches('[data-action], [data-actions], button, a, [data-tc-type="hotspot"]')) continue

    const explicit =
      node.getAttribute('data-action') ||
      (node.hasAttribute('data-actions') ? 'CHAIN' : null)

    if (explicit) return { node, action: explicit }

    const href = (node.getAttribute('href') || '').trim()
    // Reconfigured Subscribe/Confirm → page / URL / anchor: do NOT invent action from label text
    if (hrefIsNavigationTarget(href)) {
      return { node, action: null }
    }

    // Legacy fallback: bare flow button missing data-action
    const text = node.textContent?.toLowerCase() || ''
    if (text.includes('confirm')) return { node, action: 'CONFIRM' }
    if (text.includes('subscribe')) return { node, action: 'SUBSCRIBE' }
  }
  return null
}

export {
  isApiHeProvider,
  isHeSuppressedFunnelPage,
  isHeSilentExitMode,
  pageForChecksubStatus,
  normalizeDetectNextPage,
  isCampaignPageHref,
  hrefIsNavigationTarget,
  normalizePack,
  packSubscribeExtras,
  isPackSubscribeAction,
  shouldSelectPackOnly,
  findActionTarget,
}
