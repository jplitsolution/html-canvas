import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { VisitEventType } from '../../modules/analytics/entities/visit-event.entity';
import type { Request, Response } from 'express';

@Injectable()
export class PublicRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(PublicRateLimitGuard.name);
  private ipStore = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private readonly entityManager: EntityManager,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const ip = String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown');
    const path = request.url;

    // Set configuration limits per route
    let limit = 20; // default 20 requests per minute
    let ttlMs = 60 * 1000; // 1 minute window

    if (path.includes('/otp/send')) {
      limit = 5;
    } else if (path.includes('/otp/verify')) {
      limit = 10;
    } else if (path.includes('/flow/transition')) {
      limit = 20;
    }

    const key = `${ip}:${path}`;
    const now = Date.now();
    const record = this.ipStore.get(key);

    if (!record || now > record.resetTime) {
      this.ipStore.set(key, {
        count: 1,
        resetTime: now + ttlMs,
      });
      return true;
    }

    if (record.count >= limit) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      response.setHeader('Retry-After', String(retryAfter));

      // Log rate limit hit metric to the DB if visitId is present
      const visitId = request.body?.visitId || request.query?.visitId;
      if (visitId) {
        try {
          await this.entityManager.save('VisitEvent', {
            visitId: Number(visitId),
            eventType: VisitEventType.RATE_LIMIT_HIT,
            metadata: { ip, path, limit, retryAfter },
          });
          await this.entityManager.save('VisitEvent', {
            visitId: Number(visitId),
            eventType: VisitEventType.BLOCKED_REQUEST,
            metadata: { ip, path, reason: 'IP Rate Limit Exceeded' },
          });
        } catch (err) {
          this.logger.error(`Failed to log rate limit event: ${(err as Error).message}`);
        }
      }

      this.logger.warn(`IP rate limit exceeded for ${ip} on path ${path}. Limit: ${limit}. Retry-After: ${retryAfter}s`);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }
}
