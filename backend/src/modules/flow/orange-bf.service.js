import { getRepository } from '../../database/index.js';
import { Campaign } from '../../database/entities/campaign.entity.js';
import { ApiConfig } from '../../database/entities/api-config.entity.js';
import { ApiCallType } from '../../database/entities/api-call-log.entity.js';
import { Visit } from '../../database/entities/visit.entity.js';
import { CampaignTracking } from '../../database/entities/campaign-tracking.entity.js';
import { ConversionPostback, ConversionPostbackStatus } from '../../database/entities/conversion-postback.entity.js';
import { redisService } from '../../common/services/redis.service.js';
import { apiCallLogService } from './api-call-log.service.js';
import { orangeBfProvider, ORANGE_BF_DEFAULTS } from './orange-bf.provider.js';
import { ORANGE_BF_OUTCOMES } from './helpers/orange-bf-normalizer.js';
import { interpretChecksubResponse } from './helpers/checksub-rules.js';

const cleanPhone = (val) => String(val || '').replace(/\D/g, '');

const safeParseJson = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const createOrangeBfService = () => {
  const getCampaign = async (campaignId) => {
    if (!campaignId) return null;
    return getRepository(Campaign).findOne({ where: { id: parseInt(campaignId, 10) } });
  };

  const getApiConfig = async (campaignId) => {
    if (!campaignId) return null;
    return getRepository(ApiConfig).findOne({ where: { campaignId: parseInt(campaignId, 10) } });
  };

  const parseProviderConfig = (apiConfig) => {
    if (!apiConfig) return { ...ORANGE_BF_DEFAULTS };
    try {
      const headersParsed = safeParseJson(apiConfig.headersJson);
      const otpConfigParsed = safeParseJson(apiConfig.otpConfigJson);

      const merged = { ...headersParsed, ...otpConfigParsed };

      let baseUrl = ORANGE_BF_DEFAULTS.baseUrl;
      if (merged.baseUrl) {
        baseUrl = merged.baseUrl;
      } else if (apiConfig.sendUrl) {
        try {
          baseUrl = new URL(apiConfig.sendUrl).origin;
        } catch {
          baseUrl = ORANGE_BF_DEFAULTS.baseUrl;
        }
      }

      return {
        baseUrl,
        sendUrl: merged.sendUrl || apiConfig.sendUrl || null,
        sendMethod: (merged.sendMethod || merged.method || 'GET').toUpperCase(),
        sendHeadersJson: merged.sendHeadersJson || merged.headersJson || apiConfig.headersJson || null,
        sendBodyJson: merged.sendBodyJson || merged.bodyJson || merged.body || null,

        verifyUrl: merged.verifyUrl || apiConfig.verifyUrl || null,
        verifyMethod: (merged.verifyMethod || 'GET').toUpperCase(),
        verifyHeadersJson: merged.verifyHeadersJson || merged.headersJson || apiConfig.headersJson || null,
        verifyBodyJson: merged.verifyBodyJson || merged.verifyBody || null,

        checksubUrl: merged.checksubUrl || apiConfig.subscriptionApi || null,
        checksubMethod: (merged.checksubMethod || 'GET').toUpperCase(),
        checksubHeadersJson: merged.checksubHeadersJson || merged.headersJson || apiConfig.headersJson || null,
        checksubBodyJson: merged.checksubBodyJson || null,

        unsubUrl: merged.unsubUrl || null,
        unsubMethod: (merged.unsubMethod || 'GET').toUpperCase(),
        unsubHeadersJson: merged.unsubHeadersJson || merged.headersJson || apiConfig.headersJson || null,
        unsubBodyJson: merged.unsubBodyJson || null,

        syncUrl: merged.syncUrl || null,
        syncMethod: (merged.syncMethod || 'GET').toUpperCase(),
        syncHeadersJson: merged.syncHeadersJson || merged.headersJson || apiConfig.headersJson || null,
        syncBodyJson: merged.syncBodyJson || null,

        serviceId: merged.serviceId || ORANGE_BF_DEFAULTS.serviceId,
        subServiceId: merged.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
        cpId: merged.cpId || ORANGE_BF_DEFAULTS.cpId,
        channel: merged.channel || ORANGE_BF_DEFAULTS.channel,
        country: merged.country || ORANGE_BF_DEFAULTS.country,
        operator: merged.operator || ORANGE_BF_DEFAULTS.operator,
        language: merged.language || ORANGE_BF_DEFAULTS.language,
        successKey: merged.successKey || apiConfig.successKey || 'responseCode',
        successValue: merged.successValue !== undefined ? String(merged.successValue) : (apiConfig.successValue || '0'),
        timeoutMs: Number(merged.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs,
      };
    } catch {
      return { ...ORANGE_BF_DEFAULTS };
    }
  };

  return {
    startOrCheckSub: async ({ phone, campaignId, visitId, language = '_E' }) => {
      const msisdn = cleanPhone(phone);
      if (!msisdn) {
        return { success: false, error: 'MSISDN is required' };
      }

      const campaign = await getCampaign(campaignId);
      const apiConfig = await getApiConfig(campaignId);
      const config = parseProviderConfig(apiConfig);
      const context = {
        campaignId: campaign?.id ? String(campaign.id) : '',
        campaignName: campaign?.name || '',
        visitId: visitId ? String(visitId) : '',
      };

      // 1. Run CheckSub first to see if user is already an active subscriber
      const checkResult = await orangeBfProvider.checkSubscription({
        msisdn,
        serviceId: config.serviceId,
        subServiceId: config.subServiceId,
        cpId: config.cpId,
        channel: config.channel,
        country: config.country,
        operator: config.operator,
        context,
        config,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaign?.id || null,
        msisdn,
        callType: ApiCallType.ORANGE_BF_CHECKSUB || 'orange_bf_checksub',
        requestUrl: checkResult.requestUrl,
        requestBody: checkResult.requestBody ? (typeof checkResult.requestBody === 'string' ? checkResult.requestBody : JSON.stringify(checkResult.requestBody)) : JSON.stringify(checkResult.requestParams || { msisdn, serviceId: config.serviceId }),
        responseStatus: checkResult.httpStatus,
        responseBody: checkResult.rawResponse,
        success: checkResult.success,
        errorMessage: checkResult.success ? null : checkResult.responseMessage,
        statusLabel: checkResult.outcome,
      });

      // Check if user configured custom Checksub Rules in the modal UI!
      const customRules = interpretChecksubResponse(
        checkResult.rawResponse,
        apiConfig?.checksubConfigJson,
      );

      let isSubscriberActive = checkResult.outcome === ORANGE_BF_OUTCOMES.ACTIVE;
      let forwardUrl = campaign?.successUrl || campaign?.landingUrl || null;

      if (customRules?.matched) {
        if (customRules.go === 'external' && customRules.url) {
          forwardUrl = customRules.url;
          isSubscriberActive = true;
        } else if (customRules.go === 'page') {
          isSubscriberActive = true;
        }
      }

      // If already active subscriber -> Auto-forward to successUrl / Content Portal!
      if (isSubscriberActive) {
        return {
          success: true,
          status: ORANGE_BF_OUTCOMES.ACTIVE,
          isSubscribed: true,
          forwardUrl,
          transactionId: checkResult.transactionId,
          message: 'Subscriber is already active. Redirecting to service...',
        };
      }

      // 2. Inactive / Not found -> Generate Auth OTP via SMS
      const otpResult = await orangeBfProvider.generateAuthOtp({
        msisdn,
        language: language || config.language || '_E',
        serviceId: config.serviceId,
        subServiceId: config.subServiceId,
        cpId: config.cpId,
        channel: config.channel,
        country: config.country,
        operator: config.operator,
        context,
        config,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaign?.id || null,
        msisdn,
        callType: ApiCallType.ORANGE_BF_OTP_SEND || 'orange_bf_otp_send',
        requestUrl: otpResult.requestUrl,
        requestBody: otpResult.requestBody ? (typeof otpResult.requestBody === 'string' ? otpResult.requestBody : JSON.stringify(otpResult.requestBody)) : JSON.stringify(otpResult.requestParams || { msisdn, language: language || config.language || '_E' }),
        responseStatus: otpResult.httpStatus,
        responseBody: otpResult.rawResponse,
        success: otpResult.success,
        errorMessage: otpResult.success ? null : otpResult.responseMessage,
        statusLabel: otpResult.outcome,
      });

      if (!otpResult.success) {
        return {
          success: false,
          status: otpResult.outcome,
          responseCode: otpResult.responseCode,
          error: otpResult.responseMessage || 'Failed to send OTP',
          transactionId: otpResult.transactionId,
        };
      }

      // Extract chained identifiers & cache session state in Redis
      const raw = otpResult.rawResponse || {};
      const chainedId = String(
        otpResult.transactionId ||
        raw.transactionId ||
        raw.transaction_id ||
        raw.requestId ||
        raw.request_id ||
        raw.referenceId ||
        raw.reference_id ||
        raw.token ||
        raw.sessionId ||
        raw.session_id ||
        raw.otpId ||
        raw.otp_id ||
        raw.id ||
        ''
      );

      const cachePayload = {
        msisdn,
        transactionId: chainedId,
        requestId: chainedId,
        referenceId: chainedId,
        token: raw.token || chainedId,
        sessionId: raw.sessionId || raw.session_id || chainedId,
        rawResponse: raw,
        timestamp: Date.now(),
      };

      if (visitId) {
        try {
          await redisService.set(
            `orange_bf:${visitId}`,
            JSON.stringify(cachePayload),
            900,
          );
        } catch {
          // Redis cache optional
        }
      }
      if (campaign?.id && msisdn) {
        try {
          await redisService.set(
            `orange_bf:${campaign.id}:${msisdn}`,
            JSON.stringify(cachePayload),
            900,
          );
        } catch {
          // Redis cache optional
        }
      }

      return {
        success: true,
        status: ORANGE_BF_OUTCOMES.OTP_SENT,
        responseCode: otpResult.responseCode,
        transactionId: chainedId,
        message: 'OTP generated and sent successfully',
      };
    },

    verifyOtp: async ({ phone, otp, campaignId, visitId, vendorId }) => {
      const msisdn = cleanPhone(phone);
      if (!msisdn || !otp) {
        return { success: false, error: 'Phone and OTP are required' };
      }

      const campaign = await getCampaign(campaignId);
      const apiConfig = await getApiConfig(campaignId);
      const config = parseProviderConfig(apiConfig);

      // Retrieve cached session chaining values
      let cachedData = {};
      if (visitId) {
        try {
          const raw = await redisService.get(`orange_bf:${visitId}`);
          if (raw) cachedData = safeParseJson(raw);
        } catch {}
      }
      if (!cachedData.transactionId && campaign?.id && msisdn) {
        try {
          const raw = await redisService.get(`orange_bf:${campaign.id}:${msisdn}`);
          if (raw) cachedData = safeParseJson(raw);
        } catch {}
      }

      const context = {
        campaignId: campaign?.id ? String(campaign.id) : '',
        campaignName: campaign?.name || '',
        visitId: visitId ? String(visitId) : '',
        vendorId: vendorId ? String(vendorId) : '',
        ...cachedData,
      };

      const verifyResult = await orangeBfProvider.validateAuthOtp({
        msisdn,
        otp: String(otp).trim(),
        transactionId: cachedData.transactionId || '',
        requestId: cachedData.requestId || cachedData.transactionId || '',
        referenceId: cachedData.referenceId || cachedData.transactionId || '',
        token: cachedData.token || '',
        sessionId: cachedData.sessionId || '',
        context,
        config,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaign?.id || null,
        msisdn,
        callType: ApiCallType.ORANGE_BF_OTP_VERIFY || 'orange_bf_otp_verify',
        requestUrl: verifyResult.requestUrl,
        requestBody: verifyResult.requestBody ? (typeof verifyResult.requestBody === 'string' ? verifyResult.requestBody : JSON.stringify(verifyResult.requestBody)) : JSON.stringify(verifyResult.requestParams || { msisdn, otp: String(otp).trim() }),
        responseStatus: verifyResult.httpStatus,
        responseBody: verifyResult.rawResponse,
        success: verifyResult.success,
        errorMessage: verifyResult.success ? null : verifyResult.responseMessage,
        statusLabel: verifyResult.outcome,
      });

      if (!verifyResult.success) {
        return {
          success: false,
          status: verifyResult.outcome,
          responseCode: verifyResult.responseCode,
          error: verifyResult.responseMessage || 'OTP validation failed',
          transactionId: verifyResult.transactionId || cachedData.transactionId || null,
        };
      }

      // Record Conversion & Vendor Approval Check
      let postbackStatus = null;
      if (campaign) {
        try {
          // Find vendor tracking assignment if present
          let tracking = null;
          if (vendorId) {
            tracking = await getRepository(CampaignTracking).findOne({
              where: { campaignId: campaign.id, vendorId: parseInt(vendorId, 10), active: true },
            });
          }

          const payoutPercent = tracking?.payoutPercent ?? 100;
          const shouldSendPostback = Math.random() * 100 <= payoutPercent;
          postbackStatus = shouldSendPostback ? ConversionPostbackStatus.PENDING : ConversionPostbackStatus.SKIPPED;

          const postbackRepo = getRepository(ConversionPostback);
          const postback = postbackRepo.create({
            campaignId: campaign.id,
            vendorId: vendorId ? parseInt(vendorId, 10) : null,
            visitId: visitId ? parseInt(visitId, 10) : null,
            msisdn,
            status: postbackStatus,
            transactionId: verifyResult.transactionId || cachedData.transactionId || null,
          });
          await postbackRepo.save(postback);
        } catch (e) {
          console.warn('[OrangeBf] Failed to queue postback:', e.message);
        }
      }

      const forwardUrl = campaign?.successUrl || campaign?.landingUrl || null;

      return {
        success: true,
        status: ORANGE_BF_OUTCOMES.SUCCESS,
        responseCode: verifyResult.responseCode,
        transactionId: verifyResult.transactionId || cachedData.transactionId || null,
        forwardUrl,
        postbackStatus,
        message: 'OTP validated successfully',
      };
    },

    checkSub: async ({ phone, campaignId, visitId }) => {
      const msisdn = cleanPhone(phone);
      const apiConfig = await getApiConfig(campaignId);
      const config = parseProviderConfig(apiConfig);
      const context = {
        campaignId: campaignId ? String(campaignId) : '',
        visitId: visitId ? String(visitId) : '',
      };

      const checkResult = await orangeBfProvider.checkSubscription({
        msisdn,
        serviceId: config.serviceId,
        subServiceId: config.subServiceId,
        cpId: config.cpId,
        channel: config.channel,
        country: config.country,
        operator: config.operator,
        context,
        config,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaignId ? parseInt(campaignId, 10) : null,
        msisdn,
        callType: ApiCallType.ORANGE_BF_CHECKSUB || 'orange_bf_checksub',
        requestUrl: checkResult.requestUrl,
        requestBody: checkResult.requestBody ? (typeof checkResult.requestBody === 'string' ? checkResult.requestBody : JSON.stringify(checkResult.requestBody)) : JSON.stringify(checkResult.requestParams || { msisdn, serviceId: config.serviceId }),
        responseStatus: checkResult.httpStatus,
        responseBody: checkResult.rawResponse,
        success: checkResult.success,
        errorMessage: checkResult.success ? null : checkResult.responseMessage,
        statusLabel: checkResult.outcome,
      });

      return checkResult;
    },

    unsubscribe: async ({ phone, campaignId, visitId }) => {
      const msisdn = cleanPhone(phone);
      const apiConfig = await getApiConfig(campaignId);
      const config = parseProviderConfig(apiConfig);
      const context = {
        campaignId: campaignId ? String(campaignId) : '',
        visitId: visitId ? String(visitId) : '',
      };

      const unsubResult = await orangeBfProvider.unsubscribe({
        msisdn,
        serviceId: config.serviceId,
        context,
        config,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaignId ? parseInt(campaignId, 10) : null,
        msisdn,
        callType: ApiCallType.ORANGE_BF_UNSUB || 'orange_bf_unsub',
        requestUrl: unsubResult.requestUrl,
        requestBody: unsubResult.requestBody ? (typeof unsubResult.requestBody === 'string' ? unsubResult.requestBody : JSON.stringify(unsubResult.requestBody)) : JSON.stringify(unsubResult.requestParams || { msisdn, serviceId: config.serviceId }),
        responseStatus: unsubResult.httpStatus,
        responseBody: unsubResult.rawResponse,
        success: unsubResult.success,
        errorMessage: unsubResult.success ? null : unsubResult.responseMessage,
        statusLabel: unsubResult.outcome,
      });

      return unsubResult;
    },
  };
};

export const orangeBfService = createOrangeBfService();
