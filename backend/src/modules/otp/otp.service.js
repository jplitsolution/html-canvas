import { getRepository } from '../../database/index.js';
import { ApiConfig } from '../../database/entities/api-config.entity.js';
import { Campaign } from '../../database/entities/campaign.entity.js';
import { Visit } from '../../database/entities/visit.entity.js';
import { VisitEvent, VisitEventType } from '../../database/entities/visit-event.entity.js';
import { smsProviderManager } from './providers/sms-provider.manager.js';
import { redisService } from '../../common/services/redis.service.js';

/**
 * Partner-API OTP only.
 * We do NOT generate/store OTP codes (no Twilio, no otp_requests table).
 * Partner send/verify APIs own the OTP; we only mark the visit as verified.
 */
export const createOtpService = () => {
  const getApiConfigRepo = () => getRepository(ApiConfig);
  const getCampaignRepo = () => getRepository(Campaign);
  const getVisitRepo = () => getRepository(Visit);
  const getVisitEventRepo = () => getRepository(VisitEvent);

  const pendingKey = (visitId, phone) =>
    `otp:pending:${visitId || 'none'}:${String(phone).trim()}`;

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

    const campaign = await getCampaignFromInput(campaignId, visitId);
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
      await logOtpEvent(visitId, VisitEventType.OTP_SEND, {
        phone: String(phone).trim(),
        campaignId: campaign?.id,
        provider: 'partner',
        responseCode: sendResult.responseCode,
      });
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

    const campaign = await getCampaignFromInput(campaignId, visitId);
    const apiConfig = await getApiConfigForCampaign(campaign?.id);
    const { providerConfig, provider } = smsProviderManager.getProvider(apiConfig);

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
      await logOtpEvent(vId, VisitEventType.OTP_VERIFY, {
        phone: String(phone).trim(),
        status: 'verified',
        provider: 'partner',
        responseCode: verifyResult.responseCode,
      });
    }

    return {
      message: verifyResult.message || 'OTP verified successfully',
      phone: String(phone).trim(),
      verified: true,
      responseCode: verifyResult.responseCode ?? null,
    };
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
    isRateLimited,
    isBruteForceAttempt,
    isVisitOtpVerified,
  };
};

export const otpService = createOtpService();
