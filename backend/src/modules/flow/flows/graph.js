import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';

export function node(pageType, x, y) {
  return {
    id: pageType,
    pageType,
    position: { x, y },
  };
}

export function edge(source, target, condition) {
  return {
    id: `${source}-${condition}-${target}`,
    source,
    target,
    condition,
  };
}

export function outcomeNode(pageType, y) {
  return node(pageType, 880, y);
}

export function outcomeEdgesFrom(source) {
  return [
    edge(source, CampaignPageType.THANKYOU, 'SUBSCRIBED'),
    edge(source, CampaignPageType.INPROGRESS, 'PENDING'),
    edge(source, CampaignPageType.LOW_BALANCE, 'LOW_BALANCE'),
    edge(source, CampaignPageType.BLOCKED, 'BLOCKED'),
    edge(source, CampaignPageType.ERROR, 'ERROR'),
  ];
}

export const OTP_WAP_BLOCKED =
  'This campaign exposes OTP APIs only. Use GET/POST /api/otp/:campaignId/:vendorId/send and /verify — no WAP subscription pages.';

export const DCB_WAP_BLOCKED =
  'This campaign exposes DCB billing APIs only. Use GET /api/flow/dcb/:campaignId/:vendorId/config then /pincode and /confirm — no WAP subscription pages.';

export const HE_START = {
  runHe: true,
  runBlocklist: true,
  runChecksub: true,
};
