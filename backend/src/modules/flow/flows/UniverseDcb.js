import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import Both from './Both.js';
import {
  DCB_WAP_BLOCKED,
  edge,
  HE_START,
  node,
  outcomeNode,
} from './graph.js';

/**
 * Universe Telecom DCB — own default graph + dummy pages.
 * HOME subscribe routing matches BOTH (HE miss → OTP).
 */
export default {
  id: 'UNIVERSE_DCB',
  allowsHe: true,
  startConfig: HE_START,
  isNullIdentity: false,
  isLandingCg: false,
  isSubscribeCg: false,
  allowsApiExpose: true,
  requiresOtpNode: false,
  skipReachableValidate: false,
  useDcbDummyPages: true,
  needsIspResolve: true,
  wapBlockedMessage: DCB_WAP_BLOCKED,
  resolveHomeSubscribeNext: Both.resolveHomeSubscribeNext,

  getDefaultFlowConfig() {
    return {
      version: 1,
      entryPage: CampaignPageType.HOME,
      startConfig: { ...this.startConfig },
      nodes: [
        node(CampaignPageType.HOME, 360, 220),
        node(CampaignPageType.OTP, 360, 20),
        outcomeNode(CampaignPageType.THANKYOU, 40),
        outcomeNode(CampaignPageType.INPROGRESS, 160),
        outcomeNode(CampaignPageType.LOW_BALANCE, 280),
        outcomeNode(CampaignPageType.BLOCKED, 400),
        outcomeNode(CampaignPageType.ERROR, 520),
      ],
      edges: [
        edge(CampaignPageType.OTP, CampaignPageType.HOME, 'MSISDN_CHECKED'),
        edge(CampaignPageType.HOME, CampaignPageType.OTP, 'PIN_REQUESTED'),
        edge(CampaignPageType.HOME, CampaignPageType.THANKYOU, 'ENTITLED'),
        edge(CampaignPageType.HOME, CampaignPageType.LOW_BALANCE, 'LOW_BALANCE'),
        edge(CampaignPageType.HOME, CampaignPageType.BLOCKED, 'BLOCKED'),
        edge(CampaignPageType.HOME, CampaignPageType.ERROR, 'ERROR'),
        edge(CampaignPageType.OTP, CampaignPageType.INPROGRESS, 'PIN_CONFIRMED'),
        edge(CampaignPageType.INPROGRESS, CampaignPageType.THANKYOU, 'ACTIVATED'),
        edge(
          CampaignPageType.INPROGRESS,
          CampaignPageType.LOW_BALANCE,
          'LOW_BALANCE',
        ),
        edge(CampaignPageType.INPROGRESS, CampaignPageType.ERROR, 'ERROR'),
      ],
    };
  },
};
