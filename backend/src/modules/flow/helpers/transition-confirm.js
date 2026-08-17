import {
  CampaignPageType,
  pageTypeForSubscriptionStatus,
} from '../../../database/entities/campaign-page.entity.js';
import { partnerApiService } from '../partner-api.service.js';
import { postbackService } from '../../partners/postback.service.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitStatus } from '../../../database/entities/visit.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { flowEngineService } from '../flow-engine.service.js';
import { normalizeSubscribeUrlOverride } from './pack-url.js';

export function createHandleConfirm(deps) {
  const {
    normalizePack,
    formatPlanLabel,
    buildSubscriptionUrl,
    loadVisitAttribution,
    buildPageResponse,
    buildBlockedPageResponse,
    resolveSkipPage,
    checkBlocklist,
    shouldRegisterPostbackAt,
  } = deps;

  return async (input, campaign, apiConfig, phone, serviceId) => {
    if (!input.planId) {
      const err = new Error('Please select a subscription pack');
      err.statusCode = 400;
      throw err;
    }
    const selectedPack = normalizePack(input.planId);
    const subscriptionUrl = buildSubscriptionUrl(campaign, selectedPack);
    const confirmVariables = {
      phone,
      country: campaign.country,
      operator: campaign.operator,
      service_id: serviceId,
      plan: formatPlanLabel(selectedPack),
    };
    const confirmAttr = await loadVisitAttribution(input.visitId, input);
    const partnerCtx = {
      phone,
      serviceId,
      country: campaign.country,
      operator: campaign.operator,
      visitId: input.visitId,
      campaignId: campaign.id,
      clickId: confirmAttr.clickId,
      rcid: confirmAttr.rcid,
    };
    const subscribeInput = {
      ...partnerCtx,
      planId: selectedPack,
      subscriptionUrl,
      ...(input.serviceId ? { serviceId: input.serviceId } : {}),
      ...(input.subServiceId ? { subServiceId: input.subServiceId } : {}),
      subscribeUrl: normalizeSubscribeUrlOverride(input.subscribeUrl),
    };

    // Immediately log confirm + queue vendor pending (billing callback will fire).
    await analyticsService.logEvent(
      input.visitId,
      VisitEventType.CONFIRM_CLICK,
      {
        clickId: confirmAttr.clickId,
        rcid: confirmAttr.rcid,
        pack: selectedPack,
        serviceId: input.serviceId || serviceId,
        subServiceId: input.subServiceId || undefined,
      },
    );
    if (shouldRegisterPostbackAt?.(campaign, 'confirm', {
      queuePostback: input.queuePostback,
    })) {
      void postbackService.registerPending({
        visitId: input.visitId,
        msisdn: phone,
        campaignId: campaign.id,
        campid: confirmAttr.campid || '',
        trackingCampid:
          confirmAttr.trackingCampid || campaign.trackingId || '',
        clickId: confirmAttr.clickId,
        rcid: confirmAttr.rcid,
        vendorId: confirmAttr.vendorId,
        affiliateId: null,
      });
    }

    const blockResult = await checkBlocklist(apiConfig, partnerCtx);

    const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);

    if (blockResult.blocked) {
      return buildBlockedPageResponse(
        campaign,
        flowConfig,
        input.visitId,
        phone,
        serviceId,
        blockResult.reason,
        'Blocked on CONFIRM — skip subscribe',
      );
    }

    const subAtConfirm = await partnerApiService.checkSubscription(
      apiConfig,
      partnerCtx,
    );
    if (subAtConfirm?.go === 'external' && subAtConfirm?.url) {
      const skipped = await partnerApiService.recordSubscribeSkip(
        apiConfig,
        subscribeInput,
        {
          reason: 'checksub_external',
          statusLabel: 'SKIPPED_CHECKSUB',
        },
      );
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
          info: `Checksub external redirect at confirm — status=${subAtConfirm.status}`,
          currentStatus: subAtConfirm.currentStatus,
          isActive: subAtConfirm.isActive,
        },
      );
      return {
        ...(await buildPageResponse(
          campaign,
          CampaignPageType.CONFIRM,
          confirmVariables,
          input.visitId,
          'ALREADY_SUBSCRIBED',
          selectedPack,
          subscriptionUrl,
          { subscriptionStatus: subAtConfirm.status },
        )),
        externalRedirect: subAtConfirm.url,
        subscribeCall: skipped.call,
      };
    }

    if (subAtConfirm?.shouldSkipSubscribe) {
      const skipped = await partnerApiService.recordSubscribeSkip(
        apiConfig,
        subscribeInput,
        {
          reason: 'already_subscribed',
          statusLabel: String(
            subAtConfirm.status || 'SKIPPED_CHECKSUB',
          ).toUpperCase(),
        },
      );
      const nextPage =
        resolveSkipPage(flowConfig, CampaignPageType.CONFIRM, subAtConfirm) ||
        (subAtConfirm.go === 'page' && subAtConfirm.page
          ? subAtConfirm.page
          : null) ||
        pageTypeForSubscriptionStatus(
          subAtConfirm.status,
          subAtConfirm.isActive,
        ) ||
        CampaignPageType.THANKYOU;

      await analyticsService.updateVisit(
        input.visitId,
        VisitStatus.SUBSCRIBED,
        nextPage,
        phone,
      );
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_SUCCESS,
        {
          info: `Skip subscribe at confirm — status=${subAtConfirm.status} → ${nextPage}`,
          currentStatus: subAtConfirm.currentStatus,
          isActive: subAtConfirm.isActive,
        },
      );
      return {
        ...(await buildPageResponse(
          campaign,
          nextPage,
          confirmVariables,
          input.visitId,
          'ALREADY_SUBSCRIBED',
          selectedPack,
          subscriptionUrl,
          {
            allowSuccessRedirect: Boolean(subAtConfirm.isActive),
            subscriptionStatus: subAtConfirm.status,
          },
        )),
        subscribeCall: skipped.call,
      };
    }

    const subResult = await partnerApiService.subscribe(apiConfig, subscribeInput);
    const success = Boolean(subResult?.success);
    const subscribeCall = subResult?.call || null;

    if (success) {
      const nextPage = flowEngineService.nextPage(
        flowConfig,
        CampaignPageType.CONFIRM,
        'SUBSCRIBED',
      ) || CampaignPageType.THANKYOU;

      await analyticsService.updateVisit(
        input.visitId,
        VisitStatus.SUCCESS,
        nextPage,
        phone,
      );
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_SUCCESS,
        {
          pack: selectedPack,
          subscriptionUrl,
        },
      );
      return {
        ...(await buildPageResponse(
          campaign,
          nextPage,
          confirmVariables,
          input.visitId,
          'SUCCESS',
          selectedPack,
          subscriptionUrl,
        )),
        subscribeCall,
      };
    }

    const nextPage = flowEngineService.nextPage(
      flowConfig,
      CampaignPageType.CONFIRM,
      'ERROR',
    ) || CampaignPageType.ERROR;

    await analyticsService.updateVisit(
      input.visitId,
      VisitStatus.FAILED,
      nextPage,
      phone,
    );
    await analyticsService.logEvent(
      input.visitId,
      VisitEventType.SUBSCRIBE_FAILED,
      {
        pack: selectedPack,
      },
    );
    return {
      ...(await buildPageResponse(
        campaign,
        nextPage,
        confirmVariables,
        input.visitId,
        'FAILED',
        selectedPack,
        subscriptionUrl,
      )),
      subscribeCall,
    };
  };
}
