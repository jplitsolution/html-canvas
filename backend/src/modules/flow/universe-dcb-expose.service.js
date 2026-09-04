import { getRepository } from '../../database/index.js';
import { ApiConfig } from '../../database/entities/api-config.entity.js';
import { Campaign } from '../../database/entities/campaign.entity.js';
import { CampaignTracking } from '../../database/entities/campaign-tracking.entity.js';
import { Vendor } from '../../database/entities/vendor.entity.js';
import { Visit, VisitStatus } from '../../database/entities/visit.entity.js';
import { VisitEvent, VisitEventType } from '../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../database/entities/api-call-log.entity.js';
import { CampaignPageType } from '../../database/entities/campaign-page.entity.js';
import { flowEngineService } from './flow-engine.service.js';
import { universeDcbProvider } from './universe-dcb.provider.js';
import { apiCallLogService } from './api-call-log.service.js';
import { redisService } from '../../common/services/redis.service.js';
import { searchService } from '../search/search.service.js';
import {
  DCB_OUTCOMES,
  getNestedValue,
  normalizeUniverseDcbResponse,
} from './helpers/universe-dcb-normalizer.js';
import { buildUniverseDcbLogRecord } from './helpers/universe-dcb-log.js';
import { pickDcbExposeRequestId } from './helpers/dcb-expose-fields.js';
import { buildDcbExposeHtmlScreen } from './helpers/dcb-expose-screen.js';
import {
  DCB_EXPOSE_INBOUND_CALL_TYPES,
  DCB_EXPOSE_INBOUND_EVENT_TYPES,
  serializeDcbExposeInboundBody,
} from './helpers/dcb-expose-inbound.js';
import {
  mergePurchaseTypeMappings,
  resolvePurchaseTypeId,
  toVendorPurchaseTypes,
} from './helpers/universe-dcb-purchase-types.js';
import {
  HELD_OTP_MESSAGE,
  parsePayoutPercent,
  payoutSeqKey,
  shouldPayoutOtp,
} from '../otp/helpers/payout.js';

const localCorrelations = new Map();
const localConfirmLocks = new Set();

const httpError = (message, statusCode, code) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

const cleanPhone = (value) => String(value || '').replace(/\D/g, '');

const parseConfig = (raw) => {
  if (!raw) {
    throw httpError(
      'Universe DCB is not configured. Set it in Campaign API → Universe DCB.',
      503,
      'DCB_NOT_CONFIGURED',
    );
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    if (parsed.enabled === false) {
      throw httpError('Universe DCB is disabled', 503, 'DCB_NOT_CONFIGURED');
    }
    return parsed;
  } catch (err) {
    if (err.code === 'DCB_NOT_CONFIGURED') throw err;
    throw httpError(
      'Universe DCB configuration is invalid',
      503,
      'DCB_CONFIG_INVALID',
    );
  }
};

export const createUniverseDcbExposeService = (
  provider = universeDcbProvider,
  callLogger = apiCallLogService,
) => {
  const getCampaignRepo = () => getRepository(Campaign);
  const getTrackingRepo = () => getRepository(CampaignTracking);
  const getVendorRepo = () => getRepository(Vendor);
  const getVisitRepo = () => getRepository(Visit);
  const getVisitEventRepo = () => getRepository(VisitEvent);
  const getApiConfigRepo = () => getRepository(ApiConfig);

  const assertDcbApiExpose = (campaign) => {
    if (!campaign) throw httpError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
    const mode = flowEngineService.normalizeMode(campaign.verificationMode);
    const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
    if (mode !== 'UNIVERSE_DCB' || !flowEngineService.isApiExposeFlow(flowConfig)) {
      throw httpError(
        'This campaign does not expose DCB billing APIs. Set Universe Telecom DCB → API expose in Subscription flow.',
        400,
        'DCB_EXPOSE_REQUIRED',
      );
    }
    if (!campaign.active) {
      throw httpError('This offer is not available', 403, 'CAMPAIGN_INACTIVE');
    }
  };

  const resolveAssignedVendor = async (campaign, vendorRaw) => {
    const ref = String(vendorRaw || '').trim();
    if (!ref) {
      throw httpError(
        `vendorId is required. Use POST /api/flow/dcb/${campaign.id}/{vendorId}/pincode and /confirm`,
        400,
        'VENDOR_REQUIRED',
      );
    }
    let vendor = null;
    if (/^\d+$/.test(ref)) {
      vendor = await getVendorRepo().findOne({ where: { id: Number(ref) } });
    }
    if (!vendor) {
      vendor = await getVendorRepo().findOne({
        where: { code: ref, userId: campaign.userId },
      });
    }
    if (!vendor) throw httpError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    if (vendor.active === false) {
      throw httpError('Vendor is deactivated', 400, 'VENDOR_INACTIVE');
    }
    const tracking = await getTrackingRepo().findOne({
      where: { campaignId: campaign.id, vendorId: vendor.id },
    });
    if (!tracking || tracking.active === false) {
      throw httpError(
        'This vendor is not assigned to the campaign',
        400,
        'VENDOR_NOT_ASSIGNED',
      );
    }
    return { vendor, tracking };
  };

  const logVisitEvent = async (visitId, eventType, metadata) => {
    if (!visitId) return;
    try {
      await getVisitEventRepo().insert(
        getVisitEventRepo().create({
          visitId: Number(visitId),
          eventType,
          metadata,
        }),
      );
      void searchService.indexEvent({
        visitId: Number(visitId),
        campaignId: metadata?.campaignId || null,
        vendorId: metadata?.vendorId || null,
        phone: metadata?.msisdn || null,
        phoneMasked: metadata?.msisdn || null,
        eventType,
        status: metadata?.held
          ? 'HELD'
          : metadata?.success === false
            ? 'FAILED'
            : metadata?.success
              ? 'SUCCESS'
              : null,
        success: metadata?.success,
        errorMessage: metadata?.error || null,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`DCB expose event log failed: ${err.message}`);
    }
  };

  const patchExposeVisit = async (visit, { msisdn, vendorId, clientIp, landingUrl }) => {
    const vid = Number(vendorId) || null;
    const patch = {
      landingUrl: landingUrl || visit.landingUrl,
      updatedAt: new Date(),
    };
    if (msisdn) patch.phone = msisdn;
    if (clientIp) patch.ipAddress = String(clientIp).split(',')[0].trim();
    if (vid && !visit.vendorId) patch.vendorId = vid;
    await getVisitRepo().update({ id: visit.id }, patch);
    return { ...visit, ...patch, id: visit.id };
  };

  const ensureExposeVisit = async ({
    campaign,
    phone,
    vendorId,
    clientIp,
    landingUrl,
    existingVisit,
    reuseVisitId,
    allowMissingMsisdn = false,
  }) => {
    const msisdn = cleanPhone(phone);
    const vid = Number(vendorId) || null;

    if (existingVisit?.id) {
      return patchExposeVisit(existingVisit, {
        msisdn,
        vendorId: vid,
        clientIp,
        landingUrl,
      });
    }

    if (reuseVisitId) {
      const linked = await getVisitRepo().findOne({
        where: { id: Number(reuseVisitId) },
      });
      if (linked) {
        return patchExposeVisit(linked, {
          msisdn,
          vendorId: vid,
          clientIp,
          landingUrl,
        });
      }
    }

    if (!msisdn && !allowMissingMsisdn) {
      throw httpError('MSISDN is required', 400, 'MSISDN_REQUIRED');
    }

    // Always insert a new visit for each pincode attempt. Do not reuse MSISDN
    // sessions or mint click_id — vendors report success/fail themselves.
    const saved = await getVisitRepo().save(
      getVisitRepo().create({
        campaignId: campaign.id,
        vendorId: vid,
        phone: msisdn || null,
        country: campaign.country || null,
        operator: campaign.operator || null,
        ipAddress: clientIp ? String(clientIp).split(',')[0].trim() : null,
        landingUrl: landingUrl || null,
        clickId: null,
        pageType: CampaignPageType.OTP,
        visitStatus: VisitStatus.OTP_SHOWN,
      }),
    );
    await logVisitEvent(saved.id, VisitEventType.VISIT, {
      source: 'dcb_expose',
      campaignId: campaign.id,
      vendorId: vid,
      msisdn: msisdn || null,
    });
    return saved;
  };

  const serializeBody = (body) => {
    if (body == null) return null;
    try {
      return typeof body === 'string' ? body : JSON.stringify(body);
    } catch {
      return String(body);
    }
  };

  const logInboundExpose = async ({
    callType,
    visit,
    campaignId,
    vendorId,
    phone,
    requestUrl,
    requestBody,
    responseStatus,
    responseBody,
    success,
    errorMessage,
    statusLabel,
  }) => {
    try {
      await callLogger.record({
        visitId: visit?.id || null,
        campaignId: campaignId || visit?.campaignId || null,
        vendorId: vendorId || visit?.vendorId || null,
        msisdn: phone,
        rcid: visit?.rcid || null,
        clickId: null,
        callType,
        requestUrl,
        requestBody,
        responseStatus: responseStatus ?? null,
        responseBody: serializeBody(responseBody),
        success: Boolean(success),
        errorMessage: success ? null : errorMessage || null,
        statusLabel: statusLabel || (success ? 'SUCCESS' : 'FAILED'),
      });
    } catch (err) {
      console.warn(`DCB expose inbound log failed: ${err.message}`);
    }
  };

  const mintLogVisit = async ({ campaignId, vendorId, msisdn, clientIp, landingUrl }) => {
    const cId = parseInt(campaignId, 10);
    if (!cId) return null;
    try {
      const campaign =
        (await getCampaignRepo().findOne({ where: { id: cId } })) || { id: cId };
      return await ensureExposeVisit({
        campaign,
        phone: msisdn,
        vendorId,
        clientIp,
        landingUrl,
        allowMissingMsisdn: true,
      });
    } catch (err) {
      console.warn(`DCB expose visit mint failed: ${err.message}`);
      return null;
    }
  };

  const runExpose = async (action, input, clientIp, meta, work) => {
    const inboundUrl = meta.requestUrl || '';
    const inboundBody = serializeDcbExposeInboundBody(input);
    const callType = DCB_EXPOSE_INBOUND_CALL_TYPES[action];
    const eventType = DCB_EXPOSE_INBOUND_EVENT_TYPES[action];
    const campaignId = parseInt(input.campaignId, 10) || null;
    const vendorId = Number(input.vendorId) || null;
    const phone = cleanPhone(input.msisdn);
    const visit = await seedExposeVisit(action, input, clientIp, inboundUrl);

    const persistProviderLog = async (logRecord) => {
      if (!logRecord) return;
      try {
        await callLogger.record(logRecord);
      } catch (logError) {
        console.warn(`DCB expose log failed: ${logError.message}`);
      }
    };

    try {
      const result = await work(visit);
      // Inbound first (client → us), then outbound (us → DCB) for timeline order.
      await logInboundExpose({
        callType,
        visit: result.visit || visit,
        campaignId: result.campaignId || campaignId,
        vendorId: result.vendorId || vendorId,
        phone: result.msisdn || phone,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: 200,
        responseBody: result.payload,
        success: true,
      });
      await persistProviderLog(result.providerLog);
      return result.payload;
    } catch (err) {
      await logInboundExpose({
        callType,
        visit,
        campaignId,
        vendorId,
        phone,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: err.statusCode || 500,
        responseBody: { error: err.message, code: err.code || null },
        success: false,
        errorMessage: err.message,
      });
      await persistProviderLog(err.providerLog);
      if (visit?.id && eventType && !err.held) {
        await logVisitEvent(visit.id, eventType, {
          source: 'dcb_expose',
          campaignId,
          vendorId,
          msisdn: phone || null,
          success: false,
          error: err.message,
          code: err.code || null,
        });
      }
      throw err;
    }
  };

  const correlationKey = (campaignId, visitId, msisdn) =>
    `dcb:pending:${campaignId}:${Number(visitId)}:${msisdn}`;

  const requestCorrelationKey = (campaignId, vendorId, requestId) =>
    `dcb:req:${campaignId}:${vendorId}:${String(requestId)}`;

  const saveCorrelation = async (keys, value, ttlSeconds) => {
    if (!value?.providerRequestId) return;
    const ttl = Math.max(60, Number(ttlSeconds) || 600);
    const list = Array.isArray(keys) ? keys : [keys];
    const wrapped = { value, expiresAt: Date.now() + ttl * 1000 };
    for (const key of list) {
      localCorrelations.set(key, wrapped);
      await redisService.set(key, value, ttl);
    }
  };

  const loadCorrelation = async (key) => {
    const cached = await redisService.get(key);
    if (cached?.providerRequestId) return cached;
    const local = localCorrelations.get(key);
    if (!local) return null;
    if (local.expiresAt <= Date.now()) {
      localCorrelations.delete(key);
      return null;
    }
    return local.value.providerRequestId ? local.value : null;
  };

  const loadVisitFromRequestId = async (input) => {
    const requestId = pickDcbExposeRequestId(input);
    const cId = parseInt(input.campaignId, 10);
    if (!requestId || !cId) return null;
    try {
      const campaign = await getCampaignRepo().findOne({ where: { id: cId } });
      if (!campaign) return null;
      const { vendor } = await resolveAssignedVendor(campaign, input.vendorId);
      const correlation = await loadCorrelation(
        requestCorrelationKey(campaign.id, vendor.id, requestId),
      );
      if (!correlation?.visitId) return null;
      return getVisitRepo().findOne({ where: { id: Number(correlation.visitId) } });
    } catch {
      return null;
    }
  };

  const loadLatestVisitForMsisdn = async (input) => {
    const cId = parseInt(input.campaignId, 10);
    const phone = cleanPhone(input.msisdn);
    const vid = Number(input.vendorId) || null;
    if (!cId || !phone) return null;
    const where = { campaignId: cId, phone };
    if (vid) where.vendorId = vid;
    return getVisitRepo().findOne({
      where,
      order: { id: 'DESC' },
    });
  };

  const seedExposeVisit = async (action, input, clientIp, landingUrl) => {
    if (action === 'config') return null;
    if (action === 'confirm') {
      const linked = await loadVisitFromRequestId(input);
      if (linked) return linked;
    }
    if (action === 'status') {
      const latest = await loadLatestVisitForMsisdn(input);
      if (latest) return latest;
    }
    return mintLogVisit({
      campaignId: input.campaignId,
      vendorId: input.vendorId,
      msisdn: input.msisdn,
      clientIp,
      landingUrl,
    });
  };

  const clearCorrelation = async (keys) => {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      localCorrelations.delete(key);
      await redisService.del(key);
    }
  };

  const resolvePayoutHold = async (campaignId, vendorId, payoutPercentRaw) => {
    const payoutPercent = parsePayoutPercent(payoutPercentRaw);
    if (payoutPercent >= 100) {
      return { held: false, seq: null, payoutPercent };
    }
    const seq = await redisService.incr(payoutSeqKey(campaignId, vendorId));
    if (!seq) return { held: false, seq: null, payoutPercent };
    return {
      held: !shouldPayoutOtp(seq, payoutPercent),
      seq,
      payoutPercent,
    };
  };

  const callProvider = async ({ ctx, callType, action, execute, statusLabel }) => {
    try {
      const response = await execute();
      let resolvedStatus = statusLabel;
      if (typeof statusLabel === 'function') {
        try {
          resolvedStatus = statusLabel(response);
        } catch {
          resolvedStatus = 'PARSE_ERROR';
        }
      }
      return {
        response,
        providerLog: buildUniverseDcbLogRecord({
          ctx,
          callType,
          action,
          response,
          statusLabel: resolvedStatus,
        }),
      };
    } catch (err) {
      err.providerLog = buildUniverseDcbLogRecord({
        ctx,
        callType,
        action,
        error: err,
        statusLabel: 'FAILED',
      });
      throw err;
    }
  };

  const loadExposeContext = async ({
    campaignId,
    vendorId,
    msisdn,
    purchaseTypeId,
    pack,
    transactionChannel,
    serviceId,
    requestId,
    clientIp,
    requestUrl,
    existingVisit,
  }) => {
    const cId = parseInt(campaignId, 10);
    if (!cId) throw httpError('campaignId is required', 400, 'CAMPAIGN_REQUIRED');
    const campaign = await getCampaignRepo().findOne({ where: { id: cId } });
    assertDcbApiExpose(campaign);
    const { vendor, tracking } = await resolveAssignedVendor(campaign, vendorId);

    let correlation = null;
    const incomingRequestId = pickDcbExposeRequestId({ requestId });
    if (incomingRequestId) {
      correlation = await loadCorrelation(
        requestCorrelationKey(campaign.id, vendor.id, incomingRequestId),
      );
      if (!correlation) {
        throw httpError(
          'requestId is missing or expired. Call pincode first and send the returned requestId.',
          409,
          'DCB_CORRELATION_REQUIRED',
        );
      }
      if (String(correlation.providerRequestId) !== incomingRequestId) {
        throw httpError(
          'requestId does not match PIN request',
          409,
          'DCB_REQUEST_ID_MISMATCH',
        );
      }
    }

    const phone = cleanPhone(msisdn || correlation?.msisdn);
    if (msisdn && correlation?.msisdn && phone !== String(correlation.msisdn)) {
      throw httpError('msisdn does not match PIN request', 409, 'DCB_MSISDN_MISMATCH');
    }

    const apiConfig = await getApiConfigRepo().findOne({
      where: { campaignId: cId },
    });
    const config = parseConfig(apiConfig?.dcbConfigJson);
    const visit = await ensureExposeVisit({
      campaign,
      phone,
      vendorId: vendor.id,
      clientIp,
      landingUrl: requestUrl,
      existingVisit,
      reuseVisitId: correlation?.visitId,
      allowMissingMsisdn: true,
    });
    if (!phone) throw httpError('MSISDN is required', 400, 'MSISDN_REQUIRED');

    const rawChannel = String(
      transactionChannel || correlation?.transactionChannel || 'Wifi',
    ).trim();
    const channel =
      rawChannel.toUpperCase() === 'HE'
        ? 'HE'
        : rawChannel.toLowerCase() === 'wifi' || !rawChannel
          ? 'Wifi'
          : '';
    if (!channel) {
      throw httpError(
        'Transaction channel must be HE or Wifi',
        400,
        'TRANSACTION_CHANNEL_REQUIRED',
      );
    }

    return {
      campaign,
      vendor,
      tracking,
      config,
      correlation,
      msisdn: phone,
      visit,
      visitId: visit.id,
      serviceId: String(
        serviceId || correlation?.serviceId || config.serviceId || campaign.serviceId || '',
      ).trim(),
      purchaseTypeId: resolvePurchaseTypeId(config, {
        purchaseTypeId: purchaseTypeId || correlation?.purchaseTypeId || '',
        pack,
      }),
      transactionChannel: channel,
      source: 'dcb_expose',
    };
  };

  const providerInput = (ctx) => ({
    msisdn: ctx.msisdn,
    serviceId: ctx.serviceId,
    purchaseTypeId: ctx.purchaseTypeId,
    transactionChannel: ctx.transactionChannel,
  });

  const exposeConfig = async (input, clientIp, meta = {}) =>
    runExpose('config', input, clientIp, meta, async () => {
      const cId = parseInt(input.campaignId, 10);
      if (!cId) throw httpError('campaignId is required', 400, 'CAMPAIGN_REQUIRED');
      const campaign = await getCampaignRepo().findOne({ where: { id: cId } });
      assertDcbApiExpose(campaign);
      const { vendor } = await resolveAssignedVendor(campaign, input.vendorId);

      const apiConfig = await getApiConfigRepo().findOne({
        where: { campaignId: cId },
      });
      const config = parseConfig(apiConfig?.dcbConfigJson);
      const ctx = {
        campaign,
        vendor,
        config,
        visit: null,
        visitId: null,
        msisdn: null,
        serviceId: String(config.serviceId || campaign.serviceId || '').trim(),
        purchaseTypeId: '',
        transactionChannel: '',
        source: 'dcb_expose',
      };

      const { response, providerLog } = await callProvider({
        ctx,
        callType: ApiCallType.DCB_CONFIG,
        action: 'config',
        execute: () => provider.getPublicConfig(ctx.config, {}),
        statusLabel: 'SUCCESS',
      });
      const envelopePath = ctx.config.responsePaths?.envelope;
      const providerConfig = envelopePath
        ? getNestedValue(response.data, envelopePath)
        : response.data;
      if (!Array.isArray(providerConfig?.purchaseTypes)) {
        const err = httpError(
          'Universe DCB public configuration is malformed',
          502,
          'DCB_PUBLIC_CONFIG_INVALID',
        );
        err.providerLog = providerLog;
        throw err;
      }

      const purchaseTypes = toVendorPurchaseTypes(
        mergePurchaseTypeMappings(
          ctx.config.purchaseTypeMappings,
          providerConfig.purchaseTypes,
        ),
      );
      const payload = {
        campaignId: ctx.campaign.id,
        vendorId: vendor.id,
        purchaseTypes,
        pollIntervalMs: Math.max(250, Number(ctx.config.pollIntervalMs) || 2000),
        pollTimeoutMs: Math.max(1000, Number(ctx.config.pollTimeoutMs) || 60000),
      };
      return {
        visit: null,
        campaignId: ctx.campaign.id,
        vendorId: vendor.id,
        msisdn: null,
        payload,
        providerLog,
      };
    });

  const exposePincode = async (input, clientIp, meta = {}) =>
    runExpose('pincode', input, clientIp, meta, async (existingVisit) => {
      const ctx = await loadExposeContext({
        ...input,
        clientIp,
        requestUrl: meta.requestUrl,
        existingVisit,
      });
      if (!ctx.purchaseTypeId) {
        throw httpError(
          'purchaseTypeId or pack is required. GET /config for allowed packs.',
          400,
          'PURCHASE_TYPE_REQUIRED',
        );
      }

      const { response, providerLog } = await callProvider({
        ctx,
        callType: ApiCallType.DCB_PINCODE,
        action: 'pincode',
        execute: () => provider.requestPincode(ctx.config, providerInput(ctx)),
        statusLabel: 'PIN_REQUIRED',
      });
      if (!response.providerRequestId) {
        const err = httpError(
          'Universe DCB pincode response did not include a request ID',
          502,
          'DCB_PROVIDER_REQUEST_ID_MISSING',
        );
        err.providerLog = providerLog;
        throw err;
      }
      await saveCorrelation(
        [
          correlationKey(ctx.campaign.id, ctx.visitId, ctx.msisdn),
          requestCorrelationKey(
            ctx.campaign.id,
            ctx.vendor.id,
            response.providerRequestId,
          ),
        ],
        {
          providerRequestId: response.providerRequestId,
          purchaseTypeId: ctx.purchaseTypeId,
          campaignId: ctx.campaign.id,
          vendorId: ctx.vendor.id,
          visitId: ctx.visitId,
          msisdn: ctx.msisdn,
          serviceId: ctx.serviceId,
          transactionChannel: ctx.transactionChannel,
        },
        ctx.config.correlationTtlSeconds,
      );

      await logVisitEvent(ctx.visitId, VisitEventType.OTP_SEND, {
        source: 'dcb_expose',
        campaignId: ctx.campaign.id,
        vendorId: ctx.vendor.id,
        msisdn: ctx.msisdn,
        purchaseTypeId: ctx.purchaseTypeId,
        requestId: response.providerRequestId,
        success: true,
      });

      const payload = {
        sent: true,
        requestId: response.providerRequestId,
        campaignId: ctx.campaign.id,
        vendorId: ctx.vendor.id,
        visitId: ctx.visitId,
        msisdn: ctx.msisdn,
        serviceId: ctx.serviceId,
        purchaseTypeId: ctx.purchaseTypeId,
        outcome: DCB_OUTCOMES.PENDING,
        stage: 'PIN_REQUIRED',
        message: 'PIN requested successfully',
      };
      return {
        visit: ctx.visit,
        campaignId: ctx.campaign.id,
        vendorId: ctx.vendor.id,
        msisdn: ctx.msisdn,
        payload,
        providerLog,
      };
    });

  const exposeConfirm = async (input, clientIp, meta = {}) =>
    runExpose('confirm', input, clientIp, meta, async (existingVisit) => {
      const pin = String(input.pin || input.pincode || input.pinCode || '').trim();
      if (!pin) throw httpError('PIN is required', 400, 'PIN_REQUIRED');
      const requestId = pickDcbExposeRequestId(input);
      if (!requestId) {
        throw httpError(
          'requestId is required. Use the requestId returned from pincode.',
          400,
          'REQUEST_ID_REQUIRED',
        );
      }

      const ctx = await loadExposeContext({
        ...input,
        requestId,
        clientIp,
        requestUrl: meta.requestUrl,
        existingVisit,
      });
      const correlation = ctx.correlation;
      if (!correlation?.providerRequestId) {
        throw httpError(
          'requestId is missing or expired. Call pincode first and send the returned requestId.',
          409,
          'DCB_CORRELATION_REQUIRED',
        );
      }
      if (
        ctx.purchaseTypeId &&
        correlation.purchaseTypeId &&
        String(correlation.purchaseTypeId) !== ctx.purchaseTypeId
      ) {
        throw httpError(
          'PIN request does not match the selected purchase type',
          409,
          'DCB_CORRELATION_MISMATCH',
        );
      }

      const pendingKey = correlationKey(ctx.campaign.id, ctx.visitId, ctx.msisdn);
      const reqKey = requestCorrelationKey(
        ctx.campaign.id,
        ctx.vendor.id,
        correlation.providerRequestId,
      );
      const lockKey = `${reqKey}:confirm`;
      if (localConfirmLocks.has(lockKey)) {
        throw httpError(
          'PIN confirmation is already in progress',
          409,
          'DCB_CONFIRM_IN_PROGRESS',
        );
      }
      const lockAcquired = await redisService.setNx(lockKey, '1', 30);
      if (!lockAcquired) {
        throw httpError(
          'PIN confirmation is already in progress',
          409,
          'DCB_CONFIRM_IN_PROGRESS',
        );
      }
      localConfirmLocks.add(lockKey);

      try {
        const { providerLog } = await callProvider({
          ctx: {
            ...ctx,
            purchaseTypeId: String(correlation.purchaseTypeId || ctx.purchaseTypeId || ''),
          },
          callType: ApiCallType.DCB_CONFIRM,
          action: 'confirm',
          execute: () =>
            provider.confirm(ctx.config, {
              ...providerInput(ctx),
              purchaseTypeId: correlation.purchaseTypeId || ctx.purchaseTypeId,
              providerRequestId: correlation.providerRequestId,
              pin,
            }),
          statusLabel: 'POLLING',
        });
        await clearCorrelation([pendingKey, reqKey]);

        const trackingPayout =
          ctx.tracking?.payoutPercent != null && ctx.tracking.payoutPercent !== ''
            ? ctx.tracking.payoutPercent
            : 100;
        const decision = await resolvePayoutHold(
          ctx.campaign.id,
          ctx.vendor.id,
          trackingPayout,
        );

        await getVisitRepo().update(
          { id: ctx.visitId },
          { otpVerifiedAt: new Date(), visitStatus: VisitStatus.SUCCESS },
        );

        await logVisitEvent(ctx.visitId, VisitEventType.OTP_VERIFY, {
          source: 'dcb_expose',
          campaignId: ctx.campaign.id,
          vendorId: ctx.vendor.id,
          msisdn: ctx.msisdn,
          requestId: correlation.providerRequestId,
          success: true,
          held: decision.held,
          payoutPercent: decision.payoutPercent,
          seq: decision.seq,
          clientResponse: decision.held ? 'invalid_otp' : undefined,
        });

        if (decision.held) {
          const err = new Error(HELD_OTP_MESSAGE);
          err.statusCode = 400;
          err.code = 'DCB_HELD';
          err.held = true;
          err.providerLog = providerLog;
          throw err;
        }

        const payload = {
          verified: true,
          requestId: correlation.providerRequestId,
          campaignId: ctx.campaign.id,
          vendorId: ctx.vendor.id,
          visitId: ctx.visitId,
          msisdn: ctx.msisdn,
          serviceId: ctx.serviceId,
          outcome: DCB_OUTCOMES.PENDING,
          stage: 'POLLING',
          message:
            'PIN confirmed. Poll status until the subscription is entitled.',
        };
        return {
          visit: ctx.visit,
          campaignId: ctx.campaign.id,
          vendorId: ctx.vendor.id,
          msisdn: ctx.msisdn,
          payload,
          providerLog,
        };
      } finally {
        await redisService.del(lockKey);
        localConfirmLocks.delete(lockKey);
      }
    });

  const exposeStatus = async (input, clientIp, meta = {}) =>
    runExpose('status', input, clientIp, meta, async (existingVisit) => {
      const ctx = await loadExposeContext({
        ...input,
        clientIp,
        requestUrl: meta.requestUrl,
        transactionChannel: input.transactionChannel || 'Wifi',
        existingVisit,
      });
      const { response, providerLog } = await callProvider({
        ctx,
        callType: ApiCallType.DCB_SUBSCRIPTIONS,
        action: 'status',
        execute: () => provider.getSubscriptions(ctx.config, providerInput(ctx)),
        statusLabel: (providerResponse) =>
          normalizeUniverseDcbResponse(providerResponse.data, ctx.config, {
            serviceId: ctx.serviceId,
          }).outcome,
      });
      const result = normalizeUniverseDcbResponse(response.data, ctx.config, {
        serviceId: ctx.serviceId,
      });
      const payload = {
        campaignId: ctx.campaign.id,
        vendorId: ctx.vendor.id,
        visitId: ctx.visitId,
        msisdn: ctx.msisdn,
        serviceId: ctx.serviceId,
        ...result,
      };
      return {
        visit: ctx.visit,
        campaignId: ctx.campaign.id,
        vendorId: ctx.vendor.id,
        msisdn: ctx.msisdn,
        payload,
        providerLog,
      };
    });

  const exposeScreen = async ({ campaignId, vendorId, origin, absolute = false }) => {
    const cId = parseInt(campaignId, 10);
    if (!cId) throw httpError('campaignId is required', 400, 'CAMPAIGN_REQUIRED');
    const campaign = await getCampaignRepo().findOne({ where: { id: cId } });
    if (!campaign) throw httpError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
    const mode = flowEngineService.normalizeMode(campaign.verificationMode);
    const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
    if (mode !== 'UNIVERSE_DCB' || !flowEngineService.isApiExposeFlow(flowConfig)) {
      throw httpError(
        'This campaign does not expose DCB billing APIs. Set Universe Telecom DCB → API expose in Subscription flow.',
        400,
        'DCB_EXPOSE_REQUIRED',
      );
    }
    const { vendor } = await resolveAssignedVendor(campaign, vendorId);
    return buildDcbExposeHtmlScreen({
      origin,
      campaignId: campaign.id,
      vendorId: vendor.id,
      absolute: Boolean(absolute),
    });
  };

  return {
    exposeConfig,
    exposePincode,
    exposeConfirm,
    exposeStatus,
    exposeScreen,
  };
};

export const universeDcbExposeService = createUniverseDcbExposeService();
