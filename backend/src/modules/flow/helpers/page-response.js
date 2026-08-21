import {
  CampaignPageType,
  pageTypeForSubscriptionStatus,
} from '../../../database/entities/campaign-page.entity.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitStatus } from '../../../database/entities/visit.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { variableResolverService } from '../../../common/services/variable-resolver.service.js';
import { flowEngineService } from '../flow-engine.service.js';
import { getDefaultFunnelPageData } from '../../../database/seed/default-funnel-pages.js';

export function createFlowPageResponse(deps) {
  const {
    normalizePack,
    buildSubscriptionUrl,
    loadVisitAttribution,
    resolveSuccessRedirect,
    normalizeSuccessRedirectMode,
  } = deps;

  const getActions = (pageType) => {
    if (pageType === CampaignPageType.HOME) return ['SUBSCRIBE'];
    if (pageType === CampaignPageType.OTP) return ['OTP_SEND', 'OTP_VERIFY'];
    if (pageType === CampaignPageType.CONFIRM) return ['CONFIRM'];
    return [];
  };
  
  const buildPageResponse = async (
    campaign,
    pageType,
    variables,
    visitId,
    status,
    pack,
    subscriptionUrl,
    options = {},
  ) => {
    const page = campaign.pages.find((p) => p.pageType === pageType);
    let templateData = page?.template?.data;
    if (!templateData) {
      try {
        templateData = getDefaultFunnelPageData(pageType, {
          verificationMode: campaign.verificationMode,
        });
      } catch {
        const err = new Error(`Page ${pageType} not configured`);
        err.statusCode = 404;
        throw err;
      }
    }
    const resolvedPack = pack ? normalizePack(pack) : undefined;
    const resolvedSubscriptionUrl =
      subscriptionUrl ||
      (resolvedPack
        ? buildSubscriptionUrl(campaign, resolvedPack)
        : undefined);
    const attr = await loadVisitAttribution(visitId);
    // After thank-you: redirect to campaign success/content URL when configured.
    const successRedirect =
      pageType === CampaignPageType.THANKYOU
        ? await resolveSuccessRedirect(campaign, visitId, {
            phone: variables?.phone || variables?.msisdn,
            msisdn: variables?.phone || variables?.msisdn,
          })
        : null;
    const successRedirectMode = normalizeSuccessRedirectMode(campaign);
    return {
      campaignId: campaign.id,
      visitId,
      pageType,
      entryPage: flowEngineService.getEntryPage(
        flowEngineService.parseFlowConfig(campaign.flowConfig),
      ),
      status: status || pageType,
      templateId: page?.templateId || null,
      html: variableResolverService.replaceVariables(
        templateData.html || '',
        variables,
      ),
      css: templateData.css || '',
      variables,
      actions: getActions(pageType),
      pack: resolvedPack,
      subscriptionUrl: resolvedSubscriptionUrl,
      cgRedirectUrl: campaign.cgRedirectUrl || null,
      successRedirectUrl: campaign.successRedirectUrl || null,
      successRedirect,
      successRedirectMode,
      subscriptionStatus: options.subscriptionStatus || null,
      clickId: attr.clickId || null,
      rcid: attr.rcid || null,
    };
  };

  const resolveSkipPage = (flowConfig, fromPage, sub) => {
    // Campaign checksub rules win when present.
    if (sub?.go === 'continue') return null;
    if (sub?.go === 'external') return null;
    const byStatus =
      sub?.go === 'page' && sub?.page
        ? sub.page
        : pageTypeForSubscriptionStatus(sub?.status, sub?.isActive);
    if (!byStatus) return null;
  
    let condition = 'SUBSCRIBED';
    if (byStatus === CampaignPageType.INPROGRESS) condition = 'PENDING';
    if (byStatus === CampaignPageType.LOW_BALANCE) condition = 'LOW_BALANCE';
  
    return (
      flowEngineService.nextPage(flowConfig, fromPage, condition) ||
      flowEngineService.nextPage(flowConfig, CampaignPageType.CONFIRM, condition) ||
      byStatus
    );
  };
  
  const resolveBlockedPage = (flowConfig) =>
    flowEngineService.nextPage(flowConfig, CampaignPageType.HOME, 'BLOCKED') ||
    flowEngineService.nextPage(
      flowConfig,
      CampaignPageType.CONFIRM,
      'BLOCKED',
    ) ||
    CampaignPageType.BLOCKED;

  const buildBlockedPageResponse = async (
    campaign,
    flowConfig,
    visitId,
    phone,
    serviceId,
    reason,
    info,
  ) => {
    const nextPage = resolveBlockedPage(flowConfig);
    const variables = {
      phone,
      country: campaign.country,
      operator: campaign.operator,
      service_id: serviceId,
      plan: '',
    };
  
    await analyticsService.updateVisit(
      visitId,
      VisitStatus.BLOCKED,
      nextPage,
      phone,
    );
    await analyticsService.logEvent(visitId, VisitEventType.BLOCKED, {
      reason,
      info,
    });
  
    return buildPageResponse(
      campaign,
      nextPage,
      variables,
      visitId,
      'BLOCKED',
    );
  };

  return {
    getActions,
    buildPageResponse,
    resolveSkipPage,
    resolveBlockedPage,
    buildBlockedPageResponse,
  };
}
