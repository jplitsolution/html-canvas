import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { flowService } from './flow.service.js';
import { postbackService } from '../partners/postback.service.js';
import { CampaignPageType } from '../../database/entities/campaign-page.entity.js';
import {
  resolveRequestMsisdn,
  resolveAttributionParams,
  resolveCampidParams,
} from './helpers/request.util.js';
import { priorityCheck } from './helpers/priority.controller.js';
import { universeDcbService } from './universe-dcb.service.js';
import { flowEngineService } from './flow-engine.service.js';
import {
  decorateUniverseDcbDetectResponse,
  decorateUniverseDcbPageResponse,
} from './helpers/universe-dcb-runtime.js';

const dcbInput = (req, dcbSource) => {
  const values = { ...(req.query || {}), ...(req.body || {}) };
  const camp = resolveCampidParams(values);
  return {
    country: values.country,
    operator: values.operator,
    campid: camp.campid,
    trackingCampid: camp.trackingCampid,
    msisdn: values.msisdn || values.phone,
    serviceId: values.serviceId || values.service_id,
    purchaseTypeId: values.purchaseTypeId || values.purchase_type_id,
    transactionChannel: values.transactionChannel || values.transaction_channel,
    visitId: values.visitId || values.visit_id,
    pin: values.pin || values.pincode,
    dcbSource,
  };
};

export const flowController = {
  detectMsisdn: asyncHandler(async (req, res) => {
    const q = req.query || {};
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const allHeaders = { ...(req.headers || {}) };
    // POST body can carry browser HE MSISDN without putting JWT logs in the query string.
    const mergedQ = {
      ...q,
      msisdn: body.msisdn || body.phone || q.msisdn || q.phone,
      phone: body.phone || body.msisdn || q.phone || q.msisdn,
      visitId: body.visitId || q.visitId,
      sessionId:
        body.sessionId || body.session_id || q.sessionId || q.session_id,
      heSource: body.heSource || q.heSource || q.he_source,
      heClientError: body.heClientError || q.heClientError,
    };
    const resolved = resolveRequestMsisdn(req.headers, mergedQ);
    const camp = resolveCampidParams({ ...q, ...body });
    const ipAddress =
      req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const heSource = String(mergedQ.heSource || '')
      .toLowerCase()
      .trim();

    // Browser Safaricom HE: hint from client body only (HE_DUMMY applied in he.service
    // if masked MSISDN fails and HE_DUMMY_MSISDN is set).
    const browserPhone = String(body.msisdn || body.phone || '').replace(
      /\D/g,
      '',
    );
    const phoneForDetect =
      heSource === 'browser' ? browserPhone : resolved.phone;

    // HE debug headers are returned in the JSON body; frontend logs them in the browser.

    const detectInput = {
      country: q.country || body.country,
      operator: q.operator || body.operator,
      campid: camp.campid,
      trackingCampid: camp.trackingCampid,
      phone: phoneForDetect,
      clickId:
        q.click_id || q.clickId || q.clickid || body.clickId || body.click_id,
      rcid: q.rcid || body.rcid,
      visitId: mergedQ.visitId ? Number(mergedQ.visitId) : undefined,
      sessionId: mergedQ.sessionId || req.headers['x-session-id'],
      heSource: heSource || undefined,
      heClientLogs: body.heClientLogs || null,
      heClientError: mergedQ.heClientError || null,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
      landingUrl: q.landingUrl || q.landing_url || body.landingUrl,
      vid: q.vid || body.vid,
    };
    let result = await flowService.detectMsisdn(detectInput);

    const campaign = await flowService.resolveCampaign(detectInput);
    if (
      flowEngineService.normalizeMode(campaign?.verificationMode) ===
      'UNIVERSE_DCB'
    ) {
      let runtime = {};
      try {
        runtime = await universeDcbService.getRuntimeConfig(detectInput);
      } catch {
        runtime = {};
      }
      let normalizedStatus = null;
      if (result.phone) {
        try {
          normalizedStatus = await universeDcbService.status({
            ...detectInput,
            msisdn: result.phone,
            visitId: result.visitId,
            dcbSource: 'detect',
          });
        } catch {
          normalizedStatus = {
            outcome: 'PARSE_ERROR',
            status: null,
            reason: 'DCB_STATUS_UNAVAILABLE',
          };
        }
      }
      result = decorateUniverseDcbDetectResponse(
        result,
        normalizedStatus,
        runtime,
      );
    }

    res.json({
      ...result,
      debugHeaders: allHeaders,
      debugHeaderPhone: resolved.headerPhone || null,
      debugMsisdnSource:
        heSource === 'browser' ? 'browser_he' : resolved.source,
    });
  }),

  entry: asyncHandler(async (req, res) => {
    const q = req.query || {};
    const camp = resolveCampidParams(q);
    const data = await flowService.getFlowEntry({
      country: q.country,
      operator: q.operator,
      campid: camp.campid,
      trackingCampid: camp.trackingCampid,
    });
    res.json(data);
  }),

  page: asyncHandler(async (req, res) => {
    const q = req.query || {};
    const allHeaders = { ...(req.headers || {}) };
    const resolved = resolveRequestMsisdn(req.headers, q);
    const attr = resolveAttributionParams(q);
    const camp = resolveCampidParams(q);
    const ipAddress =
      req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // HE debug headers are returned in the JSON body; frontend logs them in the browser.

    const direct =
      q.direct === '1' ||
      q.direct === 'true' ||
      q.direct === true ||
      q.direct === 1;

    const pageInput = {
      country: q.country,
      operator: q.operator,
      campid: camp.campid,
      trackingCampid: camp.trackingCampid,
      pageType: String(q.page || CampaignPageType.HOME).toUpperCase(),
      phone: resolved.phone,
      visitId: q.visitId ? Number(q.visitId) : undefined,
      pack: q.pack,
      vid: q.vid,
      affId: q.affId || q.aff_id,
      clickId: attr.clickId,
      rcid: attr.rcid,
      landingUrl: q.landingUrl || req.originalUrl || req.url,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
      direct: Boolean(direct),
    };
    let result = await flowService.getPage(pageInput);

    const campaign = await flowService.resolveCampaign(pageInput);
    if (
      flowEngineService.normalizeMode(campaign?.verificationMode) ===
      'UNIVERSE_DCB'
    ) {
      let runtime = {};
      try {
        runtime = await universeDcbService.getRuntimeConfig(pageInput);
      } catch {
        runtime = {};
      }
      result = decorateUniverseDcbPageResponse(
        result,
        resolved.phone || result.variables?.phone,
        runtime,
      );
    }

    res.json({
      ...result,
      debugHeaders: allHeaders,
      debugHeaderPhone: resolved.headerPhone || null,
      debugMsisdnSource: resolved.source,
    });
  }),

  transition: asyncHandler(async (req, res) => {
    const body = req.body || {};
    const hasVisit = Boolean(body.visitId);
    const rcid = String(
      body.rcid || (!hasVisit ? body.click_id || body.clickId || '' : '') || '',
    ).trim();
    const clickId = String(body.clickId || body.click_id || '').trim();

    const data = await flowService.transition({
      visitId: body.visitId,
      fromPage: body.fromPage,
      action: body.action,
      phone: body.phone,
      planId: body.planId,
      subscribeUrl: body.subscribeUrl,
      serviceId: body.serviceId,
      subServiceId: body.subServiceId,
      queuePostback:
        body.queuePostback === undefined ? undefined : body.queuePostback,
      country: body.country,
      operator: body.operator,
      campid: body.campid,
      trackingCampid: body.trackingCampid || body.tracking_campid,
      clickId: clickId || undefined,
      rcid: rcid || undefined,
      vid: body.vid,
      affId: body.affId || body.aff_id,
      subscribeRoutes: body.subscribeRoutes || undefined,
    });
    res.json(data);
  }),

  priorityCheck,

  dcbConfig: asyncHandler(async (req, res) => {
    res.json(await universeDcbService.getPublicConfig(dcbInput(req, 'config')));
  }),

  dcbManualCheck: asyncHandler(async (req, res) => {
    res.json(
      await universeDcbService.manualCheck(dcbInput(req, 'manual-check')),
    );
  }),

  dcbPincode: asyncHandler(async (req, res) => {
    res.json(
      await universeDcbService.requestPincode(dcbInput(req, 'pincode')),
    );
  }),

  dcbConfirm: asyncHandler(async (req, res) => {
    res.json(await universeDcbService.confirm(dcbInput(req, 'confirm')));
  }),

  dcbStatus: asyncHandler(async (req, res) => {
    res.json(await universeDcbService.status(dcbInput(req, 'poll')));
  }),

  callback: asyncHandler(async (req, res) => {
    const q = { ...(req.query || {}), ...(req.body || {}) };
    const data = await postbackService.processOperatorCallback(q);
    res.json(data);
  }),

  registerPostback: asyncHandler(async (req, res) => {
    const body = req.body || {};
    const data = await postbackService.registerPending({
      visitId: body.visitId,
      msisdn: body.msisdn || body.phone,
      campaignId: body.campaignId,
      campid: body.campid || body.camp,
      trackingCampid: body.trackingCampid || body.tracking_campid,
      clickId: body.clickId || body.click_id,
      rcid: body.rcid,
      vendorId: body.vendorId,
      affiliateId: body.affiliateId,
      offerCode: body.offerCode || body.offer,
    });
    res.json(data);
  }),
};
