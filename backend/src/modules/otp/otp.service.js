import { getRepository } from '../../database/index.js';
import { mintClickId } from '../flow/helpers/click-id.js';
import { ApiConfig } from '../../database/entities/api-config.entity.js';
import { Campaign } from '../../database/entities/campaign.entity.js';
import { CampaignTracking } from '../../database/entities/campaign-tracking.entity.js';
import { Vendor } from '../../database/entities/vendor.entity.js';
import { Visit, VisitStatus } from '../../database/entities/visit.entity.js';
import { VisitEvent, VisitEventType } from '../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../database/entities/api-call-log.entity.js';
import { CampaignPageType } from '../../database/entities/campaign-page.entity.js';
import { smsProviderManager } from './providers/sms-provider.manager.js';
import { redisService } from '../../common/services/redis.service.js';
import { apiCallLogService } from '../flow/api-call-log.service.js';
import { orangeBfService } from '../flow/orange-bf.service.js';
import { flowEngineService } from '../flow/flow-engine.service.js';
import { searchService } from '../search/search.service.js';
import {
  HELD_OTP_MESSAGE,
  parsePayoutPercent,
  payoutSeqKey,
  shouldPayoutOtp,
} from './helpers/payout.js';

/**
 * Partner-API OTP only.
 * We do NOT generate/store OTP codes (no Twilio, no otp_requests table).
 * Partner send/verify APIs own the OTP; we only mark the visit as verified.
 */
export const createOtpService = () => {
  const getApiConfigRepo = () => getRepository(ApiConfig);
  const getCampaignRepo = () => getRepository(Campaign);
  const getTrackingRepo = () => getRepository(CampaignTracking);
  const getVendorRepo = () => getRepository(Vendor);
  const getVisitRepo = () => getRepository(Visit);
  const getVisitEventRepo = () => getRepository(VisitEvent);

  const pendingKey = (visitId, phone) =>
    `otp:pending:${visitId || 'none'}:${String(phone).trim()}`;

  const exposePendingKey = (campaignId, vendorId, phone) =>
    `otp:pending:expose:${campaignId}:${vendorId || 'none'}:${String(phone).trim()}`;

  const serializeInboundBody = (body) => {
    if (body == null) return null;
    try {
      return typeof body === 'string' ? body : JSON.stringify(body);
    } catch {
      return String(body);
    }
  };

  const assertApiExposeCampaign = (campaign) => {
    if (!campaign) {
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      throw err;
    }
    const mode =
      flowEngineService.normalizeMode(campaign.verificationMode) || 'BOTH';
    const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
    if (mode !== 'OTP_ONLY' || !flowEngineService.isApiExposeFlow(flowConfig)) {
      const err = new Error(
        'This campaign does not expose OTP APIs. Set OTP only → API expose in Subscription flow.',
      );
      err.statusCode = 400;
      throw err;
    }
  };

  const logInboundExpose = async ({
    callType,
    visit,
    campaignId,
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
      await apiCallLogService.record({
        visitId: visit?.id || null,
        campaignId: campaignId || visit?.campaignId || null,
        msisdn: phone,
        rcid: visit?.rcid || null,
        clickId: visit?.clickId || null,
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
      console.warn(`OTP expose inbound log failed: ${err.message}`);
    }
  };

  const missingVendorError = (campaignId) => {
    const err = new Error(
      `vendorId is required. Use GET/POST /api/otp/${campaignId}/{vendorId}/send and /verify`,
    );
    err.statusCode = 400;
    return err;
  };

  const resolveAssignedVendor = async (campaign, vendorRaw) => {
    const ref = String(vendorRaw || '').trim();
    if (!ref) throw missingVendorError(campaign.id);

    let vendor = null;
    if (/^\d+$/.test(ref)) {
      vendor = await getVendorRepo().findOne({ where: { id: Number(ref) } });
    }
    if (!vendor) {
      vendor = await getVendorRepo().findOne({
        where: { code: ref, userId: campaign.userId },
      });
    }
    if (!vendor) {
      const err = new Error('Vendor not found');
      err.statusCode = 404;
      throw err;
    }
    if (vendor.active === false) {
      const err = new Error('Vendor is deactivated');
      err.statusCode = 400;
      throw err;
    }

    const tracking = await getTrackingRepo().findOne({
      where: { campaignId: campaign.id, vendorId: vendor.id },
    });
    if (!tracking || tracking.active === false) {
      const err = new Error('This vendor is not assigned to the campaign');
      err.statusCode = 400;
      throw err;
    }

    return { vendor, tracking };
  };

  const resolveExposePayoutHold = async (
    campaignId,
    vendorId,
    payoutPercentRaw,
  ) => {
    const payoutPercent = parsePayoutPercent(payoutPercentRaw);
    if (payoutPercent >= 100) {
      return { held: false, seq: null, payoutPercent };
    }
    const seq = await redisService.incr(payoutSeqKey(campaignId, vendorId));
    if (!seq) {
      return { held: false, seq: null, payoutPercent };
    }
    return {
      held: !shouldPayoutOtp(seq, payoutPercent),
      seq,
      payoutPercent,
    };
  };

  /** Digits-only MSISDN so 88889 / "88889 " always match the same session. */
  const normalizeMsisdn = (phone) => String(phone || '').replace(/\D/g, '');

  /**
   * One session per campaign + vendor + MSISDN for API-expose.
   */
  const ensureExposeVisit = async ({
    campaign,
    phone,
    clientIp,
    landingUrl,
    visitStatus,
    vendorId,
  }) => {
    const cId = campaign.id;
    const msisdn = normalizeMsisdn(phone);
    if (!msisdn) {
      const err = new Error('Phone number is required');
      err.statusCode = 400;
      throw err;
    }

    const vid = Number(vendorId) || null;
    const where = { campaignId: cId, phone: msisdn };
    if (vid) where.vendorId = vid;

    const existing = await getVisitRepo().findOne({
      where,
      order: { id: 'DESC' },
    });

    if (existing) {
      const patch = {
        phone: msisdn,
        landingUrl: landingUrl || existing.landingUrl,
        updatedAt: new Date(),
      };
      if (clientIp) {
        patch.ipAddress = String(clientIp).split(',')[0].trim();
      }
      if (visitStatus) {
        patch.visitStatus = visitStatus;
      }
      if (vid && !existing.vendorId) {
        patch.vendorId = vid;
      }
      await getVisitRepo().update({ id: existing.id }, patch);
      return { ...existing, ...patch, id: existing.id };
    }

    const clickId = mintClickId();
    const visit = getVisitRepo().create({
      campaignId: cId,
      vendorId: vid,
      phone: msisdn,
      country: campaign.country || null,
      operator: campaign.operator || null,
      ipAddress: clientIp ? String(clientIp).split(',')[0].trim() : null,
      landingUrl: landingUrl || null,
      clickId,
      pageType: CampaignPageType.OTP,
      visitStatus: visitStatus || VisitStatus.OTP_SHOWN,
    });
    const saved = await getVisitRepo().save(visit);

    await logOtpEvent(saved.id, VisitEventType.VISIT, {
      source: 'otp_expose',
      campaignId: cId,
      vendorId: vid,
      msisdn,
      landingUrl: landingUrl || null,
    });

    try {
      void searchService.indexEvent({
        campaignId: cId,
        visitId: saved.id,
        vendorId: vid,
        clickId,
        phone: msisdn,
        phoneMasked: msisdn,
        eventType: VisitEventType.VISIT,
        status: visitStatus || VisitStatus.OTP_SHOWN,
        pageType: CampaignPageType.OTP,
        ip: saved.ipAddress,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // swallow
    }

    return saved;
  };

  const getCampaignFromInput = async (campaignId, visitId) => {
    let cId = campaignId ? parseInt(campaignId, 10) : undefined;
    if (!cId && visitId) {
      const visit = await getVisitRepo().findOne({
        where: { id: parseInt(visitId, 10) },
      });
      if (visit) cId = visit.campaignId;
    }
    if (!cId) return null;
    return getCampaignRepo().findOne({ where: { id: cId } });
  };

  const getApiConfigForCampaign = async (campaignId) => {
    if (!campaignId) return null;
    return getApiConfigRepo().findOne({ where: { campaignId } });
  };

  const loadVisit = async (visitId) => {
    if (!visitId) return null;
    return getVisitRepo().findOne({ where: { id: parseInt(visitId, 10) } });
  };

  const logOtpEvent = async (visitId, eventType, metadata) => {
    if (!visitId) return;
    try {
      const eventEntity = getVisitEventRepo().create({
        visitId: parseInt(visitId, 10),
        eventType,
        metadata,
      });
      await getVisitEventRepo().insert(eventEntity);
      try {
        void searchService.indexEvent({
          visitId: parseInt(visitId, 10),
          campaignId: metadata?.campaignId || null,
          vendorId: metadata?.vendorId || null,
          phone: metadata?.msisdn || metadata?.phone || null,
          phoneMasked: metadata?.msisdn || metadata?.phone || null,
          eventType,
          status: metadata?.held
            ? 'HELD'
            : metadata?.success === false
              ? 'FAILED'
              : metadata?.success
                ? 'SUCCESS'
                : null,
          requestUrl: metadata?.partnerUrl || metadata?.inboundUrl || null,
          responseStatus: metadata?.httpStatus ?? null,
          success: metadata?.success,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // swallow ES
      }
    } catch (err) {
      console.warn(`Failed to log OTP event: ${err.message}`);
    }
  };

  const serializeBody = (data) => {
    if (data == null) return null;
    try {
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch {
      return String(data);
    }
  };

  /** Persist partner OTP HTTP to api_call_logs (Campaign Logs API tab). */
  const logOtpApiCall = async ({
    callType,
    visit,
    campaignId,
    phone,
    result,
  }) => {
    try {
      await apiCallLogService.record({
        visitId: visit?.id || null,
        campaignId: campaignId || visit?.campaignId || null,
        msisdn: phone,
        rcid: visit?.rcid || null,
        clickId: visit?.clickId || null,
        callType,
        requestUrl: result?.requestUrl || null,
        requestBody: result?.requestBody || null,
        responseStatus: result?.httpStatus ?? null,
        responseBody: serializeBody(result?.rawResponse),
        success: Boolean(result?.success),
        errorMessage: result?.success ? null : result?.error || null,
        statusLabel: result?.success ? 'SUCCESS' : 'FAILED',
      });
    } catch (err) {
      console.warn(`OTP api_call_logs write failed: ${err.message}`);
    }
  };

  const isRateLimited = async (ip, visitId) => {
    const key = ip ? `ratelimit:ip:${ip}` : visitId ? `ratelimit:visit:${visitId}` : null;
    if (!key) return false;
    const count = await redisService.incr(key, 60);
    if (count > 5) {
      if (visitId) {
        await logOtpEvent(visitId, VisitEventType.RATE_LIMIT_HIT, { ip, count });
      }
      return true;
    }
    return false;
  };

  const isBruteForceAttempt = async (ip, visitId) => {
    const key = ip ? `bruteforce:ip:${ip}` : visitId ? `bruteforce:visit:${visitId}` : null;
    if (!key) return false;
    const count = await redisService.incr(key, 600);
    if (count > 10) {
      if (visitId) {
        await logOtpEvent(visitId, VisitEventType.BRUTE_FORCE_ATTEMPT, {
          ip,
          count,
        });
      }
      return true;
    }
    return false;
  };

  const sendOtp = async (sendOtpDto, clientIp) => {
    const { phone, campaignId, visitId, pack } = sendOtpDto;

    if (!phone || !String(phone).trim()) {
      const err = new Error('Phone number is required');
      err.statusCode = 400;
      throw err;
    }

    if (await isRateLimited(clientIp, visitId)) {
      const err = new Error(
        'Too many requests. Please wait a minute before requesting another OTP.',
      );
      err.statusCode = 429;
      throw err;
    }

    const visit = await loadVisit(visitId);
    const campaign = await getCampaignFromInput(campaignId, visitId);

    if (flowEngineService.normalizeMode(campaign?.verificationMode) === 'ORANGE_BF') {
      const result = await orangeBfService.startOrCheckSub({
        phone: String(phone).trim(),
        campaignId: campaign?.id,
        visitId,
      });
      if (!result.success) {
        const err = new Error(result.error || result.message || 'Failed to send OTP');
        err.statusCode = 400;
        throw err;
      }
      if (visitId) {
        try {
          await getVisitRepo().update(
            { id: parseInt(visitId, 10) },
            { phone: String(phone).trim(), otpVerifiedAt: null },
          );
        } catch {
          // swallow
        }
      }
      return {
        message: result.message || 'OTP sent successfully',
        phone: String(phone).trim(),
        provider: 'orange_bf',
        remoteVerify: true,
        responseCode: result.responseCode ?? null,
        transactionId: result.transactionId || null,
        isSubscribed: Boolean(result.isSubscribed),
        status: result.status,
        forwardUrl: result.forwardUrl,
      };
    }

    const apiConfig = await getApiConfigForCampaign(campaign?.id);
    const { providerConfig, provider } = smsProviderManager.getProvider(apiConfig);

    if (!(providerConfig.sendUrl || providerConfig.send_url || providerConfig.url)) {
      const err = new Error(
        'Partner OTP send URL is not configured. Set it in Campaign API settings.',
      );
      err.statusCode = 400;
      throw err;
    }

    const context = {
      campaignId: campaign?.id,
      campaignName: campaign?.name || '',
      visitId: visitId ? parseInt(visitId, 10) : undefined,
      pack: pack || 'daily',
    };

    const sendResult = await provider.sendOtp(
      String(phone).trim(),
      '',
      providerConfig,
      context,
    );

    await logOtpApiCall({
      callType: ApiCallType.OTP_SEND,
      visit,
      campaignId: campaign?.id,
      phone: String(phone).trim(),
      result: sendResult,
    });

    if (visitId) {
      await logOtpEvent(visitId, VisitEventType.OTP_SEND, {
        phone: String(phone).trim(),
        campaignId: campaign?.id,
        provider: 'partner',
        responseCode: sendResult?.responseCode ?? null,
        success: Boolean(sendResult?.success),
        error: sendResult?.success ? undefined : sendResult?.error,
      });
    }

    if (!sendResult?.success) {
      const err = new Error(sendResult?.error || 'Failed to send OTP');
      err.statusCode = 502;
      throw err;
    }

    // Remember partner txn id briefly (for partners that need it on verify)
    if (visitId && sendResult.providerRequestId) {
      await redisService.set(
        pendingKey(visitId, phone),
        {
          providerRequestId: sendResult.providerRequestId,
          phone: String(phone).trim(),
        },
        15 * 60,
      );
    }

    if (visitId) {
      try {
        await getVisitRepo().update(
          { id: parseInt(visitId, 10) },
          { phone: String(phone).trim(), otpVerifiedAt: null },
        );
      } catch {
        // swallow
      }
    }

    return {
      message: sendResult.message || 'OTP sent successfully',
      phone: String(phone).trim(),
      provider: 'partner',
      remoteVerify: true,
      responseCode: sendResult.responseCode ?? null,
      providerRequestId: sendResult.providerRequestId || null,
    };
  };

  const verifyOtp = async (verifyOtpDto, clientIp) => {
    const phone = verifyOtpDto.phone;
    const otpCode = verifyOtpDto.otpCode || verifyOtpDto.otp;
    const visitId = verifyOtpDto.visitId;
    const campaignId = verifyOtpDto.campaignId;

    if (!phone || !String(phone).trim()) {
      const err = new Error('Phone number is required');
      err.statusCode = 400;
      throw err;
    }

    if (!otpCode || !String(otpCode).trim()) {
      const err = new Error('OTP code is required');
      err.statusCode = 400;
      throw err;
    }

    if (await isBruteForceAttempt(clientIp, visitId)) {
      const err = new Error(
        'Too many failed verification attempts. Please try again later.',
      );
      err.statusCode = 429;
      throw err;
    }

    const visit = await loadVisit(visitId);
    const campaign = await getCampaignFromInput(campaignId, visitId);

    if (flowEngineService.normalizeMode(campaign?.verificationMode) === 'ORANGE_BF') {
      const result = await orangeBfService.verifyOtp({
        phone: String(phone).trim(),
        otp: String(otpCode).trim(),
        campaignId: campaign?.id,
        visitId,
        vendorId: visit?.vendorId,
      });
      if (!result.success) {
        const err = new Error(result.error || result.message || 'OTP verification failed');
        err.statusCode = 400;
        throw err;
      }
      if (visitId) {
        try {
          await getVisitRepo().update(
            { id: parseInt(visitId, 10) },
            { phone: String(phone).trim(), otpVerifiedAt: new Date() },
          );
        } catch {
          // swallow
        }
      }
      return {
        message: result.message || 'OTP verified successfully',
        phone: String(phone).trim(),
        provider: 'orange_bf',
        responseCode: result.responseCode ?? null,
        transactionId: result.transactionId || null,
        forwardUrl: result.forwardUrl,
        postbackStatus: result.postbackStatus,
        verified: true,
      };
    }

    if (!(providerConfig.verifyUrl || providerConfig.verify_url)) {
      const err = new Error(
        'Partner OTP verify URL is not configured. Set it in Campaign API settings.',
      );
      err.statusCode = 400;
      throw err;
    }

    let providerRequestId = '';
    if (visitId) {
      const pending = await redisService.get(pendingKey(visitId, phone));
      if (pending?.providerRequestId) {
        providerRequestId = pending.providerRequestId;
      }
    }

    const verifyResult = await provider.verifyOtp(
      String(phone).trim(),
      String(otpCode).trim(),
      providerRequestId,
      providerConfig,
    );

    await logOtpApiCall({
      callType: ApiCallType.OTP_VERIFY,
      visit,
      campaignId: campaign?.id,
      phone: String(phone).trim(),
      result: verifyResult,
    });

    if (visitId) {
      await logOtpEvent(visitId, VisitEventType.OTP_VERIFY, {
        phone: String(phone).trim(),
        status: verifyResult?.success ? 'verified' : 'failed',
        provider: 'partner',
        responseCode: verifyResult?.responseCode ?? null,
        success: Boolean(verifyResult?.success),
        error: verifyResult?.success ? undefined : verifyResult?.error,
      });
    }

    if (!verifyResult?.success) {
      const err = new Error(verifyResult?.error || 'OTP verification failed');
      err.statusCode = 400;
      throw err;
    }

    if (visitId) {
      const vId = parseInt(visitId, 10);
      await getVisitRepo().update(
        { id: vId },
        {
          phone: String(phone).trim(),
          otpVerifiedAt: new Date(),
        },
      );
      await redisService.del(pendingKey(visitId, phone));
    }

    return {
      message: verifyResult.message || 'OTP verified successfully',
      phone: String(phone).trim(),
      verified: true,
      responseCode: verifyResult.responseCode ?? null,
    };
  };

  /**
   * Public API-expose mediator: mint visit → log inbound → partner OTP → log outbound.
   * Visit ties logs into Campaign Logs / Session Detail with full req/res.
   */
  const exposeSendOtp = async (
    { campaignId, vendorId, phone, pack },
    clientIp,
    meta = {},
  ) => {
    const cId = parseInt(campaignId, 10);
    if (!cId) {
      const err = new Error('campaignId is required');
      err.statusCode = 400;
      throw err;
    }
    if (!phone || !String(phone).trim()) {
      const err = new Error('Phone number is required');
      err.statusCode = 400;
      throw err;
    }

    const msisdn = normalizeMsisdn(phone);
    if (!msisdn) {
      const err = new Error('Phone number is required');
      err.statusCode = 400;
      throw err;
    }
    const inboundUrl =
      meta.requestUrl || `/api/otp/${cId}/${vendorId || '{vendorId}'}/send`;
    const inboundBody = serializeInboundBody({
      msisdn,
      pack: pack || 'daily',
      vendorId: vendorId || null,
    });

    if (await isRateLimited(clientIp, null)) {
      await logInboundExpose({
        callType: ApiCallType.OTP_EXPOSE_SEND_IN,
        campaignId: cId,
        phone: msisdn,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: 429,
        success: false,
        errorMessage: 'Too many requests',
      });
      const err = new Error(
        'Too many requests. Please wait a minute before requesting another OTP.',
      );
      err.statusCode = 429;
      throw err;
    }

    const campaign = await getCampaignRepo().findOne({ where: { id: cId } });
    try {
      assertApiExposeCampaign(campaign);
    } catch (err) {
      await logInboundExpose({
        callType: ApiCallType.OTP_EXPOSE_SEND_IN,
        campaignId: cId,
        phone: msisdn,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: err.statusCode || 400,
        success: false,
        errorMessage: err.message,
      });
      throw err;
    }

    let vendor;
    try {
      ({ vendor } = await resolveAssignedVendor(campaign, vendorId));
    } catch (err) {
      await logInboundExpose({
        callType: ApiCallType.OTP_EXPOSE_SEND_IN,
        campaignId: cId,
        phone: msisdn,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: err.statusCode || 400,
        success: false,
        errorMessage: err.message,
      });
      throw err;
    }

    const visit = await ensureExposeVisit({
      campaign,
      phone: msisdn,
      clientIp,
      landingUrl: inboundUrl,
      visitStatus: VisitStatus.OTP_SHOWN,
      vendorId: vendor.id,
    });

    const apiConfig = await getApiConfigForCampaign(cId);
    const { providerConfig, provider } = smsProviderManager.getProvider(apiConfig);

    if (!(providerConfig.sendUrl || providerConfig.send_url || providerConfig.url)) {
      const msg =
        'Partner OTP send URL is not configured. Set it in Campaign API settings.';
      await logInboundExpose({
        callType: ApiCallType.OTP_EXPOSE_SEND_IN,
        visit,
        campaignId: cId,
        phone: msisdn,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: 400,
        success: false,
        errorMessage: msg,
      });
      const err = new Error(msg);
      err.statusCode = 400;
      throw err;
    }

    const context = {
      campaignId: cId,
      campaignName: campaign?.name || '',
      visitId: visit.id,
      pack: pack || 'daily',
    };

    const sendResult = await provider.sendOtp(msisdn, '', providerConfig, context);

    // Inbound first (client → us), then outbound (us → partner) for timeline order.
    const responsePayload = {
      message: sendResult?.success
        ? sendResult.message || 'OTP sent successfully'
        : sendResult?.error || 'Failed to send OTP',
      phone: msisdn,
      msisdn,
      provider: 'partner',
      remoteVerify: true,
      responseCode: sendResult?.responseCode ?? null,
      providerRequestId: sendResult?.providerRequestId || null,
      sent: Boolean(sendResult?.success),
      visitId: visit.id,
      vendorId: vendor.id,
    };

    await logInboundExpose({
      callType: ApiCallType.OTP_EXPOSE_SEND_IN,
      visit,
      campaignId: cId,
      phone: msisdn,
      requestUrl: inboundUrl,
      requestBody: inboundBody,
      responseStatus: sendResult?.success ? 200 : sendResult?.httpStatus || 502,
      responseBody: responsePayload,
      success: Boolean(sendResult?.success),
      errorMessage: sendResult?.success
        ? null
        : sendResult?.error || 'Failed to send OTP',
    });

    await logOtpApiCall({
      callType: ApiCallType.OTP_SEND,
      visit,
      campaignId: cId,
      phone: msisdn,
      result: sendResult,
    });

    await logOtpEvent(visit.id, VisitEventType.OTP_SEND, {
      source: 'otp_expose',
      campaignId: cId,
      vendorId: vendor.id,
      msisdn,
      pack: pack || 'daily',
      inboundUrl,
      partnerUrl: sendResult?.requestUrl || null,
      responseCode: sendResult?.responseCode ?? null,
      success: Boolean(sendResult?.success),
      error: sendResult?.success ? undefined : sendResult?.error,
      httpStatus: sendResult?.httpStatus ?? null,
    });

    if (!sendResult?.success) {
      const err = new Error(sendResult?.error || 'Failed to send OTP');
      err.statusCode = 502;
      throw err;
    }

    if (sendResult.providerRequestId) {
      await redisService.set(
        exposePendingKey(cId, vendor.id, phone),
        {
          providerRequestId: sendResult.providerRequestId,
          phone: msisdn,
          visitId: visit.id,
          vendorId: vendor.id,
        },
        15 * 60,
      );
    }

    return responsePayload;
  };

  const exposeVerifyOtp = async (
    { campaignId, vendorId, phone, otp, otpCode },
    clientIp,
    meta = {},
  ) => {
    const cId = parseInt(campaignId, 10);
    const code = otpCode || otp;
    if (!cId) {
      const err = new Error('campaignId is required');
      err.statusCode = 400;
      throw err;
    }
    if (!phone || !String(phone).trim()) {
      const err = new Error('Phone number is required');
      err.statusCode = 400;
      throw err;
    }
    if (!code || !String(code).trim()) {
      const err = new Error('OTP code is required');
      err.statusCode = 400;
      throw err;
    }

    const msisdn = normalizeMsisdn(phone);
    const otpPin = String(code).trim();
    if (!msisdn) {
      const err = new Error('Phone number is required');
      err.statusCode = 400;
      throw err;
    }
    const inboundUrl =
      meta.requestUrl || `/api/otp/${cId}/${vendorId || '{vendorId}'}/verify`;
    const inboundBody = serializeInboundBody({
      msisdn,
      otp: otpPin,
      vendorId: vendorId || null,
    });

    if (await isBruteForceAttempt(clientIp, null)) {
      await logInboundExpose({
        callType: ApiCallType.OTP_EXPOSE_VERIFY_IN,
        campaignId: cId,
        phone: msisdn,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: 429,
        success: false,
        errorMessage: 'Too many failed verification attempts',
      });
      const err = new Error(
        'Too many failed verification attempts. Please try again later.',
      );
      err.statusCode = 429;
      throw err;
    }

    const campaign = await getCampaignRepo().findOne({ where: { id: cId } });
    try {
      assertApiExposeCampaign(campaign);
    } catch (err) {
      await logInboundExpose({
        callType: ApiCallType.OTP_EXPOSE_VERIFY_IN,
        campaignId: cId,
        phone: msisdn,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: err.statusCode || 400,
        success: false,
        errorMessage: err.message,
      });
      throw err;
    }

    let vendor;
    let tracking;
    try {
      ({ vendor, tracking } = await resolveAssignedVendor(campaign, vendorId));
    } catch (err) {
      await logInboundExpose({
        callType: ApiCallType.OTP_EXPOSE_VERIFY_IN,
        campaignId: cId,
        phone: msisdn,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: err.statusCode || 400,
        success: false,
        errorMessage: err.message,
      });
      throw err;
    }

    const visit = await ensureExposeVisit({
      campaign,
      phone: msisdn,
      clientIp,
      landingUrl: inboundUrl,
      visitStatus: VisitStatus.OTP_SHOWN,
      vendorId: vendor.id,
    });

    const apiConfig = await getApiConfigForCampaign(cId);
    const { providerConfig, provider } = smsProviderManager.getProvider(apiConfig);

    if (!(providerConfig.verifyUrl || providerConfig.verify_url)) {
      const msg =
        'Partner OTP verify URL is not configured. Set it in Campaign API settings.';
      await logInboundExpose({
        callType: ApiCallType.OTP_EXPOSE_VERIFY_IN,
        visit,
        campaignId: cId,
        phone: msisdn,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: 400,
        success: false,
        errorMessage: msg,
      });
      const err = new Error(msg);
      err.statusCode = 400;
      throw err;
    }

    let providerRequestId = '';
    const pending = await redisService.get(exposePendingKey(cId, vendor.id, phone));
    if (pending?.providerRequestId) {
      providerRequestId = pending.providerRequestId;
    }

    const verifyResult = await provider.verifyOtp(
      msisdn,
      otpPin,
      providerRequestId,
      providerConfig,
    );

    let held = false;
    let payoutSeq = null;
    const trackingPayout =
      tracking?.payoutPercent != null && tracking.payoutPercent !== ''
        ? tracking.payoutPercent
        : providerConfig?.payoutPercent;
    let payoutPercent = parsePayoutPercent(trackingPayout);
    if (verifyResult?.success) {
      const decision = await resolveExposePayoutHold(
        cId,
        vendor.id,
        trackingPayout,
      );
      held = decision.held;
      payoutSeq = decision.seq;
      payoutPercent = decision.payoutPercent;
    }

    const clientSuccess = Boolean(verifyResult?.success) && !held;
    const clientError = held
      ? HELD_OTP_MESSAGE
      : verifyResult?.error || 'OTP verification failed';
    const inboundHttpStatus = clientSuccess
      ? 200
      : held
        ? 400
        : verifyResult?.httpStatus || 400;
    const inboundBodyOut = held
      ? {
          statusCode: 400,
          error: 'Error',
          message: HELD_OTP_MESSAGE,
          held: true,
        }
      : {
          message: clientSuccess
            ? verifyResult.message || 'OTP verified successfully'
            : clientError,
          phone: msisdn,
          msisdn,
          verified: clientSuccess,
          responseCode: verifyResult?.responseCode ?? null,
          visitId: visit.id,
          vendorId: vendor.id,
        };

    await logInboundExpose({
      callType: ApiCallType.OTP_EXPOSE_VERIFY_IN,
      visit,
      campaignId: cId,
      phone: msisdn,
      requestUrl: inboundUrl,
      requestBody: inboundBody,
      responseStatus: inboundHttpStatus,
      responseBody: inboundBodyOut,
      success: clientSuccess,
      errorMessage: clientSuccess ? null : clientError,
      statusLabel: held ? 'HELD' : clientSuccess ? 'SUCCESS' : 'FAILED',
    });

    await logOtpApiCall({
      callType: ApiCallType.OTP_VERIFY,
      visit,
      campaignId: cId,
      phone: msisdn,
      result: verifyResult,
    });

    await logOtpEvent(visit.id, VisitEventType.OTP_VERIFY, {
      source: 'otp_expose',
      campaignId: cId,
      vendorId: vendor.id,
      msisdn,
      inboundUrl,
      partnerUrl: verifyResult?.requestUrl || null,
      responseCode: verifyResult?.responseCode ?? null,
      success: Boolean(verifyResult?.success),
      held,
      payoutPercent,
      seq: payoutSeq,
      clientResponse: held ? 'invalid_otp' : undefined,
      error: verifyResult?.success ? undefined : verifyResult?.error,
      httpStatus: verifyResult?.httpStatus ?? null,
    });

    if (!verifyResult?.success) {
      const err = new Error(verifyResult?.error || 'OTP verification failed');
      err.statusCode = 400;
      throw err;
    }

    await getVisitRepo().update(
      { id: visit.id },
      { otpVerifiedAt: new Date(), visitStatus: VisitStatus.SUCCESS },
    );
    await redisService.del(exposePendingKey(cId, vendor.id, phone));

    if (held) {
      const err = new Error(HELD_OTP_MESSAGE);
      err.statusCode = 400;
      throw err;
    }

    return inboundBodyOut;
  };

  const isVisitOtpVerified = async (visitId, phone) => {
    if (!visitId) return false;
    const visit = await getVisitRepo().findOne({
      where: { id: parseInt(visitId, 10) },
    });
    if (!visit?.otpVerifiedAt) return false;
    if (phone && visit.phone && String(visit.phone).trim() !== String(phone).trim()) {
      return false;
    }
    return true;
  };

  return {
    sendOtp,
    verifyOtp,
    exposeSendOtp,
    exposeVerifyOtp,
    isRateLimited,
    isBruteForceAttempt,
    isVisitOtpVerified,
  };
};

export const otpService = createOtpService();
