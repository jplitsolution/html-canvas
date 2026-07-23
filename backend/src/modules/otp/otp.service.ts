import { BadRequestException, Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { IsNull, MoreThan, Repository, MoreThanOrEqual } from 'typeorm';
import { OtpRequest } from './entities/otp-request.entity';
import { ApiConfig } from '../api-config/entities/api-config.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Visit } from '../analytics/entities/visit.entity';
import { SmsProviderManager } from './providers/sms-provider.manager';
import { VisitEvent, VisitEventType } from '../analytics/entities/visit-event.entity';
import { RedisService } from '../../common/services/redis.service';

interface ProviderMetric {
  successCount: number;
  failureCount: number;
  failureStreak: number;
  trippedUntil: number;
  latencies: number[];
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes
  private readonly maxAttempts = 5;

  private static providerMetrics = new Map<string, ProviderMetric>();

  private getProviderMetrics(providerName: string): ProviderMetric {
    let metrics = OtpService.providerMetrics.get(providerName);
    if (!metrics) {
      metrics = {
        successCount: 0,
        failureCount: 0,
        failureStreak: 0,
        trippedUntil: 0,
        latencies: [],
      };
      OtpService.providerMetrics.set(providerName, metrics);
    }
    return metrics;
  }

  static getProviderHealthStatus() {
    const list: any[] = [];
    OtpService.providerMetrics.forEach((metrics, provider) => {
      const avgLatency = metrics.latencies.length > 0
        ? parseFloat((metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length).toFixed(1))
        : 0;
      const total = metrics.successCount + metrics.failureCount;
      const successRate = total > 0 ? parseFloat(((metrics.successCount / total) * 100).toFixed(1)) : 100;
      
      list.push({
        provider,
        tripped: Date.now() < metrics.trippedUntil,
        trippedUntil: metrics.trippedUntil > 0 ? new Date(metrics.trippedUntil).toISOString() : null,
        avgLatencyMs: avgLatency,
        successRate,
        totalRequests: total,
      });
    });
    return list;
  }

  constructor(
    @InjectRepository(OtpRequest)
    private readonly otpRepository: Repository<OtpRequest>,
    @InjectRepository(ApiConfig)
    private readonly apiConfigRepository: Repository<ApiConfig>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    @InjectRepository(VisitEvent)
    private readonly visitEventRepository: Repository<VisitEvent>,
    private readonly providerManager: SmsProviderManager,
    private readonly redisService: RedisService,
  ) {}

  private hashOtp(otp: string, salt: string) {
    return crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');
  }

  private async logVisitEvent(visitId: number, eventType: VisitEventType, metadata?: any) {
    try {
      const event = this.visitEventRepository.create({
        visitId,
        eventType,
        metadata,
      });
      await this.visitEventRepository.save(event);
    } catch (e) {
      this.logger.error(`Failed to log visit event ${eventType} for visit ${visitId}: ${e.message}`);
    }
  }

  static getCorrectedElapsedMs(date: Date): number {
    const rawElapsed = Date.now() - date.getTime();
    if (Math.abs(rawElapsed) < 30 * 60 * 1000) {
      return rawElapsed;
    }
    const tzOffset = new Date().getTimezoneOffset() * 60 * 1000;
    if (Math.abs(rawElapsed - tzOffset) < 30 * 60 * 1000) {
      return rawElapsed - tzOffset;
    } else if (Math.abs(rawElapsed + tzOffset) < 30 * 60 * 1000) {
      return rawElapsed + tzOffset;
    }
    return rawElapsed;
  }

  async generate(
    phone: string,
    visitId?: string | number | null,
    testOverride?: { provider: string; config: any; campaignId?: number },
    pack?: string,
  ) {
    const cleanPhone = String(phone).trim();

    // 0. Temporary Lockout Guard (Redis)
    const lockoutKey = `otp:lockout:${cleanPhone}`;
    const isLocked = await this.redisService.get(lockoutKey);
    if (isLocked) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many verification attempts. Lockout in progress. Try again later.`,
          error: 'Too Many Requests',
          retryAfter: 900,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 1. Resend Delay Guard (Redis)
    const delayKey = `otp:delay:${cleanPhone}`;
    const delayActive = await this.redisService.get(delayKey);
    if (delayActive) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Please wait 30 seconds before requesting another OTP',
          error: 'Too Many Requests',
          retryAfter: 30,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Request Rate Limit Guard (Max 5 requests per 10 minutes)
    const countKey = `otp:req_count:${cleanPhone}`;
    const currentCount = await this.redisService.incr(countKey, 10 * 60);
    if (currentCount > 5) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many OTP requests. Please try again later.',
          error: 'Too Many Requests',
          retryAfter: 10 * 60,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Set Resend Delay Lock (30s)
    await this.redisService.set(delayKey, '1', 30);

    // 3. Resolve configurations
    let campaignId: number | null = testOverride?.campaignId ?? null;
    let campaignName = 'Test Campaign';
    let providerName = testOverride?.provider ?? 'local';
    let providerConfig: any = testOverride?.config ?? null;

    if (!testOverride && visitId) {
      const visit = await this.visitRepository.findOne({ where: { id: Number(visitId) } });
      if (visit && visit.campaignId) {
        campaignId = visit.campaignId;
        const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
        if (campaign) {
          campaignName = campaign.name;
          const apiConfig = await this.apiConfigRepository.findOne({ where: { campaignId } });
          if (apiConfig) {
            providerName = apiConfig.otpProvider || 'local';
            if (apiConfig.otpConfigJson) {
              try {
                providerConfig = JSON.parse(apiConfig.otpConfigJson);
              } catch (e) {
                this.logger.error(`Failed to parse OTP config JSON for campaign ${campaignId}`);
              }
            }
          }
        }
      }
    }

    const isPartner = providerName.toLowerCase() === 'partner' || providerName.toLowerCase() === 'partner_api';
    let otp = '';
    let otpHash = 'PARTNER_GENERATED';
    let salt = 'none';

    // Generate local OTP if not Partner Mode
    if (!isPartner) {
      otp = String(Math.floor(100000 + Math.random() * 900000));
      salt = crypto.randomBytes(16).toString('hex');
      otpHash = this.hashOtp(otp, salt);
    }

    const expiresAt = new Date(Date.now() + this.ttlMs);

    const context = {
      campaignId: campaignId || 0,
      campaignName,
      visitId: visitId ? Number(visitId) : null,
      pack: (pack || 'daily').toLowerCase(),
      variables: {
        phone: cleanPhone,
        campaign: campaignName,
      },
    };

    // Resolve candidates
    interface CandidateProvider {
      name: string;
      priority: number;
      retryCount: number;
      timeout: number;
      config: any;
    }

    let candidates: CandidateProvider[] = [];

    if (providerConfig && providerConfig.failover === true && typeof providerConfig.providers === 'object') {
      const providersObj = providerConfig.providers;
      for (const [name, pData] of Object.entries(providersObj)) {
        const data = pData as any;
        candidates.push({
          name,
          priority: typeof data.priority === 'number' ? data.priority : 10,
          retryCount: typeof data.retryCount === 'number' ? data.retryCount : 2,
          timeout: typeof data.timeout === 'number' ? data.timeout : 5000,
          config: data.config || {},
        });
      }
    } else {
      candidates.push({
        name: providerName,
        priority: 1,
        retryCount: 2,
        timeout: 5000,
        config: providerConfig,
      });
    }

    candidates.sort((a, b) => a.priority - b.priority);

    let sendResult: any = null;
    let sentSuccessfully = false;
    let chosenProvider = providerName;

    for (const cand of candidates) {
      const metrics = this.getProviderMetrics(cand.name);
      const nowMs = Date.now();

      if (nowMs < metrics.trippedUntil) {
        this.logger.warn(`Provider ${cand.name} circuit breaker is TRIPPED. Skipping.`);
        if (visitId) {
          try {
            await this.logVisitEvent(Number(visitId), VisitEventType.BLOCKED_REQUEST, {
              provider: cand.name,
              reason: 'Circuit Breaker Tripped',
            });
          } catch {}
        }
        continue;
      }

      const retryLimit = Math.max(1, cand.retryCount);
      let attempt = 0;
      let lastError = '';

      while (attempt < retryLimit && !sentSuccessfully) {
        attempt++;
        const startTime = Date.now();
        this.logger.log(`Attempt ${attempt}/${retryLimit} to send OTP via ${cand.name}`);

        try {
          const providerInstance = this.providerManager.getProvider(cand.name);
          const sendPromise = providerInstance.sendOtp(cleanPhone, otp, cand.config, context);
          
          let timeoutId: any;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Gateway timeout')), cand.timeout);
          });

          const result = await Promise.race([
            sendPromise.then((res) => {
              clearTimeout(timeoutId);
              return res;
            }),
            timeoutPromise,
          ]);

          const latency = Date.now() - startTime;
          metrics.latencies.push(latency);
          if (metrics.latencies.length > 50) metrics.latencies.shift();

          if (result.success) {
            sentSuccessfully = true;
            sendResult = result;
            chosenProvider = cand.name;

            metrics.successCount++;
            metrics.failureStreak = 0;
            metrics.trippedUntil = 0;
            break;
          } else {
            lastError = result.error || 'Provider returned success=false';
          }
        } catch (err: any) {
          lastError = err.message;
        }

        // Failure processing
        metrics.failureCount++;
        metrics.failureStreak++;

        if (metrics.failureStreak >= 3) {
          metrics.trippedUntil = Date.now() + 5 * 60 * 1000;
          this.logger.error(`Tripped circuit breaker for provider ${cand.name}. Tripped for 5m.`);
          if (visitId) {
            try {
              await this.logVisitEvent(Number(visitId), VisitEventType.BLOCKED_REQUEST, {
                provider: cand.name,
                reason: 'Circuit Breaker Tripped on Streak Failure',
              });
            } catch {}
          }
        }

        if (visitId) {
          try {
            await this.logVisitEvent(Number(visitId), VisitEventType.SUBSCRIBE_FAILED, {
              provider: cand.name,
              attempt,
              error: lastError,
            });
          } catch {}
        }
      }

      if (sentSuccessfully) {
        break;
      } else {
        this.logger.warn(`Failed to dispatch via ${cand.name}. Failover to next provider.`);
        if (visitId) {
          try {
            await this.logVisitEvent(Number(visitId), VisitEventType.BLOCKED_REQUEST, {
              failedProvider: cand.name,
              reason: 'Primary Provider Dispatch Failed',
              error: lastError,
            });
          } catch {}
        }
      }
    }

    if (!sentSuccessfully) {
      throw new BadRequestException('All configured OTP gateways failed to deliver message');
    }

    // Save request record — always persist campaign from visit when available
    const resolvedCampaignId =
      campaignId != null && Number(campaignId) > 0
        ? Number(campaignId)
        : null;

    const row = this.otpRepository.create({
      phone: cleanPhone,
      otpSalt: salt,
      otpHash,
      createdAt: new Date(),
      expiresAt,
      visitId: visitId ? Number(visitId) : null,
      campaignId: resolvedCampaignId,
      provider: chosenProvider,
      providerRequestId: sendResult?.providerRequestId || null,
      status: 'sent',
      attempts: 0,
    });
    await this.otpRepository.save(row);

    if (visitId) {
      await this.visitRepository.update(
        { id: Number(visitId) },
        { phone: cleanPhone },
      );
      await this.logVisitEvent(Number(visitId), VisitEventType.OTP_SEND, {
        phone: cleanPhone,
      });
    }

    return {
      otp, // Exposed to caller; controller handles masking/exposing depending on env/provider
      expiresInSec: Math.floor(this.ttlMs / 1000),
    };
  }

  async verify(phone: string, otp: string, visitId?: string | number | null) {
    const cleanPhone = String(phone).trim();
    const cleanOtp = String(otp).trim();
    const now = new Date();

    // 0. Temporary Lockout Guard (Redis)
    const lockoutKey = `otp:lockout:${cleanPhone}`;
    const isLocked = await this.redisService.get(lockoutKey);
    if (isLocked) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many verification attempts. Lockout in progress. Try again later.`,
          error: 'Too Many Requests',
          retryAfter: 900,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const active = await this.otpRepository.findOne({
      where: { phone: cleanPhone, status: 'sent', verifiedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!active) {
      throw new BadRequestException('No active OTP request found for this phone number.');
    }

    const elapsedMs = OtpService.getCorrectedElapsedMs(active.createdAt);
    if (elapsedMs > this.ttlMs) {
      active.status = 'failed';
      await this.otpRepository.save(active);
      throw new BadRequestException('OTP has expired.');
    }

    if (active.attempts >= this.maxAttempts) {
      active.status = 'failed';
      await this.otpRepository.save(active);
      await this.redisService.set(lockoutKey, '1', 15 * 60);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many verification attempts. Lockout in progress for 15 minutes.',
          error: 'Too Many Requests',
          retryAfter: 15 * 60,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    active.attempts += 1;

    // Resolve Provider logic for verification
    const providerName = active.provider || 'local';
    const isPartner = providerName.toLowerCase() === 'partner' || providerName.toLowerCase() === 'partner_api';

    if (isPartner) {
      // 1. Telecom Partner Remote Verification
      let providerConfig: any = null;
      if (active.campaignId) {
        const apiConfig = await this.apiConfigRepository.findOne({
          where: { campaignId: active.campaignId },
        });
        if (apiConfig?.otpConfigJson) {
          try {
            providerConfig = JSON.parse(apiConfig.otpConfigJson);
          } catch {}
        }
      }

      const providerInstance = this.providerManager.getProvider(providerName);
      if (!providerInstance.verifyOtp) {
        throw new BadRequestException('Selected partner provider does not support verification.');
      }

      const verifyResult = await providerInstance.verifyOtp(
        cleanPhone,
        cleanOtp,
        active.providerRequestId || '',
        providerConfig,
      );

      if (!verifyResult.success) {
        // Log brute-force attempt
        if (visitId) {
          try {
            await this.visitRepository.manager.getRepository('VisitEvent').save({
              visitId: Number(visitId),
              eventType: VisitEventType.BRUTE_FORCE_ATTEMPT,
              metadata: { phone: cleanPhone, attempts: active.attempts, reason: 'Partner verification failed' },
            });
          } catch {}
        }

        if (active.attempts >= this.maxAttempts) {
          active.status = 'failed';
          await this.otpRepository.save(active);
          await this.redisService.set(lockoutKey, '1', 15 * 60);
          
          if (visitId) {
            try {
              await this.visitRepository.manager.getRepository('VisitEvent').save({
                visitId: Number(visitId),
                eventType: VisitEventType.BLOCKED_REQUEST,
                metadata: { phone: cleanPhone, reason: 'Brute Force Lockout' },
              });
            } catch {}
          }

          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'Too many verification attempts. Lockout in progress for 15 minutes.',
              error: 'Too Many Requests',
              retryAfter: 15 * 60,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        await this.otpRepository.save(active);
        throw new BadRequestException(verifyResult.error || 'Invalid OTP code.');
      }
    } else {
      // 2. Local Cryptographic Hashing Verification
      const expected = active.otpHash;
      const actual = this.hashOtp(cleanOtp, active.otpSalt || '');

      if (actual !== expected) {
        // Log brute-force attempt
        if (visitId) {
          try {
            await this.visitRepository.manager.getRepository('VisitEvent').save({
              visitId: Number(visitId),
              eventType: VisitEventType.BRUTE_FORCE_ATTEMPT,
              metadata: { phone: cleanPhone, attempts: active.attempts, reason: 'OTP hash mismatch' },
            });
          } catch {}
        }

        if (active.attempts >= this.maxAttempts) {
          active.status = 'failed';
          await this.otpRepository.save(active);
          await this.redisService.set(lockoutKey, '1', 15 * 60);

          if (visitId) {
            try {
              await this.visitRepository.manager.getRepository('VisitEvent').save({
                visitId: Number(visitId),
                eventType: VisitEventType.BLOCKED_REQUEST,
                metadata: { phone: cleanPhone, reason: 'Brute Force Lockout' },
              });
            } catch {}
          }

          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'Too many verification attempts. Lockout in progress for 15 minutes.',
              error: 'Too Many Requests',
              retryAfter: 15 * 60,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        await this.otpRepository.save(active);
        throw new BadRequestException('Invalid OTP code.');
      }
    }

    // Mark as successfully verified
    active.status = 'verified';
    active.verifiedAt = now;
    active.usedAt = now; // backward compatibility
    await this.otpRepository.save(active);

    const resolvedVisitId = visitId ? Number(visitId) : active.visitId;
    if (resolvedVisitId) {
      await this.visitRepository.update(
        { id: resolvedVisitId },
        { phone: cleanPhone },
      );
      await this.logVisitEvent(resolvedVisitId, VisitEventType.OTP_VERIFY, {
        phone: cleanPhone,
      });
    }

    return { ok: true };
  }
}
