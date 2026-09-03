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
      const parsed = typeof apiConfig.headersJson === 'string' ? JSON.parse(apiConfig.headersJson) : {};
      return {
        baseUrl: apiConfig.sendUrl ? new URL(apiConfig.sendUrl).origin : ORANGE_BF_DEFAULTS.baseUrl,
        serviceId: parsed.serviceId || ORANGE_BF_DEFAULTS.serviceId,
        subServiceId: parsed.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
        cpId: parsed.cpId || ORANGE_BF_DEFAULTS.cpId,
        channel: parsed.channel || ORANGE_BF_DEFAULTS.channel,
        country: parsed.country || ORANGE_BF_DEFAULTS.country,
        operator: parsed.operator || ORANGE_BF_DEFAULTS.operator,
        language: parsed.language || ORANGE_BF_DEFAULTS.language,
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

      // 1. Run CheckSub first to see if user is already an active subscriber
      const checkResult = await orangeBfProvider.checkSubscription({
        msisdn,
        serviceId: config.serviceId,
        config,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaign?.id || null,
        msisdn,
        callType: ApiCallType.ORANGE_BF_CHECKSUB || 'orange_bf_checksub',
        requestUrl: checkResult.requestUrl,
        requestBody: JSON.stringify({ msisdn, serviceId: config.serviceId, channel: config.channel }),
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
        config,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaign?.id || null,
        msisdn,
        callType: ApiCallType.ORANGE_BF_OTP_SEND || 'orange_bf_otp_send',
        requestUrl: otpResult.requestUrl,
        requestBody: JSON.stringify({ msisdn, language: language || config.language || '_E' }),
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

      // Cache session state in Redis
      if (visitId) {
        try {
          await redisService.set(
            `orange_bf:${visitId}`,
            JSON.stringify({ msisdn, transactionId: otpResult.transactionId, timestamp: Date.now() }),
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
        transactionId: otpResult.transactionId,
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

      const verifyResult = await orangeBfProvider.validateAuthOtp({
        msisdn,
        otp: String(otp).trim(),
        config,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaign?.id || null,
        msisdn,
        callType: ApiCallType.ORANGE_BF_OTP_VERIFY || 'orange_bf_otp_verify',
        requestUrl: verifyResult.requestUrl,
        requestBody: JSON.stringify({ msisdn, otp: String(otp).trim() }),
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
          transactionId: verifyResult.transactionId,
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
            transactionId: verifyResult.transactionId || null,
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
        transactionId: verifyResult.transactionId,
        forwardUrl,
        postbackStatus,
        message: 'OTP validated successfully',
      };
    },

    checkSub: async ({ phone, campaignId, visitId }) => {
      const msisdn = cleanPhone(phone);
      const apiConfig = await getApiConfig(campaignId);
      const config = parseProviderConfig(apiConfig);

      const checkResult = await orangeBfProvider.checkSubscription({
        msisdn,
        serviceId: config.serviceId,
        config,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaignId ? parseInt(campaignId, 10) : null,
        msisdn,
        callType: ApiCallType.ORANGE_BF_CHECKSUB || 'orange_bf_checksub',
        requestUrl: checkResult.requestUrl,
        requestBody: JSON.stringify({ msisdn, serviceId: config.serviceId }),
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

      const unsubResult = await orangeBfProvider.unsubscribe({
        msisdn,
        serviceId: config.serviceId,
        config,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaignId ? parseInt(campaignId, 10) : null,
        msisdn,
        callType: ApiCallType.ORANGE_BF_UNSUB || 'orange_bf_unsub',
        requestUrl: unsubResult.requestUrl,
        requestBody: JSON.stringify({ msisdn, serviceId: config.serviceId }),
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
