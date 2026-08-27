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

/** Header Injection — HE on landing; miss → Error. */
export default {
  id: 'HEADER_INJECTION',
  allowsHe: true,
  startConfig: HE_START,
  isNullIdentity: false,
  isLandingCg: false,
  isSubscribeCg: false,
  allowsApiExpose: false,
  requiresOtpNode: false,
  skipReachableValidate: false,
  useDcbDummyPages: false,
  needsIspResolve: true,
  wapBlockedMessage: OTP_WAP_BLOCKED,
  packsOnHomeNoPhone: { nextPage: 'ERROR', useFailRedirect: true },

  getDefaultFlowConfig({ applyFunnelLayoutToFlowConfig }, options = {}) {
    return applyFunnelLayoutToFlowConfig(
      {
        version: 1,
        entryPage: CampaignPageType.HOME,
        startConfig: { ...this.startConfig },
        nodes: [
          node(CampaignPageType.HOME, 40, 160),
          outcomeNode(CampaignPageType.THANKYOU, 40),
          outcomeNode(CampaignPageType.INPROGRESS, 160),
          outcomeNode(CampaignPageType.LOW_BALANCE, 280),
          outcomeNode(CampaignPageType.BLOCKED, 400),
          outcomeNode(CampaignPageType.ERROR, 520),
        ],
        edges: [
          edge(
            CampaignPageType.HOME,
            CampaignPageType.ERROR,
            'HEADER_UNRESOLVED',
          ),
          ...outcomeEdgesFrom(CampaignPageType.HOME),
        ],
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
          : fromGraph('HEADER_UNRESOLVED', CampaignPageType.ERROR),
      ),
      resolvedPhone,
    };
  },

  async guardConfirmThankYou(ctx) {
    let { resolvedPageType } = ctx;
    const {
      hasPhone,
      entryPage,
      apiConfig,
      guardPartnerCtx,
      flowHasConfirmNode,
      isPacksOnHome,
    } = ctx;

    if (resolvedPageType === CampaignPageType.CONFIRM && !hasPhone) {
      resolvedPageType = entryPage;
    }
    if (resolvedPageType === CampaignPageType.THANKYOU) {
      if (
        apiConfig?.subscriptionApi &&
        apiConfig.subscriptionApi.trim() !== ''
      ) {
        const sub = await partnerApiService
          .checkSubscription(apiConfig, guardPartnerCtx)
          .catch(() => null);
        if (!sub?.shouldSkipSubscribe) {
          if (!hasPhone) {
            resolvedPageType = entryPage;
          } else if (flowHasConfirmNode && !isPacksOnHome) {
            resolvedPageType = CampaignPageType.CONFIRM;
          } else if (isPacksOnHome) {
            resolvedPageType = CampaignPageType.HOME;
          }
        }
      }
    }
    return resolvedPageType;
  },
};
