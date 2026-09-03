import { getRepository } from '../../database/index.js';
import { Campaign } from '../../database/entities/campaign.entity.js';
import { CampaignTracking } from '../../database/entities/campaign-tracking.entity.js';
import { Vendor } from '../../database/entities/vendor.entity.js';
import { Visit } from '../../database/entities/visit.entity.js';
import { ApiCallType } from '../../database/entities/api-call-log.entity.js';
import { apiCallLogService } from './api-call-log.service.js';
import { orangeBfService } from './orange-bf.service.js';

const httpError = (message, statusCode, code) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

export const createOrangeBfExposeService = () => {
  const authenticateVendorRequest = async (req) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.body?.apiKey;
    const campid = req.query.campid || req.body?.campid || req.query.campaign_id || req.body?.campaign_id;

    if (!campid) {
      throw httpError('Campaign ID (campid) is required', 400, 'MISSING_CAMPAIGN');
    }

    const campaign = await getRepository(Campaign).findOne({
      where: { id: parseInt(campid, 10) },
    });

    if (!campaign) {
      throw httpError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
    }

    let vendor = null;
    let tracking = null;

    if (apiKey) {
      vendor = await getRepository(Vendor).findOne({ where: { apiKey } });
      if (!vendor) {
        throw httpError('Invalid Vendor API key', 401, 'INVALID_API_KEY');
      }

      tracking = await getRepository(CampaignTracking).findOne({
        where: { campaignId: campaign.id, vendorId: vendor.id, active: true },
      });
    }

    return { campaign, vendor, tracking };
  };

  return {
    handleCheckSub: async (req, res) => {
      const { campaign, vendor } = await authenticateVendorRequest(req);
      const phone = req.body?.phone || req.query.phone || req.body?.msisdn || req.query.msisdn;
      const visitId = req.body?.visitId || req.query.visitId;

      if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone / MSISDN is required' });
      }

      const result = await orangeBfService.checkSub({ phone, campaignId: campaign.id, visitId });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaign.id,
        vendorId: vendor?.id || null,
        msisdn: String(phone).replace(/\D/g, ''),
        callType: ApiCallType.ORANGE_BF_EXPOSE_CHECK_IN || 'orange_bf_expose_check_in',
        requestUrl: req.originalUrl,
        requestBody: JSON.stringify(req.body || req.query),
        responseStatus: result.success ? 200 : 400,
        responseBody: JSON.stringify(result),
        success: result.success,
        errorMessage: result.success ? null : (result.responseMessage || result.error),
        statusLabel: result.outcome || (result.success ? 'SUCCESS' : 'FAILED'),
      });

      return res.status(result.success ? 200 : 400).json(result);
    },

    handleSendOtp: async (req, res) => {
      const { campaign, vendor } = await authenticateVendorRequest(req);
      const phone = req.body?.phone || req.query.phone || req.body?.msisdn || req.query.msisdn;
      const language = req.body?.language || req.query.language || '_E';
      const visitId = req.body?.visitId || req.query.visitId;

      if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone / MSISDN is required' });
      }

      const result = await orangeBfService.startOrCheckSub({
        phone,
        campaignId: campaign.id,
        visitId,
        language,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaign.id,
        vendorId: vendor?.id || null,
        msisdn: String(phone).replace(/\D/g, ''),
        callType: ApiCallType.ORANGE_BF_EXPOSE_SEND_IN || 'orange_bf_expose_send_in',
        requestUrl: req.originalUrl,
        requestBody: JSON.stringify(req.body || req.query),
        responseStatus: result.success ? 200 : 400,
        responseBody: JSON.stringify(result),
        success: result.success,
        errorMessage: result.success ? null : (result.error || result.message),
        statusLabel: result.status || (result.success ? 'OTP_SENT' : 'FAILED'),
      });

      return res.status(result.success ? 200 : 400).json(result);
    },

    handleVerifyOtp: async (req, res) => {
      const { campaign, vendor } = await authenticateVendorRequest(req);
      const phone = req.body?.phone || req.query.phone || req.body?.msisdn || req.query.msisdn;
      const otp = req.body?.otp || req.query.otp;
      const visitId = req.body?.visitId || req.query.visitId;

      if (!phone || !otp) {
        return res.status(400).json({ success: false, error: 'Phone and OTP are required' });
      }

      const result = await orangeBfService.verifyOtp({
        phone,
        otp,
        campaignId: campaign.id,
        visitId,
        vendorId: vendor?.id || null,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaign.id,
        vendorId: vendor?.id || null,
        msisdn: String(phone).replace(/\D/g, ''),
        callType: ApiCallType.ORANGE_BF_EXPOSE_VERIFY_IN || 'orange_bf_expose_verify_in',
        requestUrl: req.originalUrl,
        requestBody: JSON.stringify(req.body || req.query),
        responseStatus: result.success ? 200 : 400,
        responseBody: JSON.stringify(result),
        success: result.success,
        errorMessage: result.success ? null : (result.error || result.message),
        statusLabel: result.status || (result.success ? 'SUCCESS' : 'FAILED'),
      });

      return res.status(result.success ? 200 : 400).json(result);
    },

    handleUnsubscribe: async (req, res) => {
      const { campaign, vendor } = await authenticateVendorRequest(req);
      const phone = req.body?.phone || req.query.phone || req.body?.msisdn || req.query.msisdn;
      const visitId = req.body?.visitId || req.query.visitId;

      if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone / MSISDN is required' });
      }

      const result = await orangeBfService.unsubscribe({ phone, campaignId: campaign.id, visitId });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaign.id,
        vendorId: vendor?.id || null,
        msisdn: String(phone).replace(/\D/g, ''),
        callType: ApiCallType.ORANGE_BF_EXPOSE_UNSUB_IN || 'orange_bf_expose_unsub_in',
        requestUrl: req.originalUrl,
        requestBody: JSON.stringify(req.body || req.query),
        responseStatus: result.success ? 200 : 400,
        responseBody: JSON.stringify(result),
        success: result.success,
        errorMessage: result.success ? null : (result.responseMessage || result.error),
        statusLabel: result.outcome || (result.success ? 'SUCCESS' : 'FAILED'),
      });

      return res.status(result.success ? 200 : 400).json(result);
    },
  };
};

export const orangeBfExposeService = createOrangeBfExposeService();
