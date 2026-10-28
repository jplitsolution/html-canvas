/**
 * Google Ads Conversion Tracking Helper
 * Account: sandeep.mor@tickhigh.com
 * Conversion Action: Purchase conversion page
 */

export const GOOGLE_ADS_ID = 'AW-18398284654'
export const GOOGLE_ADS_PURCHASE_SEND_TO = 'AW-18398284654/AYcUCM31k-QcEO6W_sRE'

// In-memory cache for fired transaction IDs
const firedTransactions = new Set()

/**
 * Check if a conversion has already been tracked in this session
 */
function isAlreadyTracked(transactionId) {
  if (!transactionId) return false
  if (firedTransactions.has(transactionId)) return true
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return Boolean(window.sessionStorage.getItem(`gads_conv_${transactionId}`))
    }
  } catch {
    // Ignore sessionStorage access errors
  }
  return false
}

/**
 * Mark a conversion as tracked in this session
 */
function markAsTracked(transactionId) {
  if (!transactionId) return
  firedTransactions.add(transactionId)
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(`gads_conv_${transactionId}`, '1')
    }
  } catch {
    // Ignore sessionStorage access errors
  }
}

/**
 * Reset tracked transactions (useful for testing)
 */
export function resetTrackedConversions() {
  firedTransactions.clear()
}

/**
 * Track Google Ads Purchase Conversion
 * 
 * @param {Object} options
 * @param {string} [options.transactionId] Unique ID to deduplicate conversions
 * @param {number|string} [options.value=1.0] Order / Subscription value
 * @param {string} [options.currency='INR'] Currency code (e.g. 'INR')
 * @param {boolean} [options.isPreview=false] Flag to suppress tracking during editor preview
 * @returns {boolean} True if conversion event was fired, false otherwise
 */
export function trackGoogleAdsConversion({
  transactionId = '',
  value = 1.0,
  currency = 'INR',
  isPreview = false,
} = {}) {
  // Do not fire conversion during editor preview testing
  if (isPreview) {
    return false
  }

  const cleanTxId = String(transactionId || '').trim()

  // Prevent duplicate conversion fires
  if (cleanTxId && isAlreadyTracked(cleanTxId)) {
    return false
  }

  const numericValue = Number(value) > 0 ? Number(value) : 1.0
  const currencyCode = String(currency || 'INR').trim().toUpperCase()

  const payload = {
    send_to: GOOGLE_ADS_PURCHASE_SEND_TO,
    value: numericValue,
    currency: currencyCode,
  }

  if (cleanTxId) {
    payload.transaction_id = cleanTxId
  }

  if (typeof window !== 'undefined') {
    // If gtag exists, call it; otherwise shim into dataLayer
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', payload)
    } else {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push(['event', 'conversion', payload])
    }
  }

  if (cleanTxId) {
    markAsTracked(cleanTxId)
  }

  return true
}
