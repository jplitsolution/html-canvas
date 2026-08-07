import { HE_SUPPRESSED_FUNNEL_PAGES, VALID_PACKS, VALID_PAGES } from './constants'

function isApiHeProvider(provider) {
  const p = String(provider || '').toLowerCase()
  return p === 'safaricom_masked' || p === 'custom_http' || p === 'custom'
}

function isHeSuppressedFunnelPage(page) {
  return HE_SUPPRESSED_FUNNEL_PAGES.has(String(page || '').toUpperCase())
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

function normalizePack(value) {
  const pack = (value || 'daily').toLowerCase()
  return VALID_PACKS.includes(pack) ? pack : 'daily'
}

function findActionTarget(event) {
  const path = event.composedPath?.() || []
  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue
    if (node.closest('[data-pack]')) continue
    if (!node.matches('[data-action], [data-actions], button, a, [data-tc-type="hotspot"]')) continue
    const action =
      node.getAttribute('data-action') ||
      (node.hasAttribute('data-actions') ? 'CHAIN' : null) ||
      (node.textContent?.toLowerCase().includes('confirm') ? 'CONFIRM' : null) ||
      (node.textContent?.toLowerCase().includes('subscribe') ? 'SUBSCRIBE' : null)
    if (action) return { node, action }
  }
  return null
}

export {
  isApiHeProvider,
  isHeSuppressedFunnelPage,
  pageForChecksubStatus,
  normalizeDetectNextPage,
  isCampaignPageHref,
  normalizePack,
  findActionTarget,
}
