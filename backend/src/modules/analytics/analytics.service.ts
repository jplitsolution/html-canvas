import { Injectable, ForbiddenException, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Like, In } from 'typeorm';
import { Visit, VisitStatus } from './entities/visit.entity';
import { VisitEvent, VisitEventType } from './entities/visit-event.entity';
import { CampaignAnalyticsDto } from './dto/campaign-analytics.dto';
import { CampaignsService } from '../campaigns/campaigns.service';
import { OtpRequest } from '../otp/entities/otp-request.entity';
import { SearchService } from '../search/search.service';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly flushIntervalMs = 5000;

  constructor(
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    @InjectRepository(VisitEvent)
    private readonly visitEventRepository: Repository<VisitEvent>,
    private readonly campaignsService: CampaignsService,
    private readonly searchService: SearchService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    this.flushInterval = setInterval(() => this.flushEvents(), this.flushIntervalMs);
  }

  async onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushEvents();
  }

  async flushEvents() {
    const redisClient = this.redis.getClient();
    if (!redisClient) return;

    const lockKey = 'lock:analytics:flushEvents';
    // Acquire a lock that expires in 4 seconds
    const acquired = await redisClient.set(lockKey, 'locked', 'EX', 4, 'NX');
    if (!acquired) return;

    try {
      const batchSize = 100;
      // Fetch up to 100 events. If Redis < 6.2, we would need a Lua script, 
      // but LPOP with count is supported in modern Redis.
      const rawEvents = await redisClient.lpop('analytics:event_queue', batchSize);
      
      if (!rawEvents || !Array.isArray(rawEvents) || rawEvents.length === 0) return;

      const eventsToInsert = rawEvents.map((raw: string) => {
        try {
          // Cast JSON.parse to 'object' to force the single entity signature of create()
          return this.visitEventRepository.create(JSON.parse(raw) as object);
        } catch {
          return null;
        }
      }).filter(e => e !== null) as VisitEvent[];

      if (eventsToInsert.length > 0) {
        await this.visitEventRepository.insert(eventsToInsert);
        this.logger.log(`Successfully flushed ${eventsToInsert.length} telemetry events from Redis to Postgres.`);
      }
    } catch (err) {
      this.logger.error(`Failed to flush telemetry events to Postgres: ${(err as Error).message}`);
      // Note: If insert fails, events are lost unless we put them back. In highly reliable systems,
      // a two-queue system (processing list) is used.
    } finally {
      await redisClient.del(lockKey);
    }
  }

  private maskPhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    const trimmed = phone.trim();
    if (trimmed.length <= 4) return '****';
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-2)}`;
  }

  /** Best-effort: index a funnel event into Elasticsearch. Never throws. */
  private async indexVisitEvent(
    visitId: number,
    eventType: VisitEventType | string,
    status?: string,
  ): Promise<void> {
    if (!this.searchService.isEnabled()) return;
    try {
      const cacheKey = `analytics:visit:${visitId}`;
      let visit = await this.redis.get<Visit>(cacheKey);
      if (!visit) {
        visit = await this.visitRepository.findOne({
          where: { id: visitId },
        });
        if (visit) {
          await this.redis.set(cacheKey, visit, 10);
        }
      }
      if (!visit) return;
      await this.searchService.indexEvent({
        campaignId: visit.campaignId,
        visitId: visit.id,
        vendorId: visit.vendorId,
        affiliateId: visit.affiliateId,
        clickId: visit.clickId,
        vidRaw: visit.vidRaw,
        affRaw: visit.affRaw,
        phoneMasked: this.maskPhone(visit.phone),
        country: visit.country,
        operator: visit.operator,
        pageType: visit.pageType,
        eventType: String(eventType),
        status: status || visit.visitStatus,
        ip: visit.ipAddress,
        userAgent: visit.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // swallow — indexing must never affect the funnel
    }
  }

  async createVisit(data: Partial<Visit>): Promise<Visit> {
    const visit = this.visitRepository.create(data);
    const saved = await this.visitRepository.save(visit);
    // Cache the visit metadata right after creation since it's going to be queried immediately
    await this.redis.set(`analytics:visit:${saved.id}`, saved, 10);
    await this.logEvent(saved.id, VisitEventType.VISIT);
    return saved;
  }

  async getVisit(id: number): Promise<Visit | null> {
    if (!id) return null;
    const cached = await this.redis.get<Visit>(`analytics:visit:${id}`);
    if (cached) return cached;
    const visit = await this.visitRepository.findOne({ where: { id } });
    if (visit) await this.redis.set(`analytics:visit:${id}`, visit, 10);
    return visit;
  }

  async updateVisit(
    id: number,
    status: VisitStatus,
    pageType?: string,
    phone?: string,
  ): Promise<Visit> {
    const visit = await this.visitRepository.findOne({ where: { id } });
    if (!visit) return null as any;

    visit.visitStatus = status;
    if (pageType) {
      visit.pageType = pageType;
    }
    if (phone && phone.trim() !== '') {
      visit.phone = phone.trim();
    }

    const saved = await this.visitRepository.save(visit);
    // Invalidate/update visitCache with updated details
    await this.redis.set(`analytics:visit:${id}`, saved, 10);
    return saved;
  }

  async setVisitPhone(id: number, phone?: string): Promise<void> {
    const cleanPhone = phone?.trim();
    if (!cleanPhone) return;
    await this.visitRepository.update({ id }, { phone: cleanPhone });
    // Update Redis visit cache
    const visit = await this.redis.get<Visit>(`analytics:visit:${id}`);
    if (visit) {
      visit.phone = cleanPhone;
      await this.redis.set(`analytics:visit:${id}`, visit, 10);
    }
  }

  async logEvent(
    visitId: number,
    eventType: VisitEventType,
    metadata?: any,
  ): Promise<any> {
    const eventPayload = { visitId, eventType, metadata };
    const redisClient = this.redis.getClient();
    
    if (redisClient) {
      await redisClient.rpush('analytics:event_queue', JSON.stringify(eventPayload));
    } else {
      // Fallback if Redis is down
      const event = this.visitEventRepository.create(eventPayload);
      await this.visitEventRepository.insert(event).catch(() => {});
    }
    // Best-effort mirror into Elasticsearch for fast log search/analytics.
    void this.indexVisitEvent(visitId, eventType);
    return eventPayload;
  }

  async getCampaignAnalytics(
    campaignId: number,
    userId: number,
  ): Promise<CampaignAnalyticsDto> {
    await this.campaignsService.findOne(campaignId, userId);

    const totalVisits = await this.visitRepository.count({
      where: { campaignId },
    });
    const blockedUsers = await this.visitRepository.count({
      where: { campaignId, visitStatus: VisitStatus.BLOCKED },
    });
    const subscribedUsers = await this.visitRepository.count({
      where: { campaignId, visitStatus: VisitStatus.SUBSCRIBED },
    });
    const successfulSubscriptions = await this.visitRepository.count({
      where: { campaignId, visitStatus: VisitStatus.SUCCESS },
    });
    const failedSubscriptions = await this.visitRepository.count({
      where: { campaignId, visitStatus: VisitStatus.FAILED },
    });

    const blockedRequests = await this.visitEventRepository.count({
      where: {
        eventType: VisitEventType.BLOCKED_REQUEST,
        visit: { campaignId },
      },
      relations: { visit: true },
    });

    const rateLimitHits = await this.visitEventRepository.count({
      where: {
        eventType: VisitEventType.RATE_LIMIT_HIT,
        visit: { campaignId },
      },
      relations: { visit: true },
    });

    const bruteForceAttempts = await this.visitEventRepository.count({
      where: {
        eventType: VisitEventType.BRUTE_FORCE_ATTEMPT,
        visit: { campaignId },
      },
      relations: { visit: true },
    });

    const conversionRate =
      totalVisits > 0
        ? parseFloat(((successfulSubscriptions / totalVisits) * 100).toFixed(2))
        : 0;

    return {
      totalVisits,
      blockedUsers,
      subscribedUsers,
      successfulSubscriptions,
      failedSubscriptions,
      conversionRate,
      blockedRequests,
      rateLimitHits,
      bruteForceAttempts,
    };
  }

  async getCampaignActivityLogs(
    campaignId: number,
    userId: number,
    query: { page?: number; limit?: number; phone?: string; status?: string },
  ) {
    await this.campaignsService.findOne(campaignId, userId);

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { campaignId };

    if (query.phone && query.phone.trim() !== '') {
      where.phone = Like(`%${query.phone.trim()}%`);
    }

    if (query.status && query.status.trim() !== '' && query.status !== 'all') {
      where.visitStatus = query.status;
    }

    const [data, total] = await this.visitRepository.findAndCount({
      where,
      relations: { events: true },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip,
    });

    // Sort events for each visit chronologically by createdAt (ASC)
    data.forEach((visit) => {
      if (visit.events) {
        visit.events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    });

    const visitsMissingPhone = data.filter((visit) => !visit.phone);
    if (visitsMissingPhone.length > 0) {
      const visitIds = visitsMissingPhone.map((visit) => visit.id);
      const otpRequests = await this.visitRepository.manager
        .getRepository(OtpRequest)
        .find({
          where: { visitId: In(visitIds) },
          select: { visitId: true, phone: true, createdAt: true },
          order: { createdAt: 'DESC' },
        });

      const phoneByVisitId = new Map<number, string>();
      otpRequests.forEach((request) => {
        if (
          request.visitId &&
          request.phone &&
          !phoneByVisitId.has(request.visitId)
        ) {
          phoneByVisitId.set(request.visitId, request.phone);
        }
      });

      visitsMissingPhone.forEach((visit) => {
        const resolvedPhone = phoneByVisitId.get(visit.id);
        if (resolvedPhone) {
          visit.phone = resolvedPhone;
        }
      });
    }

    const enrichedData = data.map((visit) => ({
      ...visit,
      pagePath: this.derivePagePath(visit),
    }));

    return {
      data: enrichedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private derivePagePath(visit: Visit): string[] {
    const eventToPage: Partial<Record<VisitEventType, string>> = {
      [VisitEventType.VISIT]: 'HOME',
      [VisitEventType.HOME_VIEW]: 'HOME',
      [VisitEventType.OTP_VIEW]: 'OTP',
      [VisitEventType.OTP_SEND]: 'OTP',
      [VisitEventType.OTP_VERIFY]: 'OTP',
      [VisitEventType.CONFIRM_VIEW]: 'CONFIRM',
      [VisitEventType.PLAN_VIEW]: 'CONFIRM',
      [VisitEventType.SUBSCRIBE_SUCCESS]: 'THANKYOU',
      [VisitEventType.SUBSCRIBE_FAILED]: 'ERROR',
      [VisitEventType.BLOCKED]: 'BLOCKED',
    };

    const pages: string[] = [];
    for (const event of visit.events || []) {
      const page = eventToPage[event.eventType];
      if (page && pages[pages.length - 1] !== page) {
        pages.push(page);
      }
    }

    const finalPage = visit.pageType || 'HOME';
    if (pages.length === 0 || pages[pages.length - 1] !== finalPage) {
      pages.push(finalPage);
    }

    return pages;
  }
}

