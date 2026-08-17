import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';

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

function parseCampaignFlowConfig(campaign) {
  const raw = campaign?.flowConfig;
  if (!raw) return null;
  if (typeof raw === 'object' && Array.isArray(raw.nodes)) return raw;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.nodes) ? parsed : null;
  } catch {
    return null;
  }
}

/** True when the saved graph still has a Confirm node (classic HOME → Confirm). */
export function flowHasConfirmNode(campaign) {
  const flow = parseCampaignFlowConfig(campaign);
  if (!flow) return true;
  return flow.nodes.some(
    (n) =>
      String(n?.pageType || n?.id || '').toUpperCase() ===
      CampaignPageType.CONFIRM,
  );
}

/**
 * Pack / subscribe canvas after identity.
 * Saved HE graphs often drop Confirm while funnel_layout stays classic —
 * do not send those users to a Confirm page they removed from the flow.
 */
export function packCanvasPage(campaign) {
  if (isPacksOnHome(campaign) || !flowHasConfirmNode(campaign)) {
    return CampaignPageType.HOME;
  }
  return CampaignPageType.CONFIRM;
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

/**
 * Checksub "Continue funnel" after OTP: user is not subscribed yet.
 * Do not follow OTP_VERIFIED → THANKYOU (Skip HOME) — that looks like "already
 * done" and can leave the OTP page stuck when Thank you is missing/guarded.
 * Packs live on HOME; classic funnel still uses Confirm.
 */
export function continueFunnelPageAfterOtp(campaign, graphNextPage) {
  if (packCanvasPage(campaign) === CampaignPageType.HOME) {
    return CampaignPageType.HOME;
  }
  const graph = String(graphNextPage || '').toUpperCase();
  if (
    !graph ||
    graph === CampaignPageType.OTP ||
    graph === CampaignPageType.THANKYOU
  ) {
    return CampaignPageType.CONFIRM;
  }
  return graph;
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
