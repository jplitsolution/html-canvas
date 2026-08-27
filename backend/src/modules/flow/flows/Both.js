import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { partnerApiService } from '../partner-api.service.js';
import {
  edge,
  HE_START,
  node,
  OTP_WAP_BLOCKED,
  outcomeEdgesFrom,
  outcomeNode,
} from './graph.js';

/** Header Injection + OTP fallback. */
export default {
  id: 'BOTH',
  allowsHe: true,
  startConfig: HE_START,
  isNullIdentity: false,
  isLandingCg: false,
  isSubscribeCg: false,
  allowsApiExpose: false,
  requiresOtpNode: true,
  skipReachableValidate: false,
  useDcbDummyPages: false,
  needsIspResolve: true,
  wapBlockedMessage: OTP_WAP_BLOCKED,
  packsOnHomeNoPhone: { nextPage: 'OTP', useFailRedirect: false },

  getDefaultFlowConfig({ applyFunnelLayoutToFlowConfig }, options = {}) {
    const nodes = [
      node(CampaignPageType.HOME, 40, 160),
      node(CampaignPageType.CONFIRM, 600, 160),
      outcomeNode(CampaignPageType.THANKYOU, 40),
      outcomeNode(CampaignPageType.INPROGRESS, 160),
      outcomeNode(CampaignPageType.LOW_BALANCE, 280),
      outcomeNode(CampaignPageType.BLOCKED, 400),
      outcomeNode(CampaignPageType.ERROR, 520),
    ];
    nodes.splice(1, 0, node(CampaignPageType.OTP, 320, 60));
    const edges = [
      edge(
        CampaignPageType.HOME,
        CampaignPageType.CONFIRM,
        'HEADER_RESOLVED',
      ),
      edge(
        CampaignPageType.HOME,
        CampaignPageType.OTP,
        'HEADER_UNRESOLVED',
      ),
      edge(CampaignPageType.OTP, CampaignPageType.CONFIRM, 'OTP_VERIFIED'),
      ...outcomeEdgesFrom(CampaignPageType.CONFIRM),
    ];

    return applyFunnelLayoutToFlowConfig(
      {
        version: 1,
        entryPage: CampaignPageType.HOME,
        startConfig: { ...this.startConfig },
        nodes,
        edges,
      },
      options.funnelLayout,
      this.id,
    );
  },

  resolveHomeSubscribeNext({ fromGraph, clampConfirm, resolvedPhone, resolved }) {
    return {
      nextPage: clampConfirm(
        resolved
          ? fromGraph('HEADER_RESOLVED', CampaignPageType.HOME)
          : fromGraph('HEADER_UNRESOLVED', CampaignPageType.OTP),
      ),
      resolvedPhone,
    };
  },

  async guardConfirmThankYou(ctx) {
    let { resolvedPageType } = ctx;
    const {
      isVerified,
      hasPhone,
      flowHasConfirmNode,
      isPacksOnHome,
      apiConfig,
      guardPartnerCtx,
    } = ctx;

    if (!isVerified && !hasPhone) {
      resolvedPageType = CampaignPageType.OTP;
    } else if (
      resolvedPageType === CampaignPageType.THANKYOU &&
      !isVerified
    ) {
      const sub = await partnerApiService
        .checkSubscription(apiConfig, guardPartnerCtx)
        .catch(() => null);
      if (!sub?.shouldSkipSubscribe) {
        if (!hasPhone) {
          resolvedPageType = CampaignPageType.OTP;
        } else if (flowHasConfirmNode && !isPacksOnHome) {
          resolvedPageType = CampaignPageType.CONFIRM;
        } else if (isPacksOnHome) {
          resolvedPageType = CampaignPageType.HOME;
        }
      }
    }
    return resolvedPageType;
  },
};
