import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitStatus } from '../../../database/entities/visit.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { flowEngineService } from '../flow-engine.service.js';

/**
 * Orange BF: CONFIRM "S'abonner" already sent OTP via /otp/send.
 * Advance the graph CONFIRM → OTP (or THANKYOU if already subscribed).
 */
export function createHandleConfirmOtpSent(deps) {
  const { buildPageResponse } = deps;

  return async (input, campaign, phone, serviceId) => {
    const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
    const action = String(input.action || '').toUpperCase();
    const nextPage =
      flowEngineService.nextPage(flowConfig, CampaignPageType.CONFIRM, action) ||
      (action === 'ACTIVE_SUBSCRIBER'
        ? CampaignPageType.THANKYOU
        : CampaignPageType.OTP);

    const alreadySubscribed = nextPage === CampaignPageType.THANKYOU;
    await analyticsService.updateVisit(
      input.visitId,
      alreadySubscribed ? VisitStatus.SUBSCRIBED : VisitStatus.OTP_SHOWN,
      nextPage,
      phone || undefined,
    );
    await analyticsService.logEvent(
      input.visitId,
      alreadySubscribed
        ? VisitEventType.SUBSCRIBE_SUCCESS
        : VisitEventType.OTP_VIEW,
      alreadySubscribed
        ? { info: 'Already subscribed on confirm send' }
        : { info: 'OTP sent from confirm — show verify page' },
    );

    return buildPageResponse(
      campaign,
      nextPage,
      {
        phone,
        country: campaign.country,
        operator: campaign.operator,
        service_id: serviceId,
        plan: '',
      },
      input.visitId,
    );
  };
}
