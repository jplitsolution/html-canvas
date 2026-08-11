import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { campaignsService } from '../../campaigns/campaigns.service.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { createHandleHomeSubscribe } from './transition-home.js';
import { createHandleConfirm } from './transition-confirm.js';
import { createHandleOtpContinue } from './transition-otp.js';
import { createHandleSubscribeRoute } from './transition-subscribe-route.js';

export function createFlowTransition(deps) {
  const {
    getApiConfigRepo,
    resolveCampaign,
    assertTrackingAssignmentAvailable,
  } = deps;

  const handleHomeSubscribe = createHandleHomeSubscribe(deps);
  const handleConfirm = createHandleConfirm(deps);
  const handleOtpContinue = createHandleOtpContinue(deps);
  const handleSubscribeRoute = createHandleSubscribeRoute(deps);

  const transition = async (input) => {
    let campaign = null;
    const visit = await analyticsService.getVisit(input.visitId);
    if (visit?.campaignId) {
      campaign = await campaignsService.findByIdForFlow(visit.campaignId);
    }
    if (!campaign) {
      campaign = await resolveCampaign({
        country: input.country,
        operator: input.operator,
        campid: input.campid,
        trackingCampid: input.trackingCampid || input.tracking_campid,
      });
    }
    if (!campaign || !campaign.active) {
      const err = new Error('This offer is not available');
      err.statusCode = 403;
      throw err;
    }
    if (visit?.vidRaw || visit?.vendorId) {
      await assertTrackingAssignmentAvailable(
        campaign,
        visit.vidRaw,
        null,
        visit.vendorId,
      );
    }

    const apiConfig = await getApiConfigRepo().findOne({
      where: { campaignId: campaign.id },
    });

    const phone = input.phone || '';
    const serviceId = campaign.serviceId || 'default_service';

    // Single-page subscribe + client-side outcome routing (any funnel page).
    if (input.action === 'SUBSCRIBE_ROUTE') {
      return handleSubscribeRoute(input, campaign, apiConfig, phone, serviceId);
    }

    if (
      input.fromPage === CampaignPageType.HOME &&
      input.action === 'SUBSCRIBE'
    ) {
      return handleHomeSubscribe(input, campaign, apiConfig, phone, serviceId);
    }

    if (
      input.fromPage === CampaignPageType.CONFIRM &&
      input.action === 'CONFIRM'
    ) {
      return handleConfirm(input, campaign, apiConfig, phone, serviceId);
    }

    if (
      input.fromPage === CampaignPageType.OTP &&
      input.action === 'CONTINUE'
    ) {
      return handleOtpContinue(input, campaign, apiConfig, phone, serviceId);
    }

    const err = new Error('Invalid page transition');
    err.statusCode = 400;
    throw err;
  };

  return { transition };
}
