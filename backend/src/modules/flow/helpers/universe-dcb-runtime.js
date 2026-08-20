import { DCB_OUTCOMES } from './universe-dcb-normalizer.js';

export const DCB_DETECT_PAGES = Object.freeze({
  [DCB_OUTCOMES.ENTITLED]: 'THANKYOU',
  [DCB_OUTCOMES.NEW]: 'HOME',
  [DCB_OUTCOMES.LOW_BALANCE]: 'LOW_BALANCE',
  [DCB_OUTCOMES.PENDING]: 'INPROGRESS',
  [DCB_OUTCOMES.TERMINAL_FAILURE]: 'ERROR',
  [DCB_OUTCOMES.PARSE_ERROR]: 'ERROR',
});

const baseContext = (runtime = {}) => ({
  provider: 'UNIVERSE_DCB',
  mode: 'UNIVERSE_DCB',
  verificationMode: 'UNIVERSE_DCB',
  pollIntervalMs: runtime.pollIntervalMs || 2000,
  pollTimeoutMs: runtime.pollTimeoutMs || 60000,
});

export function dcbFlowContextForPage(pageType, phone, runtime = {}) {
  const page = String(pageType || '').toUpperCase();
  const hasPhone = Boolean(String(phone || '').replace(/\D/g, ''));
  const common = baseContext(runtime);

  if (!hasPhone && (page === 'HOME' || page === 'OTP')) {
    return { ...common, stage: 'MANUAL_MSISDN', outcome: DCB_OUTCOMES.NEW };
  }
  if (page === 'HOME') {
    return {
      ...common,
      stage: 'PLAN_SELECT',
      outcome: DCB_OUTCOMES.NEW,
      purchaseTypeMappings: runtime.purchaseTypeMappings || [],
      purchaseTypes: runtime.purchaseTypeMappings || [],
    };
  }
  if (page === 'OTP') {
    return { ...common, stage: 'PIN_REQUIRED', outcome: DCB_OUTCOMES.PENDING };
  }
  if (page === 'INPROGRESS') {
    return { ...common, stage: 'POLLING', outcome: DCB_OUTCOMES.PENDING };
  }
  if (page === 'THANKYOU') {
    return { ...common, stage: 'ENTITLED', outcome: DCB_OUTCOMES.ENTITLED };
  }
  if (page === 'LOW_BALANCE') {
    return {
      ...common,
      stage: 'LOW_BALANCE',
      outcome: DCB_OUTCOMES.LOW_BALANCE,
    };
  }
  if (page === 'ERROR' || page === 'BLOCKED') {
    return {
      ...common,
      stage: 'ERROR',
      outcome: DCB_OUTCOMES.TERMINAL_FAILURE,
    };
  }
  return { ...common, stage: page || 'UNKNOWN' };
}

export function decorateUniverseDcbPageResponse(response, phone, runtime = {}) {
  return {
    ...response,
    verificationMode: 'UNIVERSE_DCB',
    flowContext: dcbFlowContextForPage(response?.pageType, phone, runtime),
  };
}

export function decorateUniverseDcbDetectResponse(
  response,
  normalizedStatus,
  runtime = {},
) {
  const phone = String(response?.phone || '').replace(/\D/g, '');
  if (!phone) {
    return {
      ...response,
      verificationMode: 'UNIVERSE_DCB',
      nextPage: 'OTP',
      successRedirectUrl: null,
      failRedirectUrl: null,
      subscribed: false,
      isActive: false,
      flowContext: dcbFlowContextForPage('OTP', '', runtime),
    };
  }

  const outcome = normalizedStatus?.outcome || DCB_OUTCOMES.PARSE_ERROR;
  const nextPage = DCB_DETECT_PAGES[outcome] || 'ERROR';
  const entitled = outcome === DCB_OUTCOMES.ENTITLED;
  return {
    ...response,
    verificationMode: 'UNIVERSE_DCB',
    nextPage,
    // Route through THANKYOU first; its page response owns any success redirect.
    successRedirectUrl: null,
    failRedirectUrl: null,
    subscribed: entitled,
    isActive: entitled,
    subscriptionStatus: normalizedStatus?.status || null,
    dcbOutcome: outcome,
    flowContext: {
      ...dcbFlowContextForPage(nextPage, phone, runtime),
      outcome,
      status: normalizedStatus?.status || null,
      reason: normalizedStatus?.reason || null,
    },
  };
}
