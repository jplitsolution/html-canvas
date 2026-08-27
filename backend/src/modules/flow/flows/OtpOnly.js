import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { partnerApiService } from '../partner-api.service.js';
import {
  edge,
  node,
  OTP_WAP_BLOCKED,
  outcomeEdgesFrom,
  outcomeNode,
} from './graph.js';

/** OTP only — no HE. WAP funnel or public send/verify APIs. */
export default {
  id: 'OTP_ONLY',
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
      edge(CampaignPageType.HOME, CampaignPageType.OTP, 'DEFAULT'),
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

  resolveHomeSubscribeNext({ fromGraph, resolvedPhone }) {
    return {
      nextPage: fromGraph('DEFAULT', CampaignPageType.OTP),
      resolvedPhone,
    };
  },

  async guardConfirmThankYou(ctx) {
    let { resolvedPageType } = ctx;
    const {
      isVerified,
      phone,
      entryPage,
      apiConfig,
      guardPartnerCtx,
      pageTypeForSubscriptionStatus,
    } = ctx;

    if (!isVerified) {
      const sub = await partnerApiService
        .checkSubscription(apiConfig, guardPartnerCtx)
        .catch(() => null);

      if (sub?.shouldSkipSubscribe) {
        resolvedPageType =
          (sub.go === 'page' && sub.page ? sub.page : null) ||
          pageTypeForSubscriptionStatus(sub.status, sub.isActive) ||
          CampaignPageType.THANKYOU;
      } else {
        resolvedPageType = phone ? CampaignPageType.OTP : entryPage;
      }
    }
    return resolvedPageType;
  },
};
