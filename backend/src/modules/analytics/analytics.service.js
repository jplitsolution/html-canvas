import * as fs from 'fs/promises';
import * as path from 'path';
import { Like, In } from 'typeorm';
import { getRepository } from '../../database/index.js';
import { Visit, VisitStatus } from './entities/visit.entity.js';
import { VisitEvent, VisitEventType } from './entities/visit-event.entity.js';
import { campaignsService } from '../campaigns/campaigns.service.js';
import { OtpRequest } from '../otp/entities/otp-request.entity.js';
import { searchService } from '../search/search.service.js';
import getConfig from '../../config/configuration.js';

export const createAnalyticsService = () => {
  const getVisitRepo = () => getRepository(Visit);
  const getVisitEventRepo = () => getRepository(VisitEvent);

  const maskPhone = (phone) => {
    if (!phone) return undefined;
    const trimmed = phone.trim();
    if (trimmed.length <= 4) return '****';
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-2)}`;
  };

  const indexVisitEvent = async (visitId, eventType, status) => {
    if (!searchService.isEnabled()) return;
    try {
      const visit = await getVisitRepo().findOne({
        where: { id: visitId },
      });
      if (!visit) return;
      await searchService.indexEvent({
        campaignId: visit.campaignId,
        visitId: visit.id,
        vendorId: visit.vendorId,
        affiliateId: visit.affiliateId,
        clickId: visit.clickId,
        vidRaw: visit.vidRaw,
        affRaw: visit.affRaw,
        phoneMasked: maskPhone(visit.phone),
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
  };

  const createVisit = async (data) => {
    const visit = getVisitRepo().create(data);
    const saved = await getVisitRepo().save(visit);
    await logEvent(saved.id, VisitEventType.VISIT);
    return saved;
  };

  const getVisit = async (id) => {
    if (!id) return null;
    return await getVisitRepo().findOne({ where: { id: parseInt(id, 10) } });
  };

  const updateVisit = async (id, status, pageType, phone) => {
    const visit = await getVisitRepo().findOne({ where: { id: parseInt(id, 10) } });
    if (!visit) return null;

    visit.visitStatus = status;
    if (pageType) {
      visit.pageType = pageType;
    }
    if (phone && phone.trim() !== '') {
      visit.phone = phone.trim();
    }

    const saved = await getVisitRepo().save(visit);
    return saved;
  };

  const setVisitPhone = async (id, phone) => {
    const cleanPhone = phone?.trim();
    if (!cleanPhone) return;
    await getVisitRepo().update({ id: parseInt(id, 10) }, { phone: cleanPhone });
  };

  const logEvent = async (visitId, eventType, metadata) => {
    const eventPayload = { visitId, eventType, metadata };

    const eventEntity = getVisitEventRepo().create({
      visitId,
      eventType,
      metadata,
    });
    await getVisitEventRepo().insert(eventEntity);

    void indexVisitEvent(visitId, eventType);
    return eventPayload;
  };

  const getCampaignAnalytics = async (campaignId, userId) => {
    await campaignsService.findOne(campaignId, userId);
    const cId = parseInt(campaignId, 10);

    const totalVisits = await getVisitRepo().count({
      where: { campaignId: cId },
    });
    const blockedUsers = await getVisitRepo().count({
      where: { campaignId: cId, visitStatus: VisitStatus.BLOCKED },
    });
    const subscribedUsers = await getVisitRepo().count({
      where: { campaignId: cId, visitStatus: VisitStatus.SUBSCRIBED },
    });
    const successfulSubscriptions = await getVisitRepo().count({
      where: { campaignId: cId, visitStatus: VisitStatus.SUCCESS },
    });
    const failedSubscriptions = await getVisitRepo().count({
      where: { campaignId: cId, visitStatus: VisitStatus.FAILED },
    });

    const blockedRequests = await getVisitEventRepo().count({
      where: {
        eventType: VisitEventType.BLOCKED_REQUEST,
        visit: { campaignId: cId },
      },
      relations: { visit: true },
    });

    const rateLimitHits = await getVisitEventRepo().count({
      where: {
        eventType: VisitEventType.RATE_LIMIT_HIT,
        visit: { campaignId: cId },
      },
      relations: { visit: true },
    });

    const bruteForceAttempts = await getVisitEventRepo().count({
      where: {
        eventType: VisitEventType.BRUTE_FORCE_ATTEMPT,
        visit: { campaignId: cId },
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
  };

  const derivePagePath = (visit) => {
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
  };

  const getCampaignActivityLogs = async (campaignId, userId, query) => {
    await campaignsService.findOne(campaignId, userId);
    const cId = parseInt(campaignId, 10);

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = { campaignId: cId };

    if (query.phone && query.phone.trim() !== '') {
      where.phone = Like(`%${query.phone.trim()}%`);
    }

    if (query.status && query.status.trim() !== '' && query.status !== 'all') {
      where.visitStatus = query.status;
    }

    const [data, total] = await getVisitRepo().findAndCount({
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
      const otpRequests = await getRepository(OtpRequest).find({
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
      pagePath: derivePagePath(visit),
    }));

    return {
      data: enrichedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  };

  const archiveOldData = async () => {
    const config = getConfig();
    const retentionDays = config.ARCHIVE_RETENTION_DAYS || 30;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - retentionDays);

    const archivesDir = path.join(process.cwd(), 'archives');
    try {
      await fs.mkdir(archivesDir, { recursive: true });
    } catch (err) {
      console.error(`Failed to create archives directory: ${err.message}`);
      return;
    }

    const timestampStr = new Date().toISOString().split('T')[0];
    const eventsFile = path.join(
      archivesDir,
      `visit_events_${timestampStr}.jsonl`,
    );
    const visitsFile = path.join(archivesDir, `visits_${timestampStr}.jsonl`);

    let eventsArchived = 0;
    let visitsArchived = 0;

    try {
      const qbEvents = getVisitEventRepo()
        .createQueryBuilder('ve')
        .where('ve.createdAt < :date', { date: thresholdDate });

      const oldEvents = await qbEvents.getMany();
      if (oldEvents.length > 0) {
        const lines = oldEvents.map((e) => JSON.stringify(e)).join('\n') + '\n';
        await fs.appendFile(eventsFile, lines, 'utf8');
        eventsArchived = oldEvents.length;

        const ids = oldEvents.map((e) => e.id);
        for (let i = 0; i < ids.length; i += 1000) {
          const batch = ids.slice(i, i + 1000);
          await getVisitEventRepo().delete(batch);
        }
      }
    } catch (err) {
      console.error(`Error archiving visit events: ${err.message}`);
    }

    try {
      const qbVisits = getVisitRepo()
        .createQueryBuilder('v')
        .where('v.createdAt < :date', { date: thresholdDate });

      const oldVisits = await qbVisits.getMany();
      if (oldVisits.length > 0) {
        const lines = oldVisits.map((v) => JSON.stringify(v)).join('\n') + '\n';
        await fs.appendFile(visitsFile, lines, 'utf8');
        visitsArchived = oldVisits.length;

        const ids = oldVisits.map((v) => v.id);
        for (let i = 0; i < ids.length; i += 1000) {
          const batch = ids.slice(i, i + 1000);
          await getVisitRepo().delete(batch);
        }
      }
    } catch (err) {
      console.error(`Error archiving visits: ${err.message}`);
    }
  };

  return {
    maskPhone,
    indexVisitEvent,
    createVisit,
    getVisit,
    updateVisit,
    setVisitPhone,
    logEvent,
    getCampaignAnalytics,
    getCampaignActivityLogs,
    derivePagePath,
    archiveOldData,
  };
};

export const analyticsService = createAnalyticsService();
