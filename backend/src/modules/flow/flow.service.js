import { getRepository } from '../../database/index.js';
import { campaignsService } from '../campaigns/campaigns.service.js';
import { CampaignPageType } from '../campaigns/entities/campaign-page.entity.js';
import { partnerApiService } from './partner-api.service.js';
import { partnersService } from '../partners/partners.service.js';
import { analyticsService } from '../analytics/analytics.service.js';
import { VisitStatus } from '../analytics/entities/visit.entity.js';
import { VisitEventType } from '../analytics/entities/visit-event.entity.js';
import { variableResolverService } from '../../common/services/variable-resolver.service.js';
import { flowEngineService } from './flow-engine.service.js';
import { ApiConfig } from '../api-config/entities/api-config.entity.js';
import { OtpRequest } from '../otp/entities/otp-request.entity.js';
import { redisService } from '../../common/services/redis.service.js';
import { isNumericCampid, parseTrackingId } from '../markets/tracking-id.util.js';

export const createFlowService = () => {
  const getApiConfigRepo = () => getRepository(ApiConfig);
  const getOtpRepo = () => getRepository(OtpRequest);

  const normalizePack = (pack) => {
    const value = (pack || 'daily').toLowerCase();
    if (value === 'weekly' || value === 'monthly') return value;
    return 'daily';
  };

  const formatPlanLabel = (pack) => {
    const normalized = normalizePack(pack);
    if (normalized === 'weekly') return 'Weekly Pack';
    if (normalized === 'monthly') return 'Monthly Pack';
    return 'Daily Pack';
  };

  const buildSubscriptionUrl = (campaign, pack) => {
    const params = new URLSearchParams({
      country: campaign.country,
      operator: campaign.operator,
      pack,
    });
    return `/subscription?${params.toString()}`;
  };

  const getActions = (pageType) => {
    if (pageType === CampaignPageType.HOME) return ['SUBSCRIBE'];
    if (pageType === CampaignPageType.OTP) return ['OTP_SEND', 'OTP_VERIFY'];
    if (pageType === CampaignPageType.CONFIRM) return ['CONFIRM'];
    return [];
  };

  const buildPageResponse = (
    campaign,
    pageType,
    variables,
    visitId,
    status,
    pack,
    subscriptionUrl,
  ) => {
    const page = campaign.pages.find((p) => p.pageType === pageType);
    if (!page?.template) {
      const err = new Error(`Page ${pageType} not configured`);
      err.statusCode = 404;
      throw err;
    }
    const templateData = page.template.data || {};
    const resolvedPack = pack ? normalizePack(pack) : undefined;
    const resolvedSubscriptionUrl =
      subscriptionUrl ||
      (resolvedPack
        ? buildSubscriptionUrl(campaign, resolvedPack)
        : undefined);
    return {
      campaignId: campaign.id,
      visitId,
      pageType,
      entryPage: flowEngineService.getEntryPage(
        flowEngineService.parseFlowConfig(campaign.flowConfig),
      ),
      status: status || pageType,
      templateId: page.templateId,
      html: variableResolverService.replaceVariables(
        templateData.html || '',
        variables,
      ),
      css: templateData.css || '',
      variables,
      actions: getActions(pageType),
      pack: resolvedPack,
      subscriptionUrl: resolvedSubscriptionUrl,
    };
  };

  const resolveCampaign = async (input) => {
    const cacheKey = input.campid
      ? `flow:campaign:id:${input.campid}`
      : `flow:campaign:co:${String(input.country).toLowerCase()}:${String(input.operator).toLowerCase()}`;

    const cached = await redisService.get(cacheKey);
    if (cached) return cached;

    let campaign = null;
    if (input.campid) {
      const parsed = parseTrackingId(input.campid);
      if (parsed) {
        campaign = await campaignsService.findByTrackingId(
          parsed.countryCode,
          parsed.operatorCode,
          parsed.campaignId,
        );
      } else if (isNumericCampid(input.campid)) {
        campaign = await campaignsService.findByIdForFlow(
          Number(input.campid),
        );
      }
    }
    if (!campaign) {
      campaign = await campaignsService.findByCountryOperator(
        input.country,
        input.operator,
      );
    }

    if (campaign) {
      await redisService.set(cacheKey, campaign, 15);
      await redisService.set(`flow:campaign:id:${campaign.id}`, campaign, 15);
      if (campaign.trackingId) {
        await redisService.set(
          `flow:campaign:id:${campaign.trackingId}`,
          campaign,
          15,
        );
      }
    }
    return campaign;
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
          ? fromGraph('HEADER_RESOLVED', CampaignPageType.CONFIRM)
          : fromGraph('HEADER_UNRESOLVED', CampaignPageType.ERROR),
        resolvedPhone,
      };
    }

    return {
      nextPage: resolved
        ? fromGraph('HEADER_RESOLVED', CampaignPageType.CONFIRM)
        : fromGraph('HEADER_UNRESOLVED', CampaignPageType.OTP),
      resolvedPhone,
    };
  };

  const maybeSkipToThankYouIfSubscribed = async (
    flowConfig,
    apiConfig,
    campaign,
    serviceId,
    phone,
    fromPage,
    nextPage,
  ) => {
    if (nextPage !== CampaignPageType.CONFIRM || !phone) return nextPage;
    const subscribed = await partnerApiService
      .checkSubscription(apiConfig, {
        phone,
        serviceId,
        country: campaign.country,
        operator: campaign.operator,
      })
      .catch(() => false);
    if (!subscribed) return nextPage;
    return (
      flowEngineService.nextPage(flowConfig, fromPage, 'SUBSCRIBED') ||
      flowEngineService.nextPage(flowConfig, CampaignPageType.CONFIRM, 'SUBSCRIBED') ||
      CampaignPageType.THANKYOU
    );
  };

  const hasVerifiedOtp = async (visitId, phone) => {
    if (!visitId || !phone) return false;
    const verifiedOtp = await getOtpRepo().findOne({
      where: { phone, visitId: parseInt(visitId, 10), status: 'verified' },
    });
    return Boolean(verifiedOtp);
  };

  const assertTrackingAssignmentAvailable = async (
    campaign,
    vid,
    affId,
    vendorId,
    affiliateId,
  ) => {
    const trackings = campaign.trackings || [];
    if (trackings.length === 0) return;
    if (!vid && !affId && vendorId == null) return;

    const vidNorm = vid ? String(vid).trim().toLowerCase() : '';
    const affNorm = affId ? String(affId).trim().toLowerCase() : '';

    let resolvedVendorId = vendorId;
    let resolvedAffiliateId =
      affiliateId === undefined ? undefined : affiliateId;

    let matched =
      trackings.find((t) => {
        const vCode = t.vendor?.code?.trim().toLowerCase() || '';
        const aCode = t.affiliate?.code?.trim().toLowerCase() || '';
        if (vidNorm && vCode !== vidNorm) return false;
        if (affNorm) return aCode === affNorm;
        return !t.affiliate;
      }) || null;

    if (!matched && (!resolvedVendorId || resolvedAffiliateId === undefined)) {
      const attribution = await partnersService
        .resolveAttribution(vid, affId)
        .catch(() => ({
          vendorId: undefined,
          affiliateId: undefined,
          mismatch: false,
        }));
      if (!resolvedVendorId) resolvedVendorId = attribution.vendorId;
      if (resolvedAffiliateId === undefined) {
        resolvedAffiliateId = attribution.affiliateId ?? null;
      }
    }

    if (!matched && resolvedVendorId) {
      const exact = trackings.find(
        (t) =>
          (t.vendor?.id ?? t.vendorId) === resolvedVendorId &&
          (t.affiliate?.id ?? t.affiliateId ?? null) ===
            (resolvedAffiliateId || null),
      );
      matched =
        exact ||
        trackings.find(
          (t) =>
            (t.vendor?.id ?? t.vendorId) === resolvedVendorId &&
            !(t.affiliate?.id ?? t.affiliateId),
        ) ||
        null;
    }

    if (!matched) return;

    const assignmentActive = matched.active !== false;
    const vendorActive = matched.vendor?.active !== false;
    const affiliateActive =
      !matched.affiliate || matched.affiliate.active !== false;

    if (!assignmentActive || !vendorActive || !affiliateActive) {
      const err = new Error('This offer is not available');
      err.statusCode = 403;
      throw err;
    }
  };

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

    await assertTrackingAssignmentAvailable(
      campaign,
      input.vid,
      input.affId,
    );

    const apiConfigCacheKey = `flow:config:${campaign.id}`;
    let apiConfig = await redisService.get(apiConfigCacheKey);
    if (apiConfig === null) {
      apiConfig = await getApiConfigRepo().findOne({
        where: { campaignId: campaign.id },
      });
      await redisService.set(apiConfigCacheKey, apiConfig ?? '__NULL__', 15);
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
    let resolvedPageType = input.pageType;

    const guardMode =
      flowEngineService.normalizeMode(campaign.verificationMode) || 'BOTH';

    if (
      resolvedPageType === CampaignPageType.CONFIRM ||
      resolvedPageType === CampaignPageType.THANKYOU
    ) {
      const isVerified = await hasVerifiedOtp(visitId, phone);
      const hasPhone = Boolean(phone);

      if (guardMode === 'OTP_ONLY') {
        if (!isVerified) {
          const subscribed = await partnerApiService
            .checkSubscription(apiConfig, {
              phone,
              serviceId,
              country: campaign.country,
              operator: campaign.operator,
            })
            .catch(() => false);

          if (subscribed) {
            resolvedPageType = CampaignPageType.THANKYOU;
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
          const subscribed = await partnerApiService
            .checkSubscription(apiConfig, {
              phone,
              serviceId,
              country: campaign.country,
              operator: campaign.operator,
            })
            .catch(() => false);
          if (!subscribed) {
            resolvedPageType = hasPhone
              ? CampaignPageType.CONFIRM
              : CampaignPageType.OTP;
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
            const subscribed = await partnerApiService
              .checkSubscription(apiConfig, {
                phone,
                serviceId,
                country: campaign.country,
                operator: campaign.operator,
              })
              .catch(() => false);
            if (!subscribed) {
              resolvedPageType = hasPhone
                ? CampaignPageType.CONFIRM
                : entryPage;
            }
          }
        }
      }
    }

    if (!visitId) {
      const attrCacheKey = `flow:attr:${input.vid}:${input.affId}`;
      let attribution = await redisService.get(attrCacheKey);
      if (!attribution) {
        attribution = await partnersService
          .resolveAttribution(input.vid, input.affId)
          .catch(() => ({
            vendorId: undefined,
            affiliateId: undefined,
            mismatch: false,
          }));
        await redisService.set(attrCacheKey, attribution, 15);
      }
      const visit = await analyticsService.createVisit({
        campaignId: campaign.id,
        phone: phone || undefined,
        country: campaign.country,
        operator: campaign.operator,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        landingUrl: input.landingUrl,
        visitStatus: VisitStatus.VISIT,
        pageType: resolvedPageType,
        vendorId: attribution.vendorId,
        affiliateId: attribution.affiliateId,
        clickId: input.clickId,
        vidRaw: input.vid,
        affRaw: input.affId,
      });
      visitId = visit.id;

      let eventType = VisitEventType.HOME_VIEW;
      if (resolvedPageType === CampaignPageType.OTP) {
        eventType = VisitEventType.OTP_VIEW;
      } else if (resolvedPageType === CampaignPageType.CONFIRM) {
        eventType = VisitEventType.CONFIRM_VIEW;
      }
      await analyticsService.logEvent(visitId, eventType);

      const subscribed = await partnerApiService.checkSubscription(
        apiConfig,
        {
          phone,
          serviceId,
          country: campaign.country,
          operator: campaign.operator,
        },
      );
      if (subscribed) {
        resolvedPageType = CampaignPageType.THANKYOU;
        await analyticsService.updateVisit(
          visitId,
          VisitStatus.SUBSCRIBED,
          CampaignPageType.THANKYOU,
          phone,
        );
        await analyticsService.logEvent(
          visitId,
          VisitEventType.SUBSCRIBE_SUCCESS,
          {
            info: 'Already subscribed',
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
    } else if (visitId && phone) {
      await analyticsService.setVisitPhone(visitId, phone);
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
    };
  };

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
        visit.affRaw,
        visit.vendorId,
        visit.affiliateId,
      );
    }

    const apiConfig = await getApiConfigRepo().findOne({
      where: { campaignId: campaign.id },
    });

    const phone = input.phone || '';
    const serviceId = campaign.serviceId || 'default_service';

    if (
      input.fromPage === CampaignPageType.HOME &&
      input.action === 'SUBSCRIBE'
    ) {
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_CLICK,
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

      if (mode === 'NONE') {
        nextPage = CampaignPageType.HOME;
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

      nextPage = await maybeSkipToThankYouIfSubscribed(
        flowConfig,
        apiConfig,
        campaign,
        serviceId,
        resolvedPhone,
        CampaignPageType.HOME,
        nextPage,
      );

      const nextStatus =
        nextPage === CampaignPageType.CONFIRM
          ? VisitStatus.CONFIRM_SHOWN
          : nextPage === CampaignPageType.OTP
            ? VisitStatus.OTP_SHOWN
            : nextPage === CampaignPageType.THANKYOU
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
        await analyticsService.logEvent(
          input.visitId,
          VisitEventType.OTP_VIEW,
        );
      } else if (nextPage === CampaignPageType.THANKYOU) {
        await analyticsService.logEvent(
          input.visitId,
          VisitEventType.SUBSCRIBE_SUCCESS,
          { info: 'Already subscribed after HE resolve' },
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
      );
    }

    if (
      input.fromPage === CampaignPageType.CONFIRM &&
      input.action === 'CONFIRM'
    ) {
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
      const blockResult = await partnerApiService.checkBlocked(apiConfig, {
        phone,
        country: campaign.country,
        operator: campaign.operator,
      });

      const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);

      if (blockResult.blocked) {
        const nextPage = flowEngineService.nextPage(
          flowConfig,
          CampaignPageType.CONFIRM,
          'BLOCKED',
        ) || CampaignPageType.BLOCKED;

        await analyticsService.updateVisit(
          input.visitId,
          VisitStatus.BLOCKED,
          nextPage,
          phone,
        );
        await analyticsService.logEvent(
          input.visitId,
          VisitEventType.BLOCKED,
          {
            reason: blockResult.reason,
          },
        );
        return buildPageResponse(
          campaign,
          nextPage,
          confirmVariables,
          input.visitId,
          'BLOCKED',
          selectedPack,
          subscriptionUrl,
        );
      }

      const subscribed = await partnerApiService.checkSubscription(
        apiConfig,
        {
          phone,
          serviceId,
          country: campaign.country,
          operator: campaign.operator,
        },
      );
      if (subscribed) {
        const nextPage = flowEngineService.nextPage(
          flowConfig,
          CampaignPageType.CONFIRM,
          'SUBSCRIBED',
        ) || CampaignPageType.THANKYOU;

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
            info: 'Already subscribed at confirm',
          },
        );
        return buildPageResponse(
          campaign,
          nextPage,
          confirmVariables,
          input.visitId,
          'ALREADY_SUBSCRIBED',
          selectedPack,
          subscriptionUrl,
        );
      }

      const success = await partnerApiService.subscribe(apiConfig, {
        phone,
        serviceId,
        country: campaign.country,
        operator: campaign.operator,
        visitId: input.visitId,
        planId: selectedPack,
        subscriptionUrl,
      });

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
        return buildPageResponse(
          campaign,
          nextPage,
          confirmVariables,
          input.visitId,
          'SUCCESS',
          selectedPack,
          subscriptionUrl,
        );
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
      return buildPageResponse(
        campaign,
        nextPage,
        confirmVariables,
        input.visitId,
        'FAILED',
        selectedPack,
        subscriptionUrl,
      );
    }

    if (
      input.fromPage === CampaignPageType.OTP &&
      input.action === 'CONTINUE'
    ) {
      if (!phone) {
        const err = new Error('Phone number is required to transition from OTP page');
        err.statusCode = 400;
        throw err;
      }

      const verifiedOtp = await getOtpRepo().findOne({
        where: {
          phone,
          visitId: parseInt(input.visitId, 10),
          status: 'verified',
        },
      });

      if (!verifiedOtp) {
        const err = new Error('Phone number has not been verified with OTP');
        err.statusCode = 403;
        throw err;
      }

      const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
      let nextPage =
        flowEngineService.nextPage(
          flowConfig,
          CampaignPageType.OTP,
          'OTP_VERIFIED',
        ) || CampaignPageType.CONFIRM;

      nextPage = await maybeSkipToThankYouIfSubscribed(
        flowConfig,
        apiConfig,
        campaign,
        serviceId,
        phone,
        CampaignPageType.OTP,
        nextPage,
      );

      await analyticsService.logEvent(
        input.visitId,
        nextPage === CampaignPageType.CONFIRM
          ? VisitEventType.CONFIRM_VIEW
          : nextPage === CampaignPageType.THANKYOU
            ? VisitEventType.SUBSCRIBE_SUCCESS
            : VisitEventType.HOME_VIEW,
        {
          info:
            nextPage === CampaignPageType.THANKYOU
              ? 'Already subscribed after OTP'
              : 'Transition from OTP verified successfully',
        },
      );

      const nextStatus =
        nextPage === CampaignPageType.CONFIRM
          ? VisitStatus.CONFIRM_SHOWN
          : nextPage === CampaignPageType.THANKYOU
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
      );
    }

    const err = new Error('Invalid page transition');
    err.statusCode = 400;
    throw err;
  };

  const getFlowEntry = async (input) => {
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
    const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
    return {
      campaignId: campaign.id,
      entryPage: flowEngineService.getEntryPage(flowConfig),
    };
  };

  return {
    resolveCampaign,
    resolveHomeSubscribeNext,
    maybeSkipToThankYouIfSubscribed,
    hasVerifiedOtp,
    getPage,
    transition,
    getFlowEntry,
    assertTrackingAssignmentAvailable,
    getActions,
    normalizePack,
    formatPlanLabel,
    buildSubscriptionUrl,
    buildPageResponse,
  };
};

export const flowService = createFlowService();
