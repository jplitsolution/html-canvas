import getConfig from '../../../config/configuration.js';

export function extractHeaderMsisdn(headers) {
  if (!headers) return '';
  const candidate =
    headers['x-msisdn'] ||
    headers['x-msisdn-number'] ||
    headers['msisdn'] ||
    headers['x-up-calling-line-id'] ||
    headers['x-fh-msisdn'] ||
    headers['user-identity-forward-msisdn'] ||
    headers['http-msisdn'] ||
    headers['x-network-info'] ||
    headers['x-operator-msisdn'] ||
    '';
  return Array.isArray(candidate) ? candidate[0] : String(candidate || '');
}

/**
 * Resolve MSISDN for HE flows.
 * Priority:
 *   1) Real carrier HE header (x-msisdn, …) — always wins
 *   2) Query msisdn/phone (already known from URL/session)
 *   3) HE_DUMMY_MSISDN — ONLY when header is absent (and no query phone)
 */
export function resolveRequestMsisdn(headers, query = {}) {
  const headerPhone = String(extractHeaderMsisdn(headers) || '').replace(/\D/g, '');
  const queryPhone = String(query.msisdn || query.phone || '').replace(/\D/g, '');

  // Real operator header enrichment — never replace with dummy.
  if (headerPhone) {
    return { phone: headerPhone, source: 'header', headerPhone };
  }

  // Session / URL already has a number (user entered or prior resolve).
  if (queryPhone) {
    return { phone: queryPhone, source: 'query', headerPhone: '' };
  }

  // Local / test fallback — only when no HE header arrived.
  const config = getConfig();
  const dummy = config.heDummyMsisdn || '';
  if (dummy) {
    const isProd = String(config.environment || '').toLowerCase() === 'production';
    if (isProd) {
      console.warn(
        `[HE DEBUG] no HE header — using HE_DUMMY_MSISDN=${dummy} (unset on live operator traffic)`,
      );
    } else {
      console.log(`[HE DEBUG] no HE header — using HE_DUMMY_MSISDN=${dummy}`);
    }
    return { phone: dummy, source: 'he_dummy_msisdn', headerPhone: '' };
  }

  return { phone: '', source: null, headerPhone: '' };
}

/**
 * Dual-ID intake:
 * - rcid = affiliate original (explicit rcid, else first-land click_id when no visit yet)
 * - clickId = our id once issued (click_id / clickId); on first land may equal affiliate's
 *   until visit create rewrites it — service treats input.rcid || input.clickId as affiliate rcid.
 */
export function resolveAttributionParams(q = {}) {
  const hasVisit = Boolean(q.visitId);
  const rcid = String(q.rcid || (!hasVisit ? q.click_id || q.clickId || '' : '') || '').trim();
  const clickId = String(q.clickId || q.click_id || '').trim();
  return {
    rcid: rcid || undefined,
    clickId: clickId || undefined,
  };
}

/** Vendor campid + our tracking_campid from query/body. */
export function resolveCampidParams(q = {}) {
  return {
    campid: q.campid != null ? String(q.campid) : undefined,
    trackingCampid:
      q.tracking_campid != null
        ? String(q.tracking_campid)
        : q.trackingCampid != null
          ? String(q.trackingCampid)
          : undefined,
  };
}
