import { CampaignPageType } from '../entities/campaign-page.entity.js';
import {
  defaultPages,
  orangeBfPages,
  dcbPages,
  headerInjectionPages,
  otpOnlyPages,
  bothPages,
  cgHomePages,
  nonePages,
} from './funnel-pages/index.js';

export {
  defaultPages,
  orangeBfPages,
  dcbPages,
  headerInjectionPages,
  otpOnlyPages,
  bothPages,
  cgHomePages,
  nonePages,
};

function pageRecord(page) {
  return {
    editor: 'grapesjs',
    projectData: {},
    html: page.html.trim(),
    css: page.css.trim(),
  };
}

export function getDefaultFunnelPageData(pageType, options = {}) {
  const rawMode = String(options.verificationMode || options.mode || '').toUpperCase();
  const mode = rawMode === 'MSISDN_ONLY' ? 'HEADER_INJECTION' : rawMode;

  // Separate dedicated defaults per flow
  if (mode === 'ORANGE_BF' && orangeBfPages[pageType]) {
    return pageRecord(orangeBfPages[pageType]);
  }
  if (mode === 'UNIVERSE_DCB' && dcbPages[pageType]) {
    return pageRecord(dcbPages[pageType]);
  }
  if (mode === 'HEADER_INJECTION' && headerInjectionPages[pageType]) {
    return pageRecord(headerInjectionPages[pageType]);
  }
  if (mode === 'OTP_ONLY' && otpOnlyPages[pageType]) {
    return pageRecord(otpOnlyPages[pageType]);
  }
  if (mode === 'BOTH' && bothPages[pageType]) {
    return pageRecord(bothPages[pageType]);
  }
  if (mode === 'CG_HOME' && cgHomePages[pageType]) {
    return pageRecord(cgHomePages[pageType]);
  }
  if (mode === 'NONE' && nonePages[pageType]) {
    return pageRecord(nonePages[pageType]);
  }

  // Classic default fallback for unconfigured or unknown modes
  const fallback = defaultPages[pageType];
  if (!fallback) {
    return { editor: 'grapesjs', projectData: {}, html: '', css: '' };
  }
  return pageRecord(fallback);
}

export function isClassicDefaultFunnelHtml(pageType, html) {
  const source = String(html || '');
  if (pageType === CampaignPageType.OTP) {
    return (
      source.includes('Verify Mobile Number') &&
      source.includes('Get OTP') &&
      !source.includes('dcb-otp') &&
      !source.includes('otp-flow') &&
      !source.includes('both-flow') &&
      !source.includes('Confirm billing PIN')
    );
  }
  if (pageType === CampaignPageType.HOME) {
    return (
      source.includes('Premium Mobile Service') &&
      source.includes('Subscribe Now') &&
      !source.includes('data-pack=') &&
      !source.includes('dcb-home') &&
      !source.includes('he-home') &&
      !source.includes('otp-flow') &&
      !source.includes('both-flow') &&
      !source.includes('cg-flow') &&
      !source.includes('none-flow')
    );
  }
  return false;
}
