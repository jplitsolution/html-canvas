import { getRepository } from '../../database/index.js';
import { Vendor } from '../../database/entities/vendor.entity.js';
import { ConversionPostback } from '../../database/entities/conversion-postback.entity.js';
import { Visit } from '../../database/entities/visit.entity.js';
import { VisitEvent } from '../../database/entities/visit-event.entity.js';
import { ApiCallLog } from '../../database/entities/api-call-log.entity.js';
import { Campaign } from '../../database/entities/campaign.entity.js';
import { CampaignTracking } from '../../database/entities/campaign-tracking.entity.js';
import {
  createPostbackRegister,
  fillTemplate,
} from './helpers/postback-register.js';
import { createPostbackForward } from './helpers/postback-forward.js';
import { createPostbackCallback } from './helpers/postback-callback.js';
import { createPostbackQuery } from './helpers/postback-query.js';

/**
 * Vendor CPA postbacks (SAFWAP callback_manage parity).
 * Facade — logic in postback-register / forward / callback / query.
 */
export const createPostbackService = () => {
  const getPostbackRepo = () => getRepository(ConversionPostback);
  const getVendorRepo = () => getRepository(Vendor);
  const getVisitRepo = () => getRepository(Visit);
  const getCampaignRepo = () => getRepository(Campaign);
  const getTrackingRepo = () => getRepository(CampaignTracking);
  const getVisitEventRepo = () => getRepository(VisitEvent);
  const getApiCallLogRepo = () => getRepository(ApiCallLog);

  const repoDeps = { getPostbackRepo, getVendorRepo, getVisitRepo, getCampaignRepo, getTrackingRepo };
  const registerDeps = { ...repoDeps, firePostback: null };

  const {
    resolvePostbackTemplate,
    indexPostbackEvent,
    logApiCall,
    registerPending,
  } = createPostbackRegister(registerDeps);

  const { firePostback } = createPostbackForward({
    ...repoDeps,
    indexPostbackEvent,
    logApiCall,
  });
  registerDeps.firePostback = firePostback;

  const { processOperatorCallback } = createPostbackCallback({
    ...repoDeps,
    logApiCall,
    registerPending,
    firePostback,
  });

  const { getSummary, listPostbacks, getPostbackById, getDayReport } =
    createPostbackQuery({
      getPostbackRepo,
      getVendorRepo,
      getVisitRepo,
      getCampaignRepo,
      getVisitEventRepo,
      getApiCallLogRepo,
    });

  return {
    fillTemplate,
    resolvePostbackTemplate,
    registerPending,
    firePostback,
    processOperatorCallback,
    getSummary,
    listPostbacks,
    getPostbackById,
    getDayReport,
  };
};

export const postbackService = createPostbackService();
