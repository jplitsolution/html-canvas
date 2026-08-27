import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { node, OTP_WAP_BLOCKED } from './graph.js';

/** HOME first, Subscribe CTA → CG with click_id. */
export default {
  id: 'CG_HOME',
  allowsHe: false,
  startConfig: {
    runHe: false,
    runBlocklist: false,
    runChecksub: false,
  },
  isNullIdentity: true,
  isLandingCg: false,
  isSubscribeCg: true,
  allowsApiExpose: false,
  requiresOtpNode: false,
  skipReachableValidate: true,
  useDcbDummyPages: false,
  subscribeStayHome: true,
  needsIspResolve: false,
  wapBlockedMessage: OTP_WAP_BLOCKED,

  getDefaultFlowConfig() {
    return {
      version: 1,
      entryPage: CampaignPageType.HOME,
      startConfig: { ...this.startConfig },
      nodes: [node(CampaignPageType.HOME, 40, 160)],
      edges: [],
    };
  },

  resolveHomeSubscribeNext({ ctx }) {
    return {
      nextPage: CampaignPageType.HOME,
      resolvedPhone: ctx.phone || ctx.visitPhone || '',
    };
  },
};
