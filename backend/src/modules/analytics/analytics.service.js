import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Repository, Like, In } from 'typeorm';
import { Visit, VisitStatus } from './entities/visit.entity';
import { VisitEvent, VisitEventType } from './entities/visit-event.entity';
import { CampaignsService } from '../campaigns/campaigns.service';
import { OtpRequest } from '../otp/entities/otp-request.entity';
import { SearchService } from '../search/search.service';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class AnalyticsService {
  logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Visit)
    visitRepository,
    @InjectRepository(VisitEvent)
    visitEventRepository,
    @Inject(CampaignsService)
    campaignsService,
    @Inject(SearchService)
    searchService,
    @InjectQueue('analytics-events')
    analyticsQueue,
    @Inject(ConfigService)
    configService,
  ) {
    this.visitRepository = visitRepository;
    this.visitEventRepository = visitEventRepository;
    this.campaignsService = campaignsService;
    this.searchService = searchService;
    this.analyticsQueue = analyticsQueue;
    this.configService = configService;
  }

  maskPhone(phone) {
    if (!phone) return undefined;
    const trimmed = phone.trim();
    if (trimmed.length <= 4) return '****';
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-2)}`;
  }

  async indexVisitEvent(
    visitId,
    eventType,
    status,
  ) {
    if (!this.searchService.isEnabled()) return;
    try {
      const visit = await this.visitRepository.findOne({
        where: { id: visitId },
      });
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
      // swallow
    }
  }

  async createVisit(data) {
    const visit = this.visitRepository.create(data);
    const saved = await this.visitRepository.save(visit);
    await this.logEvent(saved.id, VisitEventType.VISIT);
    return saved;
  }

  async getVisit(id) {
    if (!id) return null;
    return await this.visitRepository.findOne({ where: { id } });
  }

  async updateVisit(
    id,
    status,
    pageType,
    phone,
  ) {
    const visit = await this.visitRepository.findOne({ where: { id } });
    if (!visit) return null;

    visit.visitStatus = status;
    if (pageType) {
      visit.pageType = pageType;
    }
    if (phone && phone.trim() !== '') {
      visit.phone = phone.trim();
    }

    const saved = await this.visitRepository.save(visit);
    return saved;
  }

  async setVisitPhone(id, phone) {
    const cleanPhone = phone?.trim();
    if (!cleanPhone) return;
    await this.visitRepository.update({ id }, { phone: cleanPhone });
  }

  async logEvent(
    visitId,
    eventType,
    metadata,
  ) {
    const eventPayload = { visitId, eventType, metadata };

    try {
      await this.analyticsQueue.add('process-event', eventPayload, {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
    } catch {
      this.logger.warn('Redis queue failed, falling back to direct DB insert');
      const eventEntity = this.visitEventRepository.create({
        visitId,
        eventType,
        metadata,
      });
      await this.visitEventRepository.insert(eventEntity);
    }

    void this.indexVisitEvent(visitId, eventType);
    return eventPayload;
  }

  async getCampaignAnalytics(
    campaignId,
    userId,
  ) {
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
    campaignId,
    userId,
    query,
  ) {
    await this.campaignsService.findOne(campaignId, userId);

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = { campaignId };

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

    data.forEach((visit) => {
      if (visit.events) {
        visit.events.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
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

      const phoneByVisitId = new Map();
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

  derivePagePath(visit) {
    const eventToPage = {
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

    const pages = [];
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

  async archiveOldData() {
    const retentionDays = this.configService.get('ARCHIVE_RETENTION_DAYS', 30);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - retentionDays);
    
    this.logger.log(`Starting database archiving for data older than ${thresholdDate.toISOString()} (${retentionDays} days)`);

    const archivesDir = path.join(process.cwd(), 'archives');
    try {
      await fs.mkdir(archivesDir, { recursive: true });
    } catch (err) {
      this.logger.error(`Failed to create archives directory: ${err.message}`);
      return;
    }

    const timestampStr = new Date().toISOString().split('T')[0];
    const eventsFile = path.join(archivesDir, `visit_events_${timestampStr}.jsonl`);
    const visitsFile = path.join(archivesDir, `visits_${timestampStr}.jsonl`);

    let eventsArchived = 0;
    let visitsArchived = 0;

    try {
      const qbEvents = this.visitEventRepository.createQueryBuilder('ve')
        .where('ve.createdAt < :date', { date: thresholdDate });
        
      const oldEvents = await qbEvents.getMany();
      if (oldEvents.length > 0) {
        const lines = oldEvents.map(e => JSON.stringify(e)).join('\n') + '\n';
        await fs.appendFile(eventsFile, lines, 'utf8');
        eventsArchived = oldEvents.length;

        const ids = oldEvents.map(e => e.id);
        for (let i = 0; i < ids.length; i += 1000) {
          const batch = ids.slice(i, i + 1000);
          await this.visitEventRepository.delete(batch);
        }
        this.logger.log(`Archived and deleted ${eventsArchived} visit events.`);
      }
    } catch (err) {
      this.logger.error(`Error archiving visit events: ${err.message}`);
    }

    try {
      const qbVisits = this.visitRepository.createQueryBuilder('v')
        .where('v.createdAt < :date', { date: thresholdDate });
        
      const oldVisits = await qbVisits.getMany();
      if (oldVisits.length > 0) {
        const lines = oldVisits.map(v => JSON.stringify(v)).join('\n') + '\n';
        await fs.appendFile(visitsFile, lines, 'utf8');
        visitsArchived = oldVisits.length;

        const ids = oldVisits.map(v => v.id);
        for (let i = 0; i < ids.length; i += 1000) {
          const batch = ids.slice(i, i + 1000);
          await this.visitRepository.delete(batch);
        }
        this.logger.log(`Archived and deleted ${visitsArchived} visits.`);
      }
    } catch (err) {
      this.logger.error(`Error archiving visits: ${err.message}`);
    }

    this.logger.log(`Database archiving completed. Events: ${eventsArchived}, Visits: ${visitsArchived}`);
  }
}
