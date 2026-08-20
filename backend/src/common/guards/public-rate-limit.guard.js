import { getRepository } from '../../database/index.js';
import {
  VisitEvent,
  VisitEventType,
} from '../../database/entities/visit-event.entity.js';

const ipStore = new Map();

const getLimitForPath = (path) => {
  if (path.includes('/otp/send')) return 5;
  if (path.includes('/otp/verify')) return 10;
  if (path.includes('/flow/dcb/status')) return 60;
  if (
    path.includes('/flow/dcb/pincode') ||
    path.includes('/flow/dcb/confirm') ||
    path.includes('/flow/dcb/manual-check')
  ) {
    return 10;
  }
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

      if (String(path).includes('/callback')) {
        try {
          const { appendPostbackHitSafe } =
            await import('../../modules/partners/helpers/postback-day-report-file.js');
          await appendPostbackHitSafe({
            callType: 'billing_callback',
            requestUrl: path.split('?')[0] || '/api/flow/callback',
            requestBody: JSON.stringify({
              query: req.query || {},
              skipped: true,
              reason: 'rate limited',
            }),
            success: false,
            statusLabel: 'SKIPPED',
            errorMessage: 'rate limited',
            query: req.query || {},
            reason: 'rate limited',
            createdAt: new Date(),
          });
        } catch (err) {
          console.warn(
            `callback rate-limit hit file write failed: ${err.message}`,
          );
        }
      }

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
