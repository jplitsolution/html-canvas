import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitStatus } from '../../../database/entities/visit.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { flowEngineService } from '../flow-engine.service.js';
import { recordCgRedirectHop } from './cg-redirect-log.js';

export function createHandleHomeSubscribe(deps) {
  const {
    maybeNullFlowCgRedirect,
    buildPageResponse,
    buildBlockedPageResponse,
    resolveHomeSubscribeNext,
    loadVisitAttribution,
    checkBlocklist,
    maybeSkipToThankYouIfSubscribed,
  } = deps;

  return async (input, campaign, apiConfig, phone, serviceId) => {
    await analyticsService.logEvent(
      input.visitId,
      VisitEventType.SUBSCRIBE_CLICK,
      input.planId ? { pack: input.planId } : undefined,
    );

    let visitPhone = '';
    try {
      const v = await analyticsService.getVisit(input.visitId);
      if (v?.phone?.trim()) {
        visitPhone = v.phone.trim();
      }
    } catch (err) {
      console.error(`Error resolving visit in transition: ${err.message}`);
    }

    const mode =
      flowEngineService.normalizeMode(campaign.verificationMode) || 'BOTH';
    const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);

    let nextPage;
    let resolvedPhone = phone || visitPhone;

    if (mode === 'NONE' || mode === 'CG_HOME') {
      nextPage = CampaignPageType.HOME;
      const redirect = await maybeNullFlowCgRedirect(
        campaign,
        input.visitId,
        {
          clickId: input.clickId,
          vid: input.vid,
          affId: input.affId,
          campid: input.campid,
          trackingCampid: input.trackingCampid || input.tracking_campid,
        },
        { when: 'subscribe' },
      );
      if (redirect) {
        await recordCgRedirectHop({
          visitId: input.visitId,
          campaign,
          redirectUrl: redirect,
          trigger: 'subscribe',
          planId: input.planId,
        });
        await analyticsService.updateVisit(
          input.visitId,
          VisitStatus.HOME_SHOWN,
          CampaignPageType.HOME,
          resolvedPhone || undefined,
        );
        return {
          ...(await buildPageResponse(
            campaign,
            CampaignPageType.HOME,
            {
              phone: resolvedPhone,
              country: campaign.country,
              operator: campaign.operator,
              service_id: serviceId,
              plan: '',
            },
            input.visitId,
          )),
          externalRedirect: redirect,
        };
      }
    } else {
      const routed = await resolveHomeSubscribeNext(
        mode,
        flowConfig,
        campaign,
        apiConfig,
        { phone, visitPhone, visitId: input.visitId },
      );
      nextPage = routed.nextPage;
      resolvedPhone = routed.resolvedPhone || resolvedPhone;
    }

    let subscribeAttr = null;
    if (mode !== 'NONE' && mode !== 'CG_HOME' && resolvedPhone) {
      subscribeAttr = await loadVisitAttribution(input.visitId, input);
      const blockResult = await checkBlocklist(apiConfig, {
        phone: resolvedPhone,
        visitId: input.visitId,
        campaignId: campaign.id,
        clickId: subscribeAttr.clickId || input.clickId,
        rcid: subscribeAttr.rcid || input.rcid,
        country: campaign.country,
        operator: campaign.operator,
      });
      if (blockResult?.blocked) {
        return buildBlockedPageResponse(
          campaign,
          flowConfig,
          input.visitId,
          resolvedPhone,
          serviceId,
          blockResult.reason,
          'Blocked on SUBSCRIBE — skip CONFIRM',
        );
      }
    }

    if (!subscribeAttr) {
      subscribeAttr = await loadVisitAttribution(input.visitId, input);
    }
    const skipResult = await maybeSkipToThankYouIfSubscribed(
      flowConfig,
      apiConfig,
      campaign,
      serviceId,
      resolvedPhone,
      CampaignPageType.HOME,
      nextPage,
      {
        visitId: input.visitId,
        campaignId: campaign.id,
        clickId: subscribeAttr.clickId || input.clickId,
        rcid: subscribeAttr.rcid || input.rcid,
      },
    );
    nextPage = skipResult.nextPage;
    const skipSub = skipResult.sub;

    if (
      skipResult.externalRedirect &&
      /^https?:\/\//i.test(skipResult.externalRedirect)
    ) {
      await analyticsService.updateVisit(
        input.visitId,
        VisitStatus.SUBSCRIBED,
        CampaignPageType.THANKYOU,
        resolvedPhone || undefined,
      );
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_SUCCESS,
        {
          info: `Checksub external redirect — status=${skipSub?.status || ''}`,
          currentStatus: skipSub?.currentStatus,
          isActive: skipSub?.isActive,
        },
      );
      return {
        ...(await buildPageResponse(
          campaign,
          CampaignPageType.HOME,
          {
            phone: resolvedPhone,
            country: campaign.country,
            operator: campaign.operator,
            service_id: serviceId,
            plan: '',
          },
          input.visitId,
          undefined,
          undefined,
          undefined,
          { subscriptionStatus: skipSub?.status || null },
        )),
        externalRedirect: skipResult.externalRedirect,
      };
    }

    const skippedStatusPage = [
      CampaignPageType.THANKYOU,
      CampaignPageType.INPROGRESS,
      CampaignPageType.LOW_BALANCE,
    ].includes(nextPage);

    const nextStatus =
      nextPage === CampaignPageType.CONFIRM
        ? VisitStatus.CONFIRM_SHOWN
        : nextPage === CampaignPageType.OTP
          ? VisitStatus.OTP_SHOWN
          : skippedStatusPage
            ? VisitStatus.SUBSCRIBED
            : nextPage === CampaignPageType.ERROR
              ? VisitStatus.FAILED
              : VisitStatus.HOME_SHOWN;

    await analyticsService.updateVisit(
      input.visitId,
      nextStatus,
      nextPage,
      resolvedPhone || undefined,
    );
    if (nextPage === CampaignPageType.CONFIRM) {
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.CONFIRM_VIEW,
      );
    } else if (nextPage === CampaignPageType.OTP) {
      await analyticsService.logEvent(input.visitId, VisitEventType.OTP_VIEW);
    } else if (skippedStatusPage) {
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_SUCCESS,
        {
          info: `Skip subscribe after HE — status=${skipSub?.status || 'active'} → ${nextPage}`,
          currentStatus: skipSub?.currentStatus,
          isActive: skipSub?.isActive,
        },
      );
    } else if (nextPage === CampaignPageType.ERROR) {
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_FAILED,
        { info: 'Header injection unresolved' },
      );
    }

    const variables = {
      phone: resolvedPhone,
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
        allowSuccessRedirect: Boolean(skipSub?.isActive),
        subscriptionStatus: skipSub?.status || null,
      },
    );
  };
}
