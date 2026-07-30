import { otpService } from './otp.service.js';
import { publicRateLimit } from '../../common/guards/public-rate-limit.guard.js';
import { smsProviderManager } from './providers/sms-provider.manager.js';
import { getSuccessRule } from './providers/partner.provider.js';

const parseConfigPayload = (body) => {
  if (body?.config && typeof body.config === 'string') {
    try {
      return JSON.parse(body.config);
    } catch {
      return {};
    }
  }
  if (body?.config && typeof body.config === 'object') {
    return body.config;
  }
  return {};
};

export async function otpRoutes(fastify) {
  fastify.post('/send', { preHandler: publicRateLimit }, async (request) => {
    const body = request.body || {};
    const clientIp =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;

    return otpService.sendOtp(
      {
        phone: body.phone,
        campaignId: body.campaignId,
        visitId: body.visitId,
        pack: body.pack,
      },
      Array.isArray(clientIp) ? clientIp[0] : clientIp,
    );
  });

  fastify.post('/verify', { preHandler: publicRateLimit }, async (request) => {
    const body = request.body || {};
    const clientIp =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;

    return otpService.verifyOtp(
      {
        phone: body.phone,
        otpCode: body.otpCode || body.otp,
        otp: body.otp || body.otpCode,
        visitId: body.visitId,
        campaignId: body.campaignId,
      },
      Array.isArray(clientIp) ? clientIp[0] : clientIp,
    );
  });

  fastify.post(
    '/test-send',
    { onRequest: [fastify.authenticate] },
    async (request) => {
      const body = request.body || {};
      const phone = String(body.phone || '').trim();
      if (!phone) {
        const err = new Error('phone is required');
        err.statusCode = 400;
        throw err;
      }

      const providerConfig = parseConfigPayload(body);
      const provider = smsProviderManager.getProviderByName('partner');
      const successRule = getSuccessRule(providerConfig);

      const result = await provider.sendOtp(phone, '', providerConfig, {
        campaignId: body.campaignId,
        campaignName: 'test',
        pack: body.pack || 'daily',
      });

      return {
        sent: Boolean(result?.success),
        ok: Boolean(result?.success),
        provider: 'partner',
        successRule,
        responseCode: result?.responseCode ?? null,
        providerRequestId: result?.providerRequestId ?? null,
        message: result?.message || result?.error || null,
        error: result?.success ? null : result?.error || 'Send failed',
        httpStatus: result?.httpStatus ?? null,
        rawResponse: result?.rawResponse ?? null,
      };
    },
  );

  fastify.post(
    '/test-verify',
    { onRequest: [fastify.authenticate] },
    async (request) => {
      const body = request.body || {};
      const phone = String(body.phone || '').trim();
      const otp = String(body.otp || body.otpCode || '').trim();
      if (!phone || !otp) {
        const err = new Error('phone and otp are required');
        err.statusCode = 400;
        throw err;
      }

      const providerConfig = parseConfigPayload(body);
      const provider = smsProviderManager.getProviderByName('partner');
      const successRule = getSuccessRule(providerConfig);

      const result = await provider.verifyOtp(
        phone,
        otp,
        body.providerRequestId || '',
        providerConfig,
      );

      return {
        verified: Boolean(result?.success),
        ok: Boolean(result?.success),
        provider: 'partner',
        successRule,
        responseCode: result?.responseCode ?? null,
        message: result?.message || result?.error || null,
        error: result?.success ? null : result?.error || 'Verify failed',
        httpStatus: result?.httpStatus ?? null,
        rawResponse: result?.rawResponse ?? null,
      };
    },
  );

  fastify.post(
    '/health-check',
    { onRequest: [fastify.authenticate] },
    async (request) => {
      const body = request.body || {};
      const providerConfig = parseConfigPayload(body);
      const successRule = getSuccessRule(providerConfig);

      const issues = [];
      if (!(providerConfig.sendUrl || providerConfig.send_url || providerConfig.url)) {
        issues.push('sendUrl is missing');
      }
      if (!(providerConfig.verifyUrl || providerConfig.verify_url)) {
        issues.push('verifyUrl is missing');
      }
      if (!successRule.key || successRule.value === '') {
        issues.push('successKey / successValue should be set (e.g. responseCode = 0)');
      }

      return {
        ok: issues.length === 0,
        provider: 'partner',
        successRule,
        error: issues.length ? issues.join('; ') : null,
        message:
          issues.length === 0
            ? `Config looks valid. Success when ${successRule.key}=${successRule.value}`
            : null,
      };
    },
  );
}
