/**
 * Campaign funnel_layout: classic vs packs_on_home.
 * packs_on_home changes identity-before-HOME routing, not a requirement
 * that pack buttons live on HOME.
 */

export const FUNNEL_LAYOUT_CLASSIC = 'classic';
export const FUNNEL_LAYOUT_PACKS_ON_HOME = 'packs_on_home';

export function normalizeFunnelLayout(value) {
  const v = String(value || FUNNEL_LAYOUT_CLASSIC)
    .trim()
    .toLowerCase();
  return v === FUNNEL_LAYOUT_PACKS_ON_HOME
    ? FUNNEL_LAYOUT_PACKS_ON_HOME
    : FUNNEL_LAYOUT_CLASSIC;
}

export function isPacksOnHome(campaign) {
  return (
    normalizeFunnelLayout(campaign?.funnelLayout) === FUNNEL_LAYOUT_PACKS_ON_HOME
  );
}

/**
 * Detect landing when no MSISDN on packs_on_home.
 * HE-only → ERROR (+ fail redirect if configured).
 * OTP-only / BOTH → OTP (never fail-redirect).
 */
export function resolvePacksOnHomeNoPhone(verificationMode) {
  const mode = String(verificationMode || 'BOTH')
    .trim()
    .toUpperCase();
  if (mode === 'HEADER_INJECTION' || mode === 'MSISDN_ONLY') {
    return { nextPage: 'ERROR', useFailRedirect: true };
  }
  if (mode === 'OTP_ONLY' || mode === 'BOTH') {
    return { nextPage: 'OTP', useFailRedirect: false };
  }
  return { nextPage: null, useFailRedirect: false };
}

/** Default ON. Explicit 0 / false / off skips pending on that button. */
export function wantsButtonPostback(raw) {
  if (raw === false || raw === 0) return false;
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!s) return true;
  return !(s === '0' || s === 'false' || s === 'off' || s === 'no');
}

function normalizePostbackRegisterAt(campaign) {
  const mode = String(campaign?.postbackRegisterAt || 'confirm')
    .trim()
    .toLowerCase();
  return mode === 'otp' || mode === 'both' ? mode : 'confirm';
}

/**
 * When to queue conversion_postbacks pending.
 * packs_on_home: always on pack/subscribe click; never on detect HE-new.
 * Advanced (postbackRegisterAt otp|both): also on OTP verify.
 * classic: confirm | otp | both from postbackRegisterAt.
 * extras.queuePostback === false skips even when the campaign would queue.
 */
export function shouldRegisterPostbackAt(campaign, trigger, extras = {}) {
  if (extras.queuePostback === false) return false;
  if (
    extras.queuePostback !== undefined &&
    extras.queuePostback !== null &&
    extras.queuePostback !== '' &&
    !wantsButtonPostback(extras.queuePostback)
  ) {
    return false;
  }
  const t = String(trigger || '').toLowerCase();
  const normalized = normalizePostbackRegisterAt(campaign);
  if (isPacksOnHome(campaign)) {
    if (t === 'detect') return false;
    if (t === 'confirm') return true;
    if (t === 'otp') return normalized === 'otp' || normalized === 'both';
    return false;
  }
  if (t === 'otp') return normalized === 'otp' || normalized === 'both';
  if (t === 'confirm') return normalized === 'confirm' || normalized === 'both';
  return false;
}
