import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import {
  edge,
  node,
  outcomeNode,
} from './graph.js';

/**
 * Orange Burkina Faso Flow Definition.
 *
 * Multi-step French VAS Flow:
 * - HOME: Plan details (50 FCFA/day) & features
 * - OTP: MSISDN entry (+226) & 4-digit SMS OTP verification (with CheckSub auto-forward)
 * - THANKYOU: Confirmation / Success screen
 */
export default {
  id: 'ORANGE_BF',
  allowsHe: false,
  startConfig: {
    runHe: false,
    runBlocklist: true,
    runChecksub: true,
  },
  isNullIdentity: false,
  isLandingCg: false,
  isSubscribeCg: false,
  allowsApiExpose: true,
  requiresOtpNode: true,
  skipReachableValidate: false,
  useDcbDummyPages: false,
  needsIspResolve: false,
  isFlowLocked: true,
  wapBlockedMessage: 'This service is only available for Orange Burkina Faso subscribers (+226).',

  getDefaultFlowConfig() {
    return {
      version: 1,
      entryPage: CampaignPageType.HOME,
      startConfig: { ...this.startConfig },
      nodes: [
        node(CampaignPageType.HOME, 160, 180),
        node(CampaignPageType.CONFIRM, 380, 180),
        node(CampaignPageType.OTP, 600, 180),
        outcomeNode(CampaignPageType.THANKYOU, 40),
        outcomeNode(CampaignPageType.BLOCKED, 160),
        outcomeNode(CampaignPageType.ERROR, 280),
      ],
      edges: [
        edge(CampaignPageType.HOME, CampaignPageType.CONFIRM, 'SUBSCRIBE'),
        edge(CampaignPageType.HOME, CampaignPageType.CONFIRM, 'DEFAULT'),
        edge(CampaignPageType.CONFIRM, CampaignPageType.OTP, 'OTP_SENT'),
        edge(CampaignPageType.CONFIRM, CampaignPageType.OTP, 'DEFAULT'),
        edge(CampaignPageType.CONFIRM, CampaignPageType.THANKYOU, 'ACTIVE_SUBSCRIBER'),
        edge(CampaignPageType.OTP, CampaignPageType.THANKYOU, 'OTP_VERIFIED'),
        edge(CampaignPageType.OTP, CampaignPageType.BLOCKED, 'BLOCKED'),
        edge(CampaignPageType.OTP, CampaignPageType.ERROR, 'ERROR'),
      ],
    };
  },

  resolveHomeSubscribeNext({ fromGraph, resolvedPhone } = {}) {
    return {
      nextPage: (fromGraph && (fromGraph('SUBSCRIBE', CampaignPageType.CONFIRM) || fromGraph('DEFAULT', CampaignPageType.CONFIRM))) || CampaignPageType.CONFIRM,
      resolvedPhone,
    };
  },

  async guardConfirmThankYou(ctx = {}) {
    return {
      resolvedPageType: ctx.resolvedPageType || CampaignPageType.THANKYOU,
    };
  },
};
