import { getRepository } from '../../database/index.js';
import { OtpRequest } from './entities/otp-request.entity.js';
import { ApiConfig } from '../api-config/entities/api-config.entity.js';
import { Campaign } from '../campaigns/entities/campaign.entity.js';
import { Visit } from '../analytics/entities/visit.entity.js';
import { VisitEvent, VisitEventType } from '../analytics/entities/visit-event.entity.js';
import { smsProviderManager } from './providers/sms-provider.manager.js';
import { redisService } from '../../common/services/redis.service.js';

export const createOtpService = () => {
  const getOtpRepo = () => getRepository(OtpRequest);
  const getApiConfigRepo = () => getRepository(ApiConfig);
  const getCampaignRepo = () => getRepository(Campaign);
  const getVisitRepo = () => getRepository(Visit);
  const getVisitEventRepo = () => getRepository(VisitEvent);

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

  const logOtpEvent = async (visitId, eventType, metadata) => {
    if (!visitId) return;
    try {
      const eventEntity = getVisitEventRepo().create({
        visitId: parseInt(visitId, 10),
        eventType,
        metadata,
      });
      await getVisitEventRepo().insert(eventEntity);
    } catch (err) {
      console.warn(`Failed to log OTP event: ${err.message}`);
    }
  };

  const isRateLimited = async (ip, visitId) => {
    const key = ip ? `ratelimit:ip:${ip}` : visitId ? `ratelimit:visit:${visitId}` : null;
    if (!key) return false;

    const count = await redisService.incr(key, 60);
    if (count > 5) {
      if (visitId) {
        await logOtpEvent(visitId, VisitEventType.RATE_LIMIT_HIT, {
          ip,
          count,
        });
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
    const { phone, campaignId, visitId } = sendOtpDto;

    if (await isRateLimited(clientIp, visitId)) {
      const err = new Error('Too many requests. Please wait a minute before requesting another OTP.');
      err.statusCode = 429;
      throw err;
    }

    const campaign = await getCampaignFromInput(campaignId, visitId);
    const apiConfig = await getApiConfigForCampaign(campaign?.id);

    const otpCode = generateOtp();

    const provider = smsProviderManager.getProvider(apiConfig);
    await provider.sendSms(phone, otpCode, apiConfig);

    const otpRequest = getOtpRepo().create({
      phone,
      otpCode,
      campaignId: campaign?.id,
      visitId: visitId ? parseInt(visitId, 10) : undefined,
      status: 'pending',
      attempts: 0,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await getOtpRepo().save(otpRequest);

    if (visitId) {
      await logOtpEvent(visitId, VisitEventType.OTP_SEND, {
        phone,
        campaignId: campaign?.id,
      });
      try {
        await getVisitRepo().update(
          { id: parseInt(visitId, 10) },
          { phone: phone.trim() },
        );
      } catch {
        // swallow
      }
    }

    return {
      message: 'OTP sent successfully',
      phone,
      requestId: otpRequest.id,
    };
  };

  const verifyOtp = async (verifyOtpDto, clientIp) => {
    const { phone, otpCode, visitId } = verifyOtpDto;

    if (await isBruteForceAttempt(clientIp, visitId)) {
      const err = new Error('Too many failed verification attempts. Please try again later.');
      err.statusCode = 429;
      throw err;
    }

    const where = { phone, status: 'pending' };
    if (visitId) {
      where.visitId = parseInt(visitId, 10);
    }

    const otpRequest = await getOtpRepo().findOne({
      where,
      order: { createdAt: 'DESC' },
    });

    if (!otpRequest) {
      const err = new Error('No pending OTP request found for this phone number');
      err.statusCode = 404;
      throw err;
    }

    if (new Date() > otpRequest.expiresAt) {
      otpRequest.status = 'expired';
      await getOtpRepo().save(otpRequest);
      const err = new Error('OTP has expired. Please request a new one.');
      err.statusCode = 400;
      throw err;
    }

    if (otpRequest.attempts >= 3) {
      otpRequest.status = 'failed';
      await getOtpRepo().save(otpRequest);
      const err = new Error('Maximum verification attempts exceeded. Please request a new OTP.');
      err.statusCode = 400;
      throw err;
    }

    if (otpRequest.otpCode !== otpCode) {
      otpRequest.attempts += 1;
      await getOtpRepo().save(otpRequest);
      const err = new Error(`Invalid OTP code. ${3 - otpRequest.attempts} attempt(s) remaining.`);
      err.statusCode = 400;
      throw err;
    }

    otpRequest.status = 'verified';
    await getOtpRepo().save(otpRequest);

    if (visitId) {
      await logOtpEvent(visitId, VisitEventType.OTP_VERIFY, {
        phone,
        status: 'verified',
      });
      try {
        await getVisitRepo().update(
          { id: parseInt(visitId, 10) },
          { phone: phone.trim() },
        );
      } catch {
        // swallow
      }
    }

    return {
      message: 'OTP verified successfully',
      phone,
      verified: true,
    };
  };

  return {
    generateOtp,
    sendOtp,
    verifyOtp,
    isRateLimited,
    isBruteForceAttempt,
  };
};

export const otpService = createOtpService();
