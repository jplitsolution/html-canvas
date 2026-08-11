/**
 * Single-page Subscribe with Priority-Chain-style response rules.
 *
 * Client sends subscribeRoutes: { rules, noPhone, miss, fail }.
 * We run checksub → match rules on status fields → else partner subscribe.
 *
 * routeOutcome:
 *   NO_PHONE | BLOCKED | RULE_MATCH | SUCCESS | FAIL
 * When a rule matches: matchedGo / matchedPage / matchedUrl are set.
 */
import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { partnerApiService } from '../partner-api.service.js';
import { postbackService } from '../../partners/postback.service.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitStatus } from '../../../database/entities/visit.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { flowEngineService } from '../flow-engine.service.js';

const DEFAULT_PAGE_FOR_OUTCOME = {
  NO_PHONE: CampaignPageType.OTP,
  BLOCKED: CampaignPageType.BLOCKED,
  RULE_MATCH: CampaignPageType.THANKYOU,
  SUCCESS: CampaignPageType.THANKYOU,
  FAIL: CampaignPageType.ERROR,
};

function getResponseField(data, key) {
  if (!data || typeof data !== 'object' || !key) return null;
  if (data[key] !== undefined && data[key] !== null) return data[key];
  const snake = String(key)
    .replace(/([A-Z])/g, '_$1')
    .replace(/__/g, '_')
    .toLowerCase()
    .replace(/^_/, '');
  if (snake !== key && data[snake] !== undefined && data[snake] !== null) {
    return data[snake];
  }
  return null;
}

function readField(json, key) {
  const nested = json?.data && typeof json.data === 'object' ? json.data : null;
  return (
    getResponseField(json, key) ?? (nested ? getResponseField(nested, key) : null)
  );
}

function normalizeRules(routes) {
  const list = Array.isArray(routes?.rules) ? routes.rules : [];
  return list
    .map((r) => ({
      key: String(r?.key || '').trim(),
      value: r?.value != null ? String(r.value).trim() : '',
      go: r?.go === 'external' ? 'external' : 'page',
      page: String(r?.page || 'THANKYOU').trim().toUpperCase(),
      url: String(r?.url || '').trim(),
    }))
    .filter((r) => r.key && r.value !== '');
}

/** First matching key=value rule on partner/checksub body. */
function matchRules(body, rules) {
  if (!body || !rules.length) return null;
  for (const rule of rules) {
    const actual = readField(body, rule.key);
    if (actual === undefined || actual === null) continue;
    if (String(actual) === rule.value) {
      return rule;
    }
  }
  return null;
}

function buildMatchBodyFromChecksub(subCheck) {
  if (!subCheck) return {};
  return {
    currentStatus: subCheck.currentStatus || subCheck.status || '',
    subscriptionStatus: subCheck.subscriptionStatus || '',
    status: subCheck.status || subCheck.currentStatus || '',
    isActive: Boolean(subCheck.isActive),
    shouldSkipSubscribe: Boolean(subCheck.shouldSkipSubscribe),
    blocked: false,
    reason: subCheck.reason || '',
  };
}

export function createHandleSubscribeRoute(deps) {
  const {
    normalizePack,
    formatPlanLabel,
    buildSubscriptionUrl,
    loadVisitAttribution,
    buildPageResponse,
    buildBlockedPageResponse,
    checkBlocklist,
    shouldRegisterPostbackAt,
  } = deps;

  return async (input, campaign, apiConfig, phone, serviceId) => {
    await analyticsService.logEvent(
      input.visitId,
      VisitEventType.SUBSCRIBE_CLICK,
      { info: 'SUBSCRIBE_ROUTE (single-page subscribe + rules)' },
    );

    const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
    const rules = normalizeRules(input.subscribeRoutes);
    let resolvedPhone = String(phone || '').trim();

    if (!resolvedPhone) {
      try {
        const v = await analyticsService.getVisit(input.visitId);
        if (v?.phone?.trim()) resolvedPhone = v.phone.trim();
      } catch (err) {
        console.error(
          `SUBSCRIBE_ROUTE visit phone resolve failed: ${err.message}`,
        );
      }
    }

    if (!resolvedPhone && apiConfig) {
      try {
        const isp = await partnerApiService.resolveMsisdn(apiConfig, {
          country: campaign.country,
          operator: campaign.operator,
          hint: phone,
        });
        if (isp) {
          resolvedPhone = isp;
          await analyticsService.setVisitPhone(input.visitId, isp);
        }
      } catch (err) {
        console.warn(`SUBSCRIBE_ROUTE resolveMsisdn: ${err.message}`);
      }
    }

    const selectedPack = normalizePack(input.planId || 'daily');
    const subscriptionUrl = buildSubscriptionUrl(campaign, selectedPack);
    const variables = {
      phone: resolvedPhone,
      country: campaign.country,
      operator: campaign.operator,
      service_id: serviceId,
      plan: formatPlanLabel(selectedPack),
    };

    const respond = async (routeOutcome, pageType, extra = {}) => {
      const page =
        pageType ||
        DEFAULT_PAGE_FOR_OUTCOME[routeOutcome] ||
        CampaignPageType.HOME;
      const body = await buildPageResponse(
        campaign,
        page,
        { ...variables, phone: resolvedPhone },
        input.visitId,
        extra.status,
        selectedPack,
        subscriptionUrl,
        {
          subscriptionStatus: extra.subscriptionStatus || null,
          allowSuccessRedirect: Boolean(extra.allowSuccessRedirect),
        },
      );
      return {
        ...body,
        routeOutcome,
        matchBody: extra.matchBody || null,
        matchedGo: extra.matchedGo || null,
        matchedPage: extra.matchedPage || null,
        matchedUrl: extra.matchedUrl || null,
        ...(extra.externalRedirect
          ? { externalRedirect: extra.externalRedirect }
          : {}),
      };
    };

    const respondRule = async (rule, matchBody, statusLabel) => {
      const page =
        rule.go === 'page' && rule.page
          ? rule.page
          : CampaignPageType.THANKYOU;
      await analyticsService.updateVisit(
        input.visitId,
        VisitStatus.SUBSCRIBED,
        page,
        resolvedPhone || undefined,
      );
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_SUCCESS,
        {
          info: `SUBSCRIBE_ROUTE rule ${rule.key}=${rule.value} → ${rule.go} ${rule.page || rule.url}`,
          currentStatus: matchBody?.currentStatus,
        },
      );
      return respond('RULE_MATCH', page, {
        status: statusLabel || 'RULE_MATCH',
        subscriptionStatus: matchBody?.status || matchBody?.currentStatus,
        allowSuccessRedirect: true,
        matchBody,
        matchedGo: rule.go,
        matchedPage: rule.go === 'page' ? rule.page : null,
        matchedUrl: rule.go === 'external' ? rule.url : null,
        ...(rule.go === 'external' && rule.url
          ? { externalRedirect: rule.url }
          : {}),
      });
    };

    if (!resolvedPhone) {
      await analyticsService.updateVisit(
        input.visitId,
        VisitStatus.OTP_SHOWN,
        CampaignPageType.OTP,
      );
      await analyticsService.logEvent(input.visitId, VisitEventType.OTP_VIEW, {
        info: 'SUBSCRIBE_ROUTE — no MSISDN',
      });
      return respond('NO_PHONE', CampaignPageType.OTP);
    }

    const attr = await loadVisitAttribution(input.visitId, input);
    const partnerCtx = {
      phone: resolvedPhone,
      serviceId,
      country: campaign.country,
      operator: campaign.operator,
      visitId: input.visitId,
      campaignId: campaign.id,
      clickId: attr.clickId || input.clickId,
      rcid: attr.rcid || input.rcid,
    };

    const blockResult = await checkBlocklist(apiConfig, partnerCtx);
    if (blockResult?.blocked) {
      const blockBody = {
        currentStatus: 'blocked',
        status: 'blocked',
        blocked: true,
        reason: blockResult.reason || '',
      };
      const rule = matchRules(blockBody, rules);
      if (rule) {
        return respondRule(rule, blockBody, 'BLOCKED');
      }
      return {
        ...(await buildBlockedPageResponse(
          campaign,
          flowConfig,
          input.visitId,
          resolvedPhone,
          serviceId,
          blockResult.reason,
          'Blocked on SUBSCRIBE_ROUTE',
        )),
        routeOutcome: 'BLOCKED',
        matchBody: blockBody,
      };
    }

    if (shouldRegisterPostbackAt?.(campaign, 'confirm')) {
      void postbackService.registerPending({
        visitId: input.visitId,
        msisdn: resolvedPhone,
        campaignId: campaign.id,
        campid: attr.campid || '',
        trackingCampid: attr.trackingCampid || campaign.trackingId || '',
        clickId: attr.clickId,
        rcid: attr.rcid,
        vendorId: attr.vendorId,
        affiliateId: null,
      });
    }

    const subCheck = await partnerApiService
      .checkSubscription(apiConfig, partnerCtx)
      .catch(() => null);

    const checkBody = buildMatchBodyFromChecksub(subCheck);

    if (subCheck?.go === 'external' && subCheck?.url) {
      await analyticsService.updateVisit(
        input.visitId,
        VisitStatus.SUBSCRIBED,
        CampaignPageType.THANKYOU,
        resolvedPhone,
      );
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_SUCCESS,
        {
          info: `SUBSCRIBE_ROUTE checksub external — status=${subCheck.status}`,
          currentStatus: subCheck.currentStatus,
        },
      );
      return respond('RULE_MATCH', CampaignPageType.THANKYOU, {
        status: 'ALREADY_SUBSCRIBED',
        subscriptionStatus: subCheck.status,
        allowSuccessRedirect: true,
        externalRedirect: subCheck.url,
        matchBody: checkBody,
        matchedGo: 'external',
        matchedUrl: subCheck.url,
      });
    }

    const checkRule = matchRules(checkBody, rules);
    if (checkRule) {
      return respondRule(checkRule, checkBody, 'CHECKSUB_RULE');
    }

    // No rule matched checksub — if already subscribed / non-new, still surface as
    // SUCCESS-ish miss (client miss destination) without hitting subscribe again.
    if (subCheck?.shouldSkipSubscribe) {
      await analyticsService.updateVisit(
        input.visitId,
        VisitStatus.SUBSCRIBED,
        CampaignPageType.THANKYOU,
        resolvedPhone,
      );
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_SUCCESS,
        {
          info: `SUBSCRIBE_ROUTE skip subscribe (no rule) — status=${subCheck.status}`,
          currentStatus: subCheck.currentStatus,
        },
      );
      return respond('ALREADY_SUBSCRIBED', CampaignPageType.THANKYOU, {
        status: 'ALREADY_SUBSCRIBED',
        subscriptionStatus: subCheck.status,
        allowSuccessRedirect: Boolean(subCheck.isActive),
        matchBody: checkBody,
      });
    }

    const success = await partnerApiService.subscribe(apiConfig, {
      ...partnerCtx,
      planId: selectedPack,
      subscriptionUrl,
    });

    if (success) {
      const subBody = {
        currentStatus: 'active',
        status: 'success',
        subscribeResult: 'SUCCESS',
      };
      const subRule = matchRules(subBody, rules);
      if (subRule) {
        return respondRule(subRule, subBody, 'SUCCESS');
      }
      await analyticsService.updateVisit(
        input.visitId,
        VisitStatus.SUCCESS,
        CampaignPageType.THANKYOU,
        resolvedPhone,
      );
      await analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_SUCCESS,
        {
          pack: selectedPack,
          info: 'SUBSCRIBE_ROUTE partner subscribe OK (no rule)',
        },
      );
      return respond('SUCCESS', CampaignPageType.THANKYOU, {
        status: 'SUCCESS',
        matchBody: subBody,
      });
    }

    const failBody = {
      currentStatus: 'error',
      status: 'fail',
      subscribeResult: 'FAIL',
    };
    const failRule = matchRules(failBody, rules);
    if (failRule) {
      return respondRule(failRule, failBody, 'FAILED');
    }

    await analyticsService.updateVisit(
      input.visitId,
      VisitStatus.FAILED,
      CampaignPageType.ERROR,
      resolvedPhone,
    );
    await analyticsService.logEvent(
      input.visitId,
      VisitEventType.SUBSCRIBE_FAILED,
      {
        pack: selectedPack,
        info: 'SUBSCRIBE_ROUTE partner subscribe failed',
      },
    );
    return respond('FAIL', CampaignPageType.ERROR, {
      status: 'FAILED',
      matchBody: failBody,
    });
  };
}
