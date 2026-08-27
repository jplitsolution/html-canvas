import {
  CampaignPageType,
} from '../../../database/entities/campaign-page.entity.js';
import { partnerApiService } from '../partner-api.service.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { flowEngineService } from '../flow-engine.service.js';
import { otpService } from '../../otp/otp.service.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import {
  continueFunnelPageAfterOtp,
  flowHasConfirmNode,
} from './funnel-layout.js';
import { resolveFlowOrBoth } from '../flows/index.js';

export function createFlowRouting(deps) {
  const {
    getApiCallLogRepo,
    resolveSkipPage,
  } = deps;

  const visitHasDetectPartnerChecks = async (visitId, phone) => {
    if (!visitId) return false;
    const where = { visitId, callType: ApiCallType.CHECKSUB };
    if (phone) {
      where.msisdn = String(phone).replace(/\D/g, '');
    }
    const row = await getApiCallLogRepo().findOne({ where });
    return Boolean(row);
  };

  const resolveHomeSubscribeNext = async (
    mode,
    flowConfig,
    campaign,
    apiConfig,
    ctx,
  ) => {
    const flow = resolveFlowOrBoth(mode);
    const fromGraph = (condition, fallback) =>
      flowEngineService.nextPage(flowConfig, CampaignPageType.HOME, condition) ||
      fallback;

    if (flow.subscribeStayHome) {
      return flow.resolveHomeSubscribeNext({ ctx });
    }

    let resolvedPhone = (ctx.phone || ctx.visitPhone || '').trim();

    if (!flow.needsIspResolve) {
      return flow.resolveHomeSubscribeNext({ fromGraph, resolvedPhone, ctx });
    }

    let resolved = Boolean(resolvedPhone);
    if (!resolved) {
      const isp = await partnerApiService.resolveMsisdn(apiConfig, {
        country: campaign.country,
        operator: campaign.operator,
        hint: ctx.phone,
      });
      if (isp) {
        resolved = true;
        resolvedPhone = isp;
        await analyticsService.setVisitPhone(ctx.visitId, isp);
      }
    }

    const clampConfirm = (page) =>
      page === CampaignPageType.CONFIRM && !flowHasConfirmNode(campaign)
        ? CampaignPageType.HOME
        : page;

    return flow.resolveHomeSubscribeNext({
      fromGraph,
      clampConfirm,
      resolvedPhone,
      resolved,
      ctx,
    });
  };

  const checkBlocklist = async (apiConfig, partnerCtx) =>
    partnerApiService
      .checkBlocked(apiConfig, partnerCtx)
      .catch(() => ({ blocked: false }));

  const maybeSkipToThankYouIfSubscribed = async (
    flowConfig,
    apiConfig,
    campaign,
    serviceId,
    phone,
    fromPage,
    nextPage,
    attr = {},
  ) => {
    if (!phone) {
      return { nextPage, sub: null };
    }

    // Number mil gaya (OTP verify, or heading to CONFIRM) → checksub once.
    // Same visit+MSISDN after HE already ran checksub is reused (no second HTTP).
    const shouldCheck =
      fromPage === CampaignPageType.OTP ||
      nextPage === CampaignPageType.CONFIRM;
    if (!shouldCheck) {
      return { nextPage, sub: null };
    }

    const sub = await partnerApiService
      .checkSubscription(apiConfig, {
        phone,
        serviceId,
        country: campaign.country,
        operator: campaign.operator,
        visitId: attr.visitId,
        campaignId: attr.campaignId ?? campaign?.id,
        clickId: attr.clickId,
        rcid: attr.rcid,
      })
      .catch(() => null);

    if (sub?.go === 'external' && sub?.url) {
      return { nextPage, sub, externalRedirect: sub.url };
    }

    if (sub?.go === 'continue') {
      const continued =
        fromPage === CampaignPageType.OTP
          ? continueFunnelPageAfterOtp(campaign, nextPage)
          : nextPage;
      return { nextPage: continued, sub };
    }

    if (!sub?.shouldSkipSubscribe) {
      return { nextPage, sub };
    }
    const skipPage = resolveSkipPage(flowConfig, fromPage, sub);
    return { nextPage: skipPage || CampaignPageType.THANKYOU, sub };
  };
  
  const hasVerifiedOtp = async (visitId, phone) => {
    return otpService.isVisitOtpVerified(visitId, phone);
  };

  return {
    visitHasDetectPartnerChecks,
    resolveHomeSubscribeNext,
    checkBlocklist,
    maybeSkipToThankYouIfSubscribed,
    hasVerifiedOtp,
  };
}
