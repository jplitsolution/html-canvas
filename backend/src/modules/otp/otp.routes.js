import { otpService } from './otp.service.js';
import getConfig from '../../config/configuration.js';
import { publicRateLimit } from '../../common/guards/public-rate-limit.guard.js';

export async function otpRoutes(fastify, options) {
  fastify.post('/send', { preHandler: publicRateLimit }, async (request, reply) => {
    const body = request.body || {};
    const clientIp =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;

    const result = await otpService.sendOtp(
      {
        phone: body.phone,
        campaignId: body.campaignId,
        visitId: body.visitId,
      },
      Array.isArray(clientIp) ? clientIp[0] : clientIp,
    );

    const config = getConfig();
    if (config.environment !== 'production' && result.requestId) {
      const getOtpRepo = (await import('../../database/index.js')).getRepository;
      const OtpRequest = (await import('./entities/otp-request.entity.js')).OtpRequest;
      const saved = await getOtpRepo(OtpRequest).findOne({
        where: { id: result.requestId },
      });
      if (saved) {
        result.devOtpCode = saved.otpCode;
      }
    }

    return result;
  });

  fastify.post('/verify', { preHandler: publicRateLimit }, async (request, reply) => {
    const body = request.body || {};
    const clientIp =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;

    return otpService.verifyOtp(
      {
        phone: body.phone,
        otpCode: body.otpCode,
        visitId: body.visitId,
      },
      Array.isArray(clientIp) ? clientIp[0] : clientIp,
    );
  });
}
