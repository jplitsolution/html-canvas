import { getRepository } from '../../database/index.js';
import {
  VisitEvent,
  VisitEventType,
} from '../../modules/analytics/entities/visit-event.entity.js';

const ipStore = new Map();

const getLimitForPath = (path) => {
  if (path.includes('/otp/send')) return 5;
  if (path.includes('/otp/verify')) return 10;
  if (path.includes('/flow/transition')) return 20;
  return 20;
};

/**
 * Lightweight in-memory IP rate limiter for public OTP/flow endpoints.
 * Use as a Fastify preHandler.
 */
export const publicRateLimit = async (request, reply) => {
  const ip = String(
    request.headers['x-forwarded-for'] ||
      request.socket?.remoteAddress ||
      'unknown',
  )
    .split(',')[0]
    .trim();
  const path = request.url || '';
  const limit = getLimitForPath(path);
  const ttlMs = 60 * 1000;
  const key = `${ip}:${path.split('?')[0]}`;
  const now = Date.now();
  const record = ipStore.get(key);

  if (!record || now > record.resetTime) {
    ipStore.set(key, { count: 1, resetTime: now + ttlMs });
    return;
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    reply.header('Retry-After', String(retryAfter));

    const visitId = request.body?.visitId || request.query?.visitId;
    if (visitId) {
      try {
        const repo = getRepository(VisitEvent);
        await repo.insert([
          {
            visitId: Number(visitId),
            eventType: VisitEventType.RATE_LIMIT_HIT,
            metadata: { ip, path, limit, retryAfter },
          },
          {
            visitId: Number(visitId),
            eventType: VisitEventType.BLOCKED_REQUEST,
            metadata: { ip, path, reason: 'IP Rate Limit Exceeded' },
          },
        ]);
      } catch (err) {
        console.warn(`Failed to log rate limit event: ${err.message}`);
      }
    }

    return reply.status(429).send({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many requests. Please try again later.',
    });
  }

  record.count += 1;
};
