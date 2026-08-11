import {
  pageTypeForSubscriptionStatus,
} from '../../../database/entities/campaign-page.entity.js';
import getConfig from '../../../config/configuration.js';
import { partnerApiService } from '../partner-api.service.js';
import { postbackService } from '../../partners/postback.service.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { redisService } from '../../../common/services/redis.service.js';
import { splitDualCampids } from '../../markets/helpers/tracking-id.util.js';
import { heService } from '../he.service.js';
import { apiCallLogService } from '../api-call-log.service.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { flowEngineService } from '../flow-engine.service.js';
import { shouldRunHeOnDetect } from './he-detect-gate.js';

export function createDetectMsisdn(deps) {
  const {
    getApiConfigRepo,
    isFlowCacheEnabled,
    isApiHeProvider,
    resolveCampaign,
    resolveSuccessRedirect,
    ensureVisitForDetect,
    applyHeRedirectVars,
  } = deps;

  const detectMsisdn = async (input) => {
    const hintPhone = heService.normalizePhone(input.phone || '');
    const campaign = await resolveCampaign(input).catch(() => null);

    if (campaign) {
      const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
      if (flowEngineService.isApiExposeFlow(flowConfig)) {
        const err = new Error(
          'This campaign exposes OTP APIs only. Use GET/POST /api/otp/:campaignId/send and /verify — no WAP subscription pages.',
        );
        err.statusCode = 400;
        throw err;
      }
    }

    let apiConfig = null;
    let serviceId = campaign?.serviceId || '';
    let heMeta = {
      provider: 'header',
      error: null,
      failRedirectUrl: '',
      successRedirectUrl: '',
    };

    if (campaign?.id) {
      apiConfig = await getApiConfigRepo().findOne({
        where: { campaignId: campaign.id },
      });
    }

    if (input.visitId && isFlowCacheEnabled()) {
      const earlyCached = await redisService.get(
        `flow:detect:result:${input.visitId}`,
      );
      if (earlyCached) return earlyCached;
    }

    // Visit-first: mint our click_id before any HE / partner HTTP so logs attach.
    const visitCtx = await ensureVisitForDetect(campaign, input);
    if (visitCtx.visitId && isFlowCacheEnabled()) {
      const cached = await redisService.get(
        `flow:detect:result:${visitCtx.visitId}`,
      );
      if (cached) return cached;
    }

    const attrCtx = {
      visitId: visitCtx.visitId,
      campaignId: campaign?.id || null,
      clickId: visitCtx.clickId,
      rcid: visitCtx.rcid,
    };

    const verificationMode =
      flowEngineService.normalizeMode(campaign?.verificationMode) || 'BOTH';
    const flowConfigForStart = campaign
      ? flowEngineService.parseFlowConfig(campaign.flowConfig)
      : null;
    const startConfig = flowEngineService.getStartConfig(
      flowConfigForStart,
      verificationMode,
    );
    const configuredHeProvider = String(
      apiConfig?.heProvider || 'header',
    )
      .toLowerCase()
      .trim();
    // OTP_ONLY / NONE never run HE. Also skip when heProvider is explicitly `none`
    // or START node disabled runHe.
    const runHe =
      shouldRunHeOnDetect(verificationMode, startConfig) &&
      configuredHeProvider !== 'none';

    const heSource = String(input.heSource || '')
      .toLowerCase()
      .trim();

    if (apiConfig && runHe) {
      heMeta = await heService.resolve(apiConfig, {
        phone: hintPhone,
        hint: hintPhone,
        country: input.country || campaign?.country,
        operator: input.operator || campaign?.operator,
        sessionId: input.sessionId,
        heSource: heSource || undefined,
        heClientLogs: input.heClientLogs || null,
        heClientError: input.heClientError || null,
        ...attrCtx,
      });
    } else if (!runHe) {
      heMeta = {
        phone: '',
        provider: 'none',
        error: null,
        failRedirectUrl: '',
        successRedirectUrl: '',
      };
    }

    const heProviderResolved = runHe
      ? heMeta.provider || configuredHeProvider
      : 'none';

    // Safaricom masked MSISDN must run in the browser (carrier HE path).
    // Hand config back to the client — do not cache / fail-redirect yet.
    if (runHe && heMeta?.needsClientHe) {
      let rawFail = String(heMeta.failRedirectUrl || '').trim();
      if (!rawFail && isApiHeProvider(heProviderResolved)) {
        rawFail = String(campaign?.cgRedirectUrl || '').trim();
      }
      const heRedirectVars = {
        msisdn: '',
        phone: '',
        country: input.country || campaign?.country || '',
        operator: input.operator || campaign?.operator || '',
      };
      const failRedirectUrl = rawFail
        ? applyHeRedirectVars(rawFail, heRedirectVars) || rawFail
        : '';
      const successRedirectUrl = heMeta.successRedirectUrl
        ? applyHeRedirectVars(heMeta.successRedirectUrl, heRedirectVars) ||
          heMeta.successRedirectUrl
        : '';

      return {
        phone: '',
        hasMsisdn: false,
        subscribed: false,
        isActive: false,
        subscriptionStatus: null,
        blocked: false,
        blockReason: null,
        heProvider: heProviderResolved,
        heError: null,
        needsClientHe: true,
        heClientConfig: heMeta.clientConfig || null,
        nextPage: null,
        failRedirectUrl: failRedirectUrl || null,
        successRedirectUrl: successRedirectUrl || null,
        cgRedirectUrl: campaign?.cgRedirectUrl || null,
        country: input.country || campaign?.country,
        operator: input.operator || campaign?.operator,
        campaignId: campaign?.id || null,
        visitId: visitCtx.visitId,
        clickId: visitCtx.clickId,
        rcid: visitCtx.rcid,
      };
    }

    // Token/API HE: only MSISDN from partner APIs counts — not query/header fallback.
    // OTP_ONLY / NONE / heProvider=none: never adopt header/query hint as MSISDN.
    // Browser Safaricom HE: phone arrives via heSource=browser + msisdn.
    let rawPhone = '';
    if (!runHe) {
      rawPhone = '';
    } else if (isApiHeProvider(heProviderResolved)) {
      rawPhone = heMeta.phone ? heService.normalizePhone(heMeta.phone) : '';
    } else {
      rawPhone = heService.normalizePhone(heMeta.phone || hintPhone || '');
    }

    let subscribed = false;
    let subscriptionStatus = null;
    let isActive = false;
    let blocked = false;
    let blockReason = null;
    /** @type {{ go?: string|null, page?: string|null, url?: string|null } | null} */
    let subRes = null;
    const hasChecksub =
      Boolean(apiConfig?.subscriptionApi) && startConfig.runChecksub !== false;
    const hasBlocklist =
      Boolean(apiConfig?.blocklistApi) && startConfig.runBlocklist !== false;

    // Phone mila → checksub + blocklist (only when configured + START allows).
    if (rawPhone && apiConfig && (hasChecksub || hasBlocklist)) {
      const partnerCtx = {
        phone: rawPhone,
        serviceId,
        country: input.country || campaign?.country,
        operator: input.operator || campaign?.operator,
        ...attrCtx,
      };
      const [checksubResult, blockRes] = await Promise.all([
        hasChecksub
          ? partnerApiService
              .checkSubscription(apiConfig, partnerCtx)
              .catch(() => null)
          : Promise.resolve(null),
        hasBlocklist
          ? partnerApiService
              .checkBlocked(apiConfig, partnerCtx)
              .catch(() => ({ blocked: false }))
          : Promise.resolve({ blocked: false }),
      ]);

      subRes = checksubResult;
      subscribed = Boolean(subRes?.shouldSkipSubscribe);
      isActive = Boolean(subRes?.isActive);
      subscriptionStatus = subRes?.status || null;
      blocked = Boolean(blockRes?.blocked);
      blockReason = blockRes?.reason || null;
    }

    if (rawPhone && visitCtx.visitId) {
      await analyticsService
        .setVisitPhone(visitCtx.visitId, rawPhone)
        .catch(() => {});
    }

    // HE success/fail: open configured URL as-is. Never inject click_id / campid /
    // rcid for third parties — those stay internal (visit + api_call_logs only).
    // Only {{msisdn}} / {{phone}} / country / operator placeholders are filled.
    const heRedirectVars = {
      msisdn: rawPhone,
      phone: rawPhone,
      country: input.country || campaign?.country || '',
      operator: input.operator || campaign?.operator || '',
    };

    // Fail redirect: explicit heConfig.failRedirectUrl, else campaign CG URL
    // when using token/API HE (so OTP-only campaigns with a CG field are untouched).
    let rawFail = String(heMeta.failRedirectUrl || '').trim();
    if (!rawPhone && !rawFail && isApiHeProvider(heProviderResolved)) {
      rawFail = String(campaign?.cgRedirectUrl || '').trim();
    }

    const failRedirectUrl = rawFail
      ? applyHeRedirectVars(rawFail, heRedirectVars) || rawFail
      : '';

    const successRedirectUrl = heMeta.successRedirectUrl
      ? applyHeRedirectVars(heMeta.successRedirectUrl, heRedirectVars) ||
        heMeta.successRedirectUrl
      : '';

    const mappedStatusPage =
      subRes?.go === 'page' && subRes?.page
        ? subRes.page
        : pageTypeForSubscriptionStatus(subscriptionStatus, isActive);
    const normalizedStatus = String(subscriptionStatus || '')
      .trim()
      .toLowerCase();
    const isNewStatus =
      subRes?.go === 'continue' || normalizedStatus === 'new';
    const ruleExternalUrl =
      subRes?.go === 'external' && subRes?.url
        ? applyHeRedirectVars(subRes.url, heRedirectVars) || subRes.url
        : null;

    let campaignSuccessRedirectUrl = null;
    if (rawPhone && campaign?.successRedirectUrl?.trim()) {
      campaignSuccessRedirectUrl = await resolveSuccessRedirect(
        campaign,
        visitCtx.visitId,
        input,
      );
    }

    let nextPage = null;
    let outboundFailRedirectUrl = failRedirectUrl || null;
    let outboundSuccessRedirectUrl = successRedirectUrl || null;

    if (rawPhone && hasBlocklist && blocked) {
      nextPage = 'BLOCKED';
      outboundSuccessRedirectUrl = null;
      outboundFailRedirectUrl = null;
    } else if (rawPhone && hasChecksub) {
      if (ruleExternalUrl) {
        outboundSuccessRedirectUrl = ruleExternalUrl;
        outboundFailRedirectUrl = null;
        nextPage = null;
      } else if (isActive) {
        outboundSuccessRedirectUrl = campaignSuccessRedirectUrl || null;
        if (!outboundSuccessRedirectUrl) {
          nextPage = 'THANKYOU';
        }
      } else if (isNewStatus) {
        outboundSuccessRedirectUrl = successRedirectUrl || null;
        outboundFailRedirectUrl = null;
      } else if (mappedStatusPage) {
        outboundSuccessRedirectUrl = null;
        nextPage = mappedStatusPage;
        outboundFailRedirectUrl = null;
      } else {
        outboundSuccessRedirectUrl = null;
        outboundFailRedirectUrl = null;
      }
    } else if (rawPhone && !hasChecksub) {
      // No checksub configured — legacy: phone + HE success URL.
      outboundSuccessRedirectUrl = successRedirectUrl || null;
    }

    // Log redirect decision against the same visit (visible in Session Detail).
    let redirectOutcome = 'stay';
    let redirectUrl = null;
    if (rawPhone && nextPage === 'BLOCKED') {
      redirectOutcome = 'blocked';
    } else if (rawPhone && nextPage) {
      redirectOutcome = String(nextPage).toLowerCase();
    } else if (rawPhone && outboundSuccessRedirectUrl) {
      redirectOutcome = ruleExternalUrl
        ? 'checksub_external'
        : isActive
          ? 'campaign_success'
          : 'he_success';
      redirectUrl = outboundSuccessRedirectUrl;
    } else if (
      !rawPhone &&
      outboundFailRedirectUrl &&
      isApiHeProvider(heProviderResolved)
    ) {
      redirectOutcome = 'fail';
      redirectUrl = outboundFailRedirectUrl;
    }

    // HE new + success redirect: upsert conversion_postbacks by msisdn.
    // TEMP: HE_DUMMY_MSISDN (fallback or exact match) also queues pending so
    // postback/callback flow can be tested end-to-end (unset env to disable).
    const dummyEnv = String(getConfig().heDummyMsisdn || '').replace(/\D/g, '');
    const isDummyPhone =
      Boolean(heMeta?.heDummyFallback) ||
      (Boolean(dummyEnv) && rawPhone === dummyEnv);
    const shouldQueuePostback =
      Boolean(rawPhone) &&
      !blocked &&
      ((hasChecksub &&
        isNewStatus &&
        redirectOutcome === 'he_success') ||
        isDummyPhone);

    if (shouldQueuePostback) {
      const dualIds = splitDualCampids(input);
      try {
        const queued = await postbackService.registerPending({
          visitId: visitCtx.visitId,
          msisdn: rawPhone,
          campaignId: campaign?.id,
          campid: dualIds.vendorCampid,
          trackingCampid: dualIds.trackingCampid || campaign?.trackingId || '',
          clickId: visitCtx.clickId,
          rcid: visitCtx.rcid,
        });
        if (queued?.skipped) {
          console.warn(
            `detectMsisdn registerPending skipped: ${queued.reason || 'unknown'} (msisdn=${rawPhone})`,
          );
        } else if (queued?.id) {
          console.log(
            `detectMsisdn registerPending ok id=${queued.id} msisdn=${rawPhone} dummy=${isDummyPhone}`,
          );
        }
      } catch (err) {
        console.warn(`detectMsisdn registerPending failed: ${err.message}`);
      }
    }

    // OTP_ONLY / NONE: no HE attempt → no he_redirect noise in Session Detail.
    if (runHe && (visitCtx.visitId || campaign?.id)) {
      try {
        await apiCallLogService.record({
          visitId: visitCtx.visitId,
          campaignId: campaign?.id,
          msisdn: rawPhone || null,
          rcid: visitCtx.rcid,
          clickId: visitCtx.clickId,
          callType: ApiCallType.HE_REDIRECT,
          requestUrl: redirectUrl,
          requestBody: JSON.stringify({
            outcome: redirectOutcome,
            heProvider: heProviderResolved,
            heError: heMeta.error || null,
            subscriptionStatus: subscriptionStatus || null,
            isActive,
            blocked,
            blockReason,
            nextPage,
            verificationMode,
          }),
          responseStatus: null,
          responseBody: null,
          success:
            redirectOutcome === 'he_success' ||
            redirectOutcome === 'campaign_success'
              ? true
              : redirectOutcome === 'fail'
                ? false
                : null,
          errorMessage:
            redirectOutcome === 'fail' ? heMeta.error || null : null,
          statusLabel:
            redirectOutcome === 'he_success'
              ? 'HE_SUCCESS'
              : redirectOutcome === 'campaign_success'
                ? 'CAMPAIGN_SUCCESS'
                : redirectOutcome === 'fail'
                  ? 'FAILED'
                  : redirectOutcome === 'blocked'
                    ? 'BLOCKED'
                    : nextPage
                      ? String(nextPage).toUpperCase()
                      : 'STAY',
        });
      } catch (err) {
        console.warn(`he_redirect log failed: ${err.message}`);
      }
    }

    if (!rawPhone) {
      outboundSuccessRedirectUrl = null;
    }

    const result = {
      phone: rawPhone,
      hasMsisdn: Boolean(rawPhone),
      subscribed,
      isActive,
      subscriptionStatus,
      blocked,
      blockReason,
      heProvider: heProviderResolved,
      heError: heMeta.error || null,
      nextPage,
      failRedirectUrl: outboundFailRedirectUrl || null,
      successRedirectUrl: outboundSuccessRedirectUrl || null,
      cgRedirectUrl: campaign?.cgRedirectUrl || null,
      country: input.country || campaign?.country,
      operator: input.operator || campaign?.operator,
      campaignId: campaign?.id || null,
      visitId: visitCtx.visitId,
      clickId: visitCtx.clickId,
      rcid: visitCtx.rcid,
    };

    if (visitCtx.visitId && isFlowCacheEnabled()) {
      await redisService.set(
        `flow:detect:result:${visitCtx.visitId}`,
        result,
        60,
      );
    }

    return result;
  };

  return { detectMsisdn };
}
