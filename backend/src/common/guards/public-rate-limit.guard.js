import { getRepository } from '../../database/index.js';
import {
  VisitEvent,
  VisitEventType,
} from '../../database/entities/visit-event.entity.js';

const ipStore = new Map();

const getLimitForPath = (path) => {
  if (path.includes('/otp/send')) return 5;
  if (path.includes('/otp/verify')) return 10;
  if (path.includes('/flow/transition')) return 20;
  return 20;
};

/**
 * Lightweight in-memory IP rate limiter for public OTP/flow endpoints.
 * Express middleware: (req, res, next)
 */
export const publicRateLimit = async (req, res, next) => {
  try {
    const ip = String(
      req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
    )
      .split(',')[0]
      .trim();
    const path = req.originalUrl || req.url || '';
    const limit = getLimitForPath(path);
    const ttlMs = 60 * 1000;
    const key = `${ip}:${path.split('?')[0]}`;
    const now = Date.now();
    const record = ipStore.get(key);

    if (!record || now > record.resetTime) {
      ipStore.set(key, { count: 1, resetTime: now + ttlMs });
      return next();
    }

    if (record.count >= limit) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));

      const visitId = req.body?.visitId || req.query?.visitId;
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

      return res.status(429).json({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many requests. Please try again later.',
      });
    }

    record.count += 1;
    return next();
  } catch (err) {
    return next(err);
  }
};
