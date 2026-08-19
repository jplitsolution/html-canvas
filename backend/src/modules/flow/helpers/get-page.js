import {
  CampaignPageType,
  pageTypeForSubscriptionStatus,
} from '../../../database/entities/campaign-page.entity.js';
import { partnerApiService } from '../partner-api.service.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitStatus } from '../../../database/entities/visit.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { variableResolverService } from '../../../common/services/variable-resolver.service.js';
import { flowEngineService } from '../flow-engine.service.js';
import { redisService } from '../../../common/services/redis.service.js';
import { flowHasConfirmNode, isPacksOnHome } from './funnel-layout.js';

export function createGetPage(deps) {
  const {
    getApiConfigRepo,
    isFlowCacheEnabled,
    getFlowCacheTtl,
    normalizePack,
    formatPlanLabel,
    buildSubscriptionUrl,
    resolveCampaign,
    assertTrackingAssignmentAvailable,
    loadVisitAttribution,
    maybeNullFlowCgRedirect,
    resolveSuccessRedirect,
    normalizeSuccessRedirectMode,
    getActions,
    hasVerifiedOtp,
    resolveOrCreateLandingVisit,
    visitHasDetectPartnerChecks,
    checkBlocklist,
  } = deps;

  const getPage = async (input) => {
    const campaign = await resolveCampaign(input);
    if (!campaign) {
      const err = new Error(`No campaign found for ${input.country} / ${input.operator}`);
      err.statusCode = 404;
      throw err;
    }
    if (!campaign.active) {
      const err = new Error('This offer is not available');
      err.statusCode = 403;
      throw err;
    }

    const flowConfigEarly = flowEngineService.parseFlowConfig(campaign.flowConfig);
    if (flowEngineService.isApiExposeFlow(flowConfigEarly)) {
      const err = new Error(
        'This campaign exposes OTP APIs only. Use GET/POST /api/otp/:campaignId/send and /verify — no WAP subscription pages.',
      );
      err.statusCode = 400;
      throw err;
    }

    await assertTrackingAssignmentAvailable(
      campaign,
      input.vid,
      null,
      null,
    );

    const apiConfigCacheKey = `flow:config:${campaign.id}`;
    let apiConfig = null;
    if (isFlowCacheEnabled()) {
      apiConfig = await redisService.get(apiConfigCacheKey);
    }
    if (apiConfig === null || !isFlowCacheEnabled()) {
      apiConfig = await getApiConfigRepo().findOne({
        where: { campaignId: campaign.id },
      });
      if (isFlowCacheEnabled()) {
        await redisService.set(
          apiConfigCacheKey,
          apiConfig ?? '__NULL__',
          getFlowCacheTtl?.() || 600,
        );
      }
    } else if (apiConfig === '__NULL__') {
      apiConfig = null;
    }

    const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
    const entryPage = flowEngineService.getEntryPage(flowConfig);

    const phone = input.phone || '';
    const serviceId = campaign.serviceId || 'default_service';
    const pack = normalizePack(input.pack);
    const variables = {
      phone,
      country: campaign.country,
      operator: campaign.operator,
      service_id: serviceId,
      plan: formatPlanLabel(pack),
    };

    let visitId = input.visitId;
    let resolvedPageType = String(input.pageType || CampaignPageType.HOME).toUpperCase();
    /** @type {{ shouldSkipSubscribe?: boolean, isActive?: boolean, status?: string } | null} */
    let lastSubCheck = null;
    /** @type {{ blocked?: boolean, reason?: string } | null} */
    let lastBlockCheck = null;

    const guardMode =
      flowEngineService.normalizeMode(campaign.verificationMode) || 'BOTH';

    // Direct page-link navigation (href="CONFIRM" from the builder) should render
    // the chosen page. Funnel guards still apply to normal ?step= / prefetch loads
    // and to /flow/transition.
    if (
      !input.direct &&
      resolvedPageType === CampaignPageType.CONFIRM &&
      !flowHasConfirmNode(campaign)
    ) {
      resolvedPageType = CampaignPageType.HOME;
    }
    if (
      !input.direct &&
      (resolvedPageType === CampaignPageType.CONFIRM ||
        resolvedPageType === CampaignPageType.THANKYOU)
    ) {
      const isVerified = await hasVerifiedOtp(visitId, phone);
      const hasPhone = Boolean(phone);

      const guardPartnerCtx = {
        phone,
        serviceId,
        country: campaign.country,
        operator: campaign.operator,
        visitId,
        campaignId: campaign.id,
      };

      if (guardMode === 'OTP_ONLY') {
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
      } else if (guardMode === 'BOTH') {
        if (!isVerified && !hasPhone) {
          resolvedPageType = CampaignPageType.OTP;
        } else if (
          resolvedPageType === CampaignPageType.THANKYOU &&
          !isVerified
        ) {
          const sub = await partnerApiService
            .checkSubscription(apiConfig, guardPartnerCtx)
            .catch(() => null);
          if (!sub?.shouldSkipSubscribe) {
            if (!hasPhone) {
              resolvedPageType = CampaignPageType.OTP;
            } else if (flowHasConfirmNode(campaign) && !isPacksOnHome(campaign)) {
              resolvedPageType = CampaignPageType.CONFIRM;
            } else if (isPacksOnHome(campaign)) {
              resolvedPageType = CampaignPageType.HOME;
            }
          }
        }
      } else if (guardMode === 'HEADER_INJECTION') {
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
              } else if (
                flowHasConfirmNode(campaign) &&
                !isPacksOnHome(campaign)
              ) {
                resolvedPageType = CampaignPageType.CONFIRM;
              } else if (isPacksOnHome(campaign)) {
                resolvedPageType = CampaignPageType.HOME;
              }
            }
          }
        }
      }
    }

    if (!visitId) {
      const landing = await resolveOrCreateLandingVisit(campaign, {
        ...input,
        phone,
      });
      visitId = landing.visitId;

      let eventType = VisitEventType.HOME_VIEW;
      if (resolvedPageType === CampaignPageType.OTP) {
        eventType = VisitEventType.OTP_VIEW;
      } else if (resolvedPageType === CampaignPageType.CONFIRM) {
        eventType = VisitEventType.CONFIRM_VIEW;
      }
      await analyticsService.logEvent(visitId, eventType);

      const pageAttrEarly = await loadVisitAttribution(visitId, input);
      const ourClickId = pageAttrEarly.clickId;
      const networkRcid = pageAttrEarly.rcid;

      const guardModeForSub =
        flowEngineService.normalizeMode(campaign.verificationMode) || 'BOTH';
      const partnerChecksDone = await visitHasDetectPartnerChecks(visitId, phone);
      // detect-msisdn already ran checksub/blocklist — do not duplicate on HOME load.
      if (guardModeForSub !== 'NONE' && phone && !partnerChecksDone) {
        const partnerCtx = {
          phone,
          serviceId,
          country: campaign.country,
          operator: campaign.operator,
          visitId,
          campaignId: campaign.id,
          clickId: ourClickId,
          rcid: networkRcid,
        };
        const [sub, blockResult] = await Promise.all([
          partnerApiService.checkSubscription(apiConfig, partnerCtx),
          checkBlocklist(apiConfig, partnerCtx),
        ]);
        lastSubCheck = sub;
        lastBlockCheck = blockResult;

        if (blockResult?.blocked) {
          await analyticsService.logEvent(visitId, VisitEventType.BLOCKED, {
            info: 'blocklist on HOME load — keeping HOME (SUBSCRIBE routes to BLOCKED)',
            reason: blockResult.reason,
            phase: 'home_load',
          });
        }
        // Not "new" → historically jumped to THANKYOU / LOW_BALANCE / INPROGRESS.
        // Landing on HOME must stay on HOME so Priority Chain / CTA can run on click.
        if (sub?.shouldSkipSubscribe) {
          const requested = String(
            input.pageType || CampaignPageType.HOME,
          ).toUpperCase();
          const keepHome =
            requested === CampaignPageType.HOME ||
            requested === String(entryPage || '').toUpperCase();

          if (!keepHome) {
            resolvedPageType =
              (sub.go === 'page' && sub.page ? sub.page : null) ||
              pageTypeForSubscriptionStatus(sub.status, sub.isActive) ||
              CampaignPageType.THANKYOU;
          }

          await analyticsService.updateVisit(
            visitId,
            keepHome ? VisitStatus.HOME_SHOWN : VisitStatus.SUBSCRIBED,
            resolvedPageType,
            phone,
          );
          await analyticsService.logEvent(
            visitId,
            keepHome
              ? VisitEventType.HOME_VIEW
              : VisitEventType.SUBSCRIBE_SUCCESS,
            {
              info: keepHome
                ? `checksub status=${sub.status} — keeping HOME (CTA / Priority Chain decides next)`
                : `Skip subscribe — status=${sub.status} → ${resolvedPageType}`,
              currentStatus: sub.currentStatus,
              subscriptionStatus: sub.subscriptionStatus,
              isActive: sub.isActive,
              keepHome,
            },
          );
        } else {
          let visitStatus = VisitStatus.HOME_SHOWN;
          if (resolvedPageType === CampaignPageType.OTP) {
            visitStatus = VisitStatus.OTP_SHOWN;
          } else if (resolvedPageType === CampaignPageType.CONFIRM) {
            visitStatus = VisitStatus.CONFIRM_SHOWN;
          }
          await analyticsService.updateVisit(
            visitId,
            visitStatus,
            resolvedPageType,
            phone,
          );
        }
      } else {
        await analyticsService.updateVisit(
          visitId,
          VisitStatus.HOME_SHOWN,
          resolvedPageType,
          phone || undefined,
        );
      }
    } else if (visitId && phone) {
      await analyticsService.setVisitPhone(visitId, phone);
      if (
        guardMode !== 'NONE' &&
        resolvedPageType === CampaignPageType.HOME
      ) {
        const revisitAttr = await loadVisitAttribution(visitId, input);
        const blockResult = await checkBlocklist(apiConfig, {
          phone,
          visitId,
          campaignId: campaign.id,
          clickId: revisitAttr.clickId,
          rcid: revisitAttr.rcid,
          country: campaign.country,
          operator: campaign.operator,
        });
        lastBlockCheck = blockResult;
        if (blockResult?.blocked) {
          await analyticsService.logEvent(visitId, VisitEventType.BLOCKED, {
            info: 'blocklist on HOME load — keeping HOME (SUBSCRIBE routes to BLOCKED)',
            reason: blockResult.reason,
            phase: 'home_load',
          });
        }
      }
    }

    const cgRedirect = await maybeNullFlowCgRedirect(campaign, visitId, input);
    const pageAttr = await loadVisitAttribution(visitId, input);

    if (cgRedirect) {
      return {
        campaignId: campaign.id,
        visitId,
        pageType: CampaignPageType.HOME,
        entryPage,
        templateId: null,
        html: '',
        css: '',
        variables,
        actions: [],
        pack: normalizePack(input.pack),
        projectData: {},
        cgRedirectUrl: campaign.cgRedirectUrl || null,
        subscriptionUrl: null,
        externalRedirect: cgRedirect,
        clickId: pageAttr.clickId || null,
        rcid: pageAttr.rcid || null,
      };
    }

    const page = campaign.pages.find((p) => p.pageType === resolvedPageType);
    if (!page?.template) {
      const err = new Error(`Page ${resolvedPageType} not configured`);
      err.statusCode = 404;
      throw err;
    }

    const templateData = page.template.data || {};
    const html = variableResolverService.replaceVariables(
      templateData.html || '',
      variables,
    );

    // Content portal after thank-you whenever campaign has successRedirectUrl.
    const successRedirect =
      resolvedPageType === CampaignPageType.THANKYOU
        ? await resolveSuccessRedirect(campaign, visitId, input)
        : null;
    const successRedirectMode = normalizeSuccessRedirectMode(campaign);

    return {
      campaignId: campaign.id,
      visitId,
      pageType: resolvedPageType,
      entryPage,
      templateId: page.templateId,
      html,
      css: templateData.css || '',
      variables,
      actions: getActions(resolvedPageType),
      pack: normalizePack(input.pack),
      projectData: templateData.projectData || {},
      cgRedirectUrl: campaign.cgRedirectUrl || null,
      successRedirectUrl: campaign.successRedirectUrl || null,
      successRedirect,
      successRedirectMode,
      subscriptionStatus: lastSubCheck?.status || null,
      blocked: Boolean(lastBlockCheck?.blocked),
      blockReason: lastBlockCheck?.reason || null,
      subscriptionUrl: buildSubscriptionUrl(
        campaign,
        normalizePack(input.pack),
      ),
      clickId: pageAttr.clickId || null,
      rcid: pageAttr.rcid || null,
    };
  };

  return { getPage };
}
