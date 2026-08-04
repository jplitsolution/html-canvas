import { randomUUID } from 'crypto';
import { getRepository } from '../../database/index.js';
import { campaignsService } from '../campaigns/campaigns.service.js';
import {
  CampaignPageType,
  pageTypeForSubscriptionStatus,
} from '../campaigns/entities/campaign-page.entity.js';
import { partnerApiService } from './partner-api.service.js';
import { partnersService } from '../partners/partners.service.js';
import { postbackService } from '../partners/postback.service.js';
import { analyticsService } from '../analytics/analytics.service.js';
import { VisitStatus } from '../analytics/entities/visit.entity.js';
import { VisitEventType } from '../analytics/entities/visit-event.entity.js';
import { variableResolverService } from '../../common/services/variable-resolver.service.js';
import { flowEngineService } from './flow-engine.service.js';
import { ApiConfig } from '../api-config/entities/api-config.entity.js';
import { redisService } from '../../common/services/redis.service.js';
import {
  isNumericCampid,
  parseTrackingId,
} from '../markets/tracking-id.util.js';
import { getDefaultFunnelPageData } from '../../database/seed/default-funnel-pages.js';
import { otpService } from '../otp/otp.service.js';
import { heService } from './he.service.js';
import getConfig from '../../config/configuration.js';

export const createFlowService = () => {
  const getApiConfigRepo = () => getRepository(ApiConfig);
  const isFlowCacheEnabled = () => getConfig().flowCacheEnabled !== false;

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

  /**
   * Null-flow CG redirect: {{click_id}} = our id; {{rcid}} = affiliate original.
   * Default append uses our click_id.
   */
  const buildCgRedirectUrl = (rawUrl, attrs = {}) => {
    const ourClickId = String(attrs.clickId || '').trim();
    const rcid = String(attrs.rcid || '').trim();
    let url = String(rawUrl || '').trim();
    if (!url) return '';

    const vars = {
      click_id: ourClickId,
      rcid,
      clickId: ourClickId,
      vid: attrs.vid || '',
      aff_id: attrs.affId || '',
      campid: attrs.campid != null ? String(attrs.campid) : '',
    };
    const original = url;
    for (const [key, val] of Object.entries(vars)) {
      url = url.split(`{{${key}}}`).join(encodeURIComponent(val));
      url = url.split(`{${key}}`).join(encodeURIComponent(val));
    }

    const hadPlaceholder =
      /\{\{?(?:click_id|rcid|clickId|vid|aff_id|campid)\}?\}/.test(original);
    if (ourClickId && !hadPlaceholder) {
      try {
        const u = new URL(url);
        if (!u.searchParams.has('click_id') && !u.searchParams.has('rcid')) {
          u.searchParams.set('click_id', ourClickId);
        }
        return u.toString();
      } catch {
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}click_id=${encodeURIComponent(ourClickId)}`;
      }
    }
    return url;
  };

  const loadVisitAttribution = async (visitId, input = {}) => {
    let clickId = String(input.clickId || '').trim();
    let rcid = String(input.rcid || '').trim();
    let vid = input.vid || '';
    let affId = input.affId || '';
    let vendorId = input.vendorId || null;
    let affiliateId = input.affiliateId || null;
    let campaignId = input.campaignId || null;

    if (visitId) {
      try {
        const visit = await analyticsService.getVisit(visitId);
        if (visit) {
          clickId = visit.clickId || clickId;
          rcid = visit.rcid || rcid;
          vid = vid || visit.vidRaw || '';
          affId = affId || visit.affRaw || '';
          vendorId = vendorId || visit.vendorId || null;
          affiliateId = affiliateId || visit.affiliateId || null;
          campaignId = campaignId || visit.campaignId || null;
        }
      } catch {
        /* ignore */
      }
    }
    return { clickId, rcid, vid, affId, vendorId, affiliateId, campaignId };
  };

  const resolveSuccessRedirect = async (campaign, visitId, input = {}) => {
    const raw = campaign?.successRedirectUrl?.trim();
    if (!raw) return null;
    const attr = await loadVisitAttribution(visitId, input);
    const resolved = buildCgRedirectUrl(raw, {
      clickId: attr.clickId,
      rcid: attr.rcid,
      vid: attr.vid,
      affId: attr.affId,
      campid: attr.campaignId || campaign.id,
    });
    return resolved && /^https?:\/\//i.test(resolved) ? resolved : null;
  };

  const maybeNullFlowCgRedirect = async (campaign, visitId, input = {}) => {
    const mode =
      flowEngineService.normalizeMode(campaign.verificationMode) || 'BOTH';
    const cg = campaign.cgRedirectUrl?.trim();
    if (mode !== 'NONE' || !cg) return null;

    const attr = await loadVisitAttribution(visitId, input);
    return buildCgRedirectUrl(cg, {
      clickId: attr.clickId,
      rcid: attr.rcid,
      vid: attr.vid,
      affId: attr.affId,
      campid: input.campid || campaign.id,
    });
  };

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
        templateData = getDefaultFunnelPageData(pageType);
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
        ? await resolveSuccessRedirect(campaign, visitId)
        : null;
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
      subscriptionStatus: options.subscriptionStatus || null,
      clickId: attr.clickId || null,
      rcid: attr.rcid || null,
    };
  };

  const resolveCampaign = async (input) => {
    const cacheKey = input.campid
      ? `flow:campaign:id:${input.campid}`
      : `flow:campaign:co:${String(input.country).toLowerCase()}:${String(input.operator).toLowerCase()}`;

    if (isFlowCacheEnabled()) {
      const cached = await redisService.get(cacheKey);
      if (cached) return cached;
    }

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

    if (campaign && isFlowCacheEnabled()) {
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

  const resolveSkipPage = (flowConfig, fromPage, sub) => {
    const byStatus = pageTypeForSubscriptionStatus(sub?.status, sub?.isActive);
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

  const maybeSkipToThankYouIfSubscribed = async (
    flowConfig,
    apiConfig,
    campaign,
    serviceId,
    phone,
    fromPage,
    nextPage,
  ) => {
    if (nextPage !== CampaignPageType.CONFIRM || !phone) {
      return { nextPage, sub: null };
    }
    const sub = await partnerApiService
      .checkSubscription(apiConfig, {
        phone,
        serviceId,
        country: campaign.country,
        operator: campaign.operator,
      })
      .catch(() => null);
    if (!sub?.shouldSkipSubscribe) return { nextPage, sub };
    const skipPage = resolveSkipPage(flowConfig, fromPage, sub);
    return { nextPage: skipPage || CampaignPageType.THANKYOU, sub };
  };

  const hasVerifiedOtp = async (visitId, phone) => {
    return otpService.isVisitOtpVerified(visitId, phone);
  };

  const assertTrackingAssignmentAvailable = async (
    campaign,
    vid,
    _affId,
    vendorId,
  ) => {
    const trackings = campaign.trackings || [];
    if (trackings.length === 0) return;
    if (!vid && vendorId == null) return;

    const vidNorm = vid ? String(vid).trim().toLowerCase() : '';
    let resolvedVendorId = vendorId;

    let matched =
      trackings.find((t) => {
        const vCode = t.vendor?.code?.trim().toLowerCase() || '';
        return vidNorm && vCode === vidNorm;
      }) || null;

    if (!matched && !resolvedVendorId) {
      const attribution = await partnersService
        .resolveAttribution(vid)
        .catch(() => ({ vendorId: undefined }));
      resolvedVendorId = attribution.vendorId;
    }

    if (!matched && resolvedVendorId) {
      matched =
        trackings.find(
          (t) => (t.vendor?.id ?? t.vendorId) === resolvedVendorId,
        ) || null;
    }

    if (!matched) return;

    const assignmentActive = matched.active !== false;
    const vendorActive = matched.vendor?.active !== false;

    if (!assignmentActive || !vendorActive) {
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
        await redisService.set(apiConfigCacheKey, apiConfig ?? '__NULL__', 15);
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

    const guardMode =
      flowEngineService.normalizeMode(campaign.verificationMode) || 'BOTH';

    // Direct page-link navigation (href="CONFIRM" from the builder) should render
    // the chosen page. Funnel guards still apply to normal ?step= / prefetch loads
    // and to /flow/transition.
    if (
      !input.direct &&
      (resolvedPageType === CampaignPageType.CONFIRM ||
        resolvedPageType === CampaignPageType.THANKYOU)
    ) {
      const isVerified = await hasVerifiedOtp(visitId, phone);
      const hasPhone = Boolean(phone);

      if (guardMode === 'OTP_ONLY') {
        if (!isVerified) {
          const sub = await partnerApiService
            .checkSubscription(apiConfig, {
              phone,
              serviceId,
              country: campaign.country,
              operator: campaign.operator,
            })
            .catch(() => null);

          if (sub?.shouldSkipSubscribe) {
            resolvedPageType =
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
            .checkSubscription(apiConfig, {
              phone,
              serviceId,
              country: campaign.country,
              operator: campaign.operator,
            })
            .catch(() => null);
          if (!sub?.shouldSkipSubscribe) {
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
            const sub = await partnerApiService
              .checkSubscription(apiConfig, {
                phone,
                serviceId,
                country: campaign.country,
                operator: campaign.operator,
              })
              .catch(() => null);
            if (!sub?.shouldSkipSubscribe) {
              resolvedPageType = hasPhone
                ? CampaignPageType.CONFIRM
                : entryPage;
            }
          }
        }
      }
    }

    if (!visitId) {
      const attrCacheKey = `flow:attr:${input.vid || ''}`;
      let attribution = await redisService.get(attrCacheKey);
      if (!attribution) {
        attribution = await partnersService
          .resolveAttribution(input.vid)
          .catch(() => ({
            vendorId: undefined,
            affiliateId: null,
            mismatch: false,
          }));
        await redisService.set(attrCacheKey, attribution, 15);
      }
      // Dual IDs: network original → rcid; our UUID → click_id (stable for this visit).
      const networkRcid = String(input.rcid || input.clickId || '').trim() || null;
      const ourClickId = randomUUID();
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
        affiliateId: null,
        clickId: ourClickId,
        rcid: networkRcid,
        vidRaw: input.vid,
        affRaw: null,
      });
      visitId = visit.id;

      let eventType = VisitEventType.HOME_VIEW;
      if (resolvedPageType === CampaignPageType.OTP) {
        eventType = VisitEventType.OTP_VIEW;
      } else if (resolvedPageType === CampaignPageType.CONFIRM) {
        eventType = VisitEventType.CONFIRM_VIEW;
      }
      await analyticsService.logEvent(visitId, eventType);

      const guardModeForSub =
        flowEngineService.normalizeMode(campaign.verificationMode) || 'BOTH';
      // Null/CG flow: no checksub — just store visit + redirect
      if (guardModeForSub !== 'NONE' && phone) {
        const sub = await partnerApiService.checkSubscription(apiConfig, {
          phone,
          serviceId,
          country: campaign.country,
          operator: campaign.operator,
          visitId,
          campaignId: campaign.id,
          clickId: ourClickId,
          rcid: networkRcid,
        });
        lastSubCheck = sub;
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
    }

    const cgRedirect = await maybeNullFlowCgRedirect(campaign, visitId, input);
    const pageAttr = await loadVisitAttribution(visitId, input);

    // CG null-flow: if we already have MSISDN, queue vendor pending for billing callback.
    if (cgRedirect && phone) {
      void postbackService.registerPending({
        visitId,
        msisdn: phone,
        campaignId: campaign.id,
        campid: input.campid || String(campaign.id),
        clickId: pageAttr.clickId,
        rcid: pageAttr.rcid,
        vendorId: pageAttr.vendorId,
        affiliateId: null,
      });
    }

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
      subscriptionStatus: lastSubCheck?.status || null,
      subscriptionUrl: buildSubscriptionUrl(
        campaign,
        normalizePack(input.pack),
      ),
      clickId: pageAttr.clickId || null,
      rcid: pageAttr.rcid || null,
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
        null,
        visit.vendorId,
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
        const redirect = await maybeNullFlowCgRedirect(
          campaign,
          input.visitId,
          {
            clickId: input.clickId,
            vid: input.vid,
            affId: input.affId,
            campid: input.campid,
          },
        );
        if (redirect) {
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

      const skipResult = await maybeSkipToThankYouIfSubscribed(
        flowConfig,
        apiConfig,
        campaign,
        serviceId,
        resolvedPhone,
        CampaignPageType.HOME,
        nextPage,
      );
      nextPage = skipResult.nextPage;
      const skipSub = skipResult.sub;

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

      // Immediately log confirm + queue vendor pending (billing callback will fire).
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.CONFIRM_CLICK,
        {
          clickId: confirmAttr.clickId,
          rcid: confirmAttr.rcid,
          pack: selectedPack,
        },
      );
      void postbackService.registerPending({
        visitId: input.visitId,
        msisdn: phone,
        campaignId: campaign.id,
        campid: input.campid || String(campaign.id),
        clickId: confirmAttr.clickId,
        rcid: confirmAttr.rcid,
        vendorId: confirmAttr.vendorId,
        affiliateId: null,
      });

      const blockResult = await partnerApiService.checkBlocked(
        apiConfig,
        partnerCtx,
      );

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

      const subAtConfirm = await partnerApiService.checkSubscription(
        apiConfig,
        partnerCtx,
      );
      if (subAtConfirm?.shouldSkipSubscribe) {
        const nextPage =
          resolveSkipPage(flowConfig, CampaignPageType.CONFIRM, subAtConfirm) ||
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
        return buildPageResponse(
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
        );
      }

      const success = await partnerApiService.subscribe(apiConfig, {
        ...partnerCtx,
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

      const verifiedOtp = await hasVerifiedOtp(input.visitId, phone);

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

      const skipAfterOtp = await maybeSkipToThankYouIfSubscribed(
        flowConfig,
        apiConfig,
        campaign,
        serviceId,
        phone,
        CampaignPageType.OTP,
        nextPage,
      );
      nextPage = skipAfterOtp.nextPage;
      const skipSubOtp = skipAfterOtp.sub;

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
    }

    const err = new Error('Invalid page transition');
    err.statusCode = 400;
    throw err;
  };

  const detectMsisdn = async (input) => {
    let rawPhone = heService.normalizePhone(input.phone || '');
    const campaign = await resolveCampaign(input).catch(() => null);
    let apiConfig = null;
    let serviceId = campaign?.serviceId || '';
    let heMeta = { provider: 'header', error: null };

    if (campaign?.id) {
      apiConfig = await getApiConfigRepo().findOne({
        where: { campaignId: campaign.id },
      });
    }

    if (apiConfig) {
      heMeta = await heService.resolve(apiConfig, {
        phone: rawPhone,
        hint: rawPhone,
        country: input.country || campaign?.country,
        operator: input.operator || campaign?.operator,
      });
      if (heMeta.phone) {
        rawPhone = heMeta.phone;
      }
    }

    let subscribed = false;
    let subscriptionStatus = null;
    let isActive = false;
    let blocked = false;
    let blockReason = null;

    if (rawPhone && apiConfig) {
      const [subRes, blockRes] = await Promise.all([
        partnerApiService
          .checkSubscription(apiConfig, {
            phone: rawPhone,
            serviceId,
            country: input.country || campaign?.country,
            operator: input.operator || campaign?.operator,
          })
          .catch(() => null),
        partnerApiService
          .checkBlocked(apiConfig, {
            phone: rawPhone,
          })
          .catch(() => ({ blocked: false })),
      ]);

      subscribed = Boolean(subRes?.shouldSkipSubscribe);
      isActive = Boolean(subRes?.isActive);
      subscriptionStatus = subRes?.status || null;
      blocked = Boolean(blockRes?.blocked);
      blockReason = blockRes?.reason || null;
    }

    return {
      phone: rawPhone,
      hasMsisdn: Boolean(rawPhone),
      subscribed,
      isActive,
      subscriptionStatus,
      blocked,
      blockReason,
      heProvider: heMeta.provider || apiConfig?.heProvider || 'header',
      heError: heMeta.error || null,
      cgRedirectUrl: campaign?.cgRedirectUrl || null,
      country: input.country || campaign?.country,
      operator: input.operator || campaign?.operator,
      campaignId: campaign?.id || null,
    };
  };

  const getFlowEntry = async (input) => {
    const campaign = await resolveCampaign(input);
    if (!campaign) {
      const err = new Error(
        `No campaign found for ${input.country} / ${input.operator}`,
      );
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
    detectMsisdn,
    assertTrackingAssignmentAvailable,
    getActions,
    normalizePack,
    formatPlanLabel,
    buildSubscriptionUrl,
    buildPageResponse,
  };
};

export const flowService = createFlowService();
