/**
 * Public subscription funnel orchestrator.
 *
 * WHY this file exists: wires detect / page / transition without owning business rules.
 * Rules live in ./helpers/ — see docs/FLOW-ARCHITECTURE.md §0.1:
 *   helpers/detect.js          → Layer A (HE + checksub + redirect decision)
 *   flow-engine.service.js     → Layer B graph lookup for SUBSCRIBE/CONFIRM
 *   helpers/transition-*.js    → HOME/OTP/CONFIRM actions that call the engine
 * Canvas button jumps / Priority Chain (Layer C) run in the frontend and often
 * bypass this service entirely.
 */
import { getRepository } from '../../database/index.js';
import { ApiConfig } from '../../database/entities/api-config.entity.js';
import { ApiCallLog } from '../../database/entities/api-call-log.entity.js';
import getConfig from '../../config/configuration.js';
import {
  API_HE_PROVIDERS,
  isApiHeProvider,
  normalizePack,
  formatPlanLabel,
  buildSubscriptionUrl,
  buildCgRedirectUrl,
} from './helpers/pack-url.js';
import { createFlowCampaignFns } from './helpers/campaign.js';
import { createFlowPageResponse } from './helpers/page-response.js';
import { createFlowRouting } from './helpers/routing.js';
import { createFlowVisit } from './helpers/visit.js';
import { createGetPage } from './helpers/get-page.js';
import { createFlowTransition } from './helpers/transition.js';
import { createDetectMsisdn } from './helpers/detect.js';

export const createFlowService = () => {
  const getApiConfigRepo = () => getRepository(ApiConfig);
  const getApiCallLogRepo = () => getRepository(ApiCallLog);
  const isFlowCacheEnabled = () => getConfig().flowCacheEnabled !== false;
  const getFlowCacheTtl = () => getConfig().flowCacheTtlSeconds || 600;

  let deps = {
    getApiConfigRepo,
    getApiCallLogRepo,
    isFlowCacheEnabled,
    getFlowCacheTtl,
    API_HE_PROVIDERS,
    isApiHeProvider,
    normalizePack,
    formatPlanLabel,
    buildSubscriptionUrl,
    buildCgRedirectUrl,
  };

  const campaignFns = createFlowCampaignFns(deps);
  deps = { ...deps, ...campaignFns };

  const pageResponseFns = createFlowPageResponse(deps);
  deps = { ...deps, ...pageResponseFns };

  const routingFns = createFlowRouting(deps);
  deps = { ...deps, ...routingFns };

  const visitFns = createFlowVisit(deps);
  deps = { ...deps, ...visitFns };

  const { getPage } = createGetPage(deps);
  const { transition } = createFlowTransition(deps);
  const { detectMsisdn } = createDetectMsisdn(deps);

  return {
    resolveCampaign: campaignFns.resolveCampaign,
    resolveHomeSubscribeNext: routingFns.resolveHomeSubscribeNext,
    maybeSkipToThankYouIfSubscribed: routingFns.maybeSkipToThankYouIfSubscribed,
    hasVerifiedOtp: routingFns.hasVerifiedOtp,
    getPage,
    transition,
    getFlowEntry: campaignFns.getFlowEntry,
    detectMsisdn,
    assertTrackingAssignmentAvailable:
      campaignFns.assertTrackingAssignmentAvailable,
    getActions: pageResponseFns.getActions,
    normalizePack,
    formatPlanLabel,
    buildSubscriptionUrl,
    buildPageResponse: pageResponseFns.buildPageResponse,
  };
};

export const flowService = createFlowService();
