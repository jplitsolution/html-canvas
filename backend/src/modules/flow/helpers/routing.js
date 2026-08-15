import {
  CampaignPageType,
} from '../../../database/entities/campaign-page.entity.js';
import { partnerApiService } from '../partner-api.service.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { flowEngineService } from '../flow-engine.service.js';
import { otpService } from '../../otp/otp.service.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { continueFunnelPageAfterOtp } from './funnel-layout.js';

export function createFlowRouting(deps) {
  const {
    getApiCallLogRepo,
    resolveSkipPage,
  } = deps;

  const visitHasDetectPartnerChecks = async (visitId) => {
    if (!visitId) return false;
    const row = await getApiCallLogRepo().findOne({
      where: { visitId, callType: ApiCallType.CHECKSUB },
    });
    return Boolean(row);
  };

  const resolveHomeSubscribeNext = async (
    mode,
    flowConfig,
    campaign,
    apiConfig,
    ctx,
  ) => {
    const fromGraph = (condition, fallback) =>
      flowEngineService.nextPage(flowConfig, CampaignPageType.HOME, condition) ||
      fallback;
  
    if (mode === 'NONE') {
      return {
        nextPage: CampaignPageType.HOME,
        resolvedPhone: ctx.phone || ctx.visitPhone || '',
      };
    }
  
    let resolvedPhone = (ctx.phone || ctx.visitPhone || '').trim();
  
    if (mode === 'OTP_ONLY') {
      return {
        nextPage: fromGraph('DEFAULT', CampaignPageType.OTP),
        resolvedPhone,
      };
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
  
    if (mode === 'HEADER_INJECTION') {
      return {
        nextPage: resolved
          ? fromGraph('HEADER_RESOLVED', CampaignPageType.HOME)
          : fromGraph('HEADER_UNRESOLVED', CampaignPageType.ERROR),
        resolvedPhone,
      };
    }
  
    return {
      nextPage: resolved
        ? fromGraph('HEADER_RESOLVED', CampaignPageType.HOME)
        : fromGraph('HEADER_UNRESOLVED', CampaignPageType.OTP),
      resolvedPhone,
    };
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

    // Number mil gaya → checksub. OTP path always (phone just verified);
    // also when heading to CONFIRM. Skip already-subscribed to status page.
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
