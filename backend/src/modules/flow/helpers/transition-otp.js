import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitStatus } from '../../../database/entities/visit.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { flowEngineService } from '../flow-engine.service.js';
import { postbackService } from '../../partners/postback.service.js';

export function createHandleOtpContinue(deps) {
  const {
    loadVisitAttribution,
    buildPageResponse,
    buildBlockedPageResponse,
    maybeSkipToThankYouIfSubscribed,
    checkBlocklist,
    hasVerifiedOtp,
    shouldRegisterPostbackAt,
  } = deps;

  return async (input, campaign, apiConfig, phone, serviceId) => {
    if (!phone) {
      const err = new Error('Phone number is required to transition from OTP page');
      err.statusCode = 400;
      throw err;
    }

    const verifiedOtp = await hasVerifiedOtp(input.visitId, phone);

    if (!verifiedOtp) {
      const err = new Error('Phone number has not been verified with OTP');
      err.statusCode = 403;
      throw err;
    }

    const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);

    const otpAttr = await loadVisitAttribution(input.visitId, input);
    const blockResult = await checkBlocklist(apiConfig, {
      phone,
      visitId: input.visitId,
      campaignId: campaign.id,
      clickId: otpAttr.clickId || input.clickId,
      rcid: otpAttr.rcid || input.rcid,
      country: campaign.country,
      operator: campaign.operator,
    });
    if (blockResult?.blocked) {
      return buildBlockedPageResponse(
        campaign,
        flowConfig,
        input.visitId,
        phone,
        serviceId,
        blockResult.reason,
        'Blocked after OTP — skip CONFIRM',
      );
    }

    // Queue vendor CPA pending when campaign says register at OTP (or both).
    if (shouldRegisterPostbackAt?.(campaign, 'otp')) {
      void postbackService.registerPending({
        visitId: input.visitId,
        msisdn: phone,
        campaignId: campaign.id,
        campid: otpAttr.campid || '',
        trackingCampid: otpAttr.trackingCampid || campaign.trackingId || '',
        clickId: otpAttr.clickId,
        rcid: otpAttr.rcid,
        vendorId: otpAttr.vendorId,
        affiliateId: null,
      });
    }

    let nextPage =
      flowEngineService.nextPage(
        flowConfig,
        CampaignPageType.OTP,
        'OTP_VERIFIED',
      ) || CampaignPageType.CONFIRM;

    // OTP verified → number mil gaya → checksub (with visitId so Session Detail shows it).
    const skipAfterOtp = await maybeSkipToThankYouIfSubscribed(
      flowConfig,
      apiConfig,
      campaign,
      serviceId,
      phone,
      CampaignPageType.OTP,
      nextPage,
      {
        visitId: input.visitId,
        campaignId: campaign.id,
        clickId: otpAttr.clickId || input.clickId,
        rcid: otpAttr.rcid || input.rcid,
      },
    );
    nextPage = skipAfterOtp.nextPage;
    const skipSubOtp = skipAfterOtp.sub;

    if (
      skipAfterOtp.externalRedirect &&
      /^https?:\/\//i.test(skipAfterOtp.externalRedirect)
    ) {
      await analyticsService.updateVisit(
        input.visitId,
        VisitStatus.SUBSCRIBED,
        CampaignPageType.THANKYOU,
        phone,
      );
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_SUCCESS,
        {
          info: `Checksub external redirect after OTP — status=${skipSubOtp?.status || ''}`,
          currentStatus: skipSubOtp?.currentStatus,
          isActive: skipSubOtp?.isActive,
        },
      );
      return {
        ...(await buildPageResponse(
          campaign,
          CampaignPageType.OTP,
          {
            phone,
            country: campaign.country,
            operator: campaign.operator,
            service_id: serviceId,
            plan: '',
          },
          input.visitId,
          undefined,
          undefined,
          undefined,
          { subscriptionStatus: skipSubOtp?.status || null },
        )),
        externalRedirect: skipAfterOtp.externalRedirect,
      };
    }

    const skippedAfterOtp = [
      CampaignPageType.THANKYOU,
      CampaignPageType.INPROGRESS,
      CampaignPageType.LOW_BALANCE,
    ].includes(nextPage);

    await analyticsService.logEvent(
      input.visitId,
      nextPage === CampaignPageType.CONFIRM
        ? VisitEventType.CONFIRM_VIEW
        : skippedAfterOtp
          ? VisitEventType.SUBSCRIBE_SUCCESS
          : VisitEventType.HOME_VIEW,
      {
        info: skippedAfterOtp
          ? `Skip subscribe after OTP — status=${skipSubOtp?.status || 'active'} → ${nextPage}`
          : 'Transition from OTP verified successfully',
        currentStatus: skipSubOtp?.currentStatus,
        isActive: skipSubOtp?.isActive,
      },
    );

    const nextStatus =
      nextPage === CampaignPageType.CONFIRM
        ? VisitStatus.CONFIRM_SHOWN
        : skippedAfterOtp
          ? VisitStatus.SUBSCRIBED
          : VisitStatus.HOME_SHOWN;

    await analyticsService.updateVisit(
      input.visitId,
      nextStatus,
      nextPage,
      phone,
    );

    const variables = {
      phone,
      country: campaign.country,
      operator: campaign.operator,
      service_id: serviceId,
      plan: '',
    };

    return buildPageResponse(
      campaign,
      nextPage,
      variables,
      input.visitId,
      undefined,
      undefined,
      undefined,
      {
        allowSuccessRedirect: skipSubOtp ? Boolean(skipSubOtp.isActive) : true,
        subscriptionStatus: skipSubOtp?.status || null,
      },
    );
  };
}
