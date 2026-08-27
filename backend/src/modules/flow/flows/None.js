import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { node, OTP_WAP_BLOCKED } from './graph.js';

function homeOnlyConfig(startConfig) {
  return {
    version: 1,
    entryPage: CampaignPageType.HOME,
    startConfig: { ...startConfig },
    nodes: [node(CampaignPageType.HOME, 40, 160)],
    edges: [],
  };
}

const CG_START = {
  runHe: false,
  runBlocklist: false,
  runChecksub: false,
};

/** Landing immediately redirects to CG (no HOME). */
export default {
  id: 'NONE',
  allowsHe: false,
  startConfig: CG_START,
  isNullIdentity: true,
  isLandingCg: true,
  isSubscribeCg: true,
  allowsApiExpose: false,
  requiresOtpNode: false,
  skipReachableValidate: true,
  useDcbDummyPages: false,
  subscribeStayHome: true,
  needsIspResolve: false,
  wapBlockedMessage: OTP_WAP_BLOCKED,

  getDefaultFlowConfig() {
    return homeOnlyConfig(this.startConfig);
  },

  resolveHomeSubscribeNext({ ctx }) {
    return {
      nextPage: CampaignPageType.HOME,
      resolvedPhone: ctx.phone || ctx.visitPhone || '',
    };
  },
};
