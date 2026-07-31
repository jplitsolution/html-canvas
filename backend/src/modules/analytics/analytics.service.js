import * as fs from 'fs/promises';
import * as path from 'path';
import { Like } from 'typeorm';
import { getRepository } from '../../database/index.js';
import { Visit, VisitStatus } from './entities/visit.entity.js';
import { VisitEvent, VisitEventType } from './entities/visit-event.entity.js';
import { ApiCallLog } from '../flow/entities/api-call-log.entity.js';
import { campaignsService } from '../campaigns/campaigns.service.js';
import { searchService } from '../search/search.service.js';
import getConfig from '../../config/configuration.js';

export const createAnalyticsService = () => {
  const getVisitRepo = () => getRepository(Visit);
  const getVisitEventRepo = () => getRepository(VisitEvent);
  const getApiCallLogRepo = () => getRepository(ApiCallLog);

  const parseJsonSafe = (value) => {
    if (value == null || value === '') return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const checksubStatusLabel = (body, success) => {
    const nested = body?.data ?? body ?? {};
    const current = String(nested.currentStatus || '')
      .trim()
      .toLowerCase();
    const sub = String(nested.subscriptionStatus || '')
      .trim()
      .toLowerCase();
    // Prefer partner body (covers older logs that wrongly stored success=false for "new")
    if (current === 'active' || sub === 'active') return 'ACTIVE';
    if (current) return current.toUpperCase();
    if (sub) return sub.toUpperCase();
    const code = body?.responseCode;
    if (code === '0' || code === 0) return 'SUCCESS';
    if (success === false) return 'FAILED';
    return success ? 'SUCCESS' : 'FAILED';
  };

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
        rcid: visit.rcid,
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
    const retentionDays = config.archiveRetentionDays || 30;
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

  const getVisitDetail = async (visitId, userId) => {
    const id = parseInt(visitId, 10);
    if (!id) {
      const err = new Error('Invalid visit id');
      err.statusCode = 400;
      throw err;
    }

    const visit = await getVisitRepo().findOne({
      where: { id },
      relations: { events: true },
    });
    if (!visit) {
      const err = new Error('Visit not found');
      err.statusCode = 404;
      throw err;
    }

    let campaignName = null;
    if (visit.campaignId) {
      const campaign = await campaignsService.findOne(
        visit.campaignId,
        userId,
      );
      campaignName = campaign?.name || null;
    } else {
      const err = new Error('Visit not found');
      err.statusCode = 404;
      throw err;
    }

    if (visit.events) {
      visit.events.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
    }

    const apiLogs = await getApiCallLogRepo().find({
      where: { visitId: id },
      order: { createdAt: 'ASC' },
    });

    const apiCalls = apiLogs.map((row) => {
      const responseBody = parseJsonSafe(row.responseBody);
      const requestBody = parseJsonSafe(row.requestBody);
      const nested = responseBody?.data ?? responseBody ?? {};
      let statusLabel =
        row.success === false
          ? 'FAILED'
          : row.success
            ? 'SUCCESS'
            : null;
      if (row.callType === 'checksub') {
        statusLabel = checksubStatusLabel(responseBody, row.success);
      }
      return {
        id: row.id,
        callType: row.callType,
        eventType: `API_${String(row.callType || '').toUpperCase()}`,
        requestUrl: row.requestUrl,
        requestBody,
        responseStatus: row.responseStatus,
        responseBody,
        success: row.success,
        statusLabel,
        errorMessage: row.errorMessage,
        msisdn: maskPhone(row.msisdn),
        clickId: row.clickId,
        rcid: row.rcid,
        createdAt: row.createdAt,
        summary:
          row.callType === 'checksub'
            ? {
                currentStatus: nested.currentStatus ?? null,
                subscriptionStatus: nested.subscriptionStatus ?? null,
                serviceId: nested.serviceId ?? null,
                responseCode: responseBody?.responseCode ?? null,
                responseMessage: responseBody?.responseMessage ?? null,
              }
            : null,
      };
    });

    const events = (visit.events || []).map((e) => ({
      id: e.id,
      eventType: e.eventType,
      metadata: e.metadata || null,
      createdAt: e.createdAt,
      kind: 'event',
    }));

    const timeline = [
      ...events,
      ...apiCalls.map((c) => ({
        id: `api-${c.id}`,
        eventType: c.eventType,
        metadata: {
          callType: c.callType,
          statusLabel: c.statusLabel,
          summary: c.summary,
          responseStatus: c.responseStatus,
          requestUrl: c.requestUrl,
        },
        createdAt: c.createdAt,
        kind: 'api',
        apiCallId: c.id,
      })),
    ].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    return {
      visit: {
        id: visit.id,
        campaignId: visit.campaignId,
        campaignName,
        phoneMasked: maskPhone(visit.phone),
        country: visit.country,
        operator: visit.operator,
        pageType: visit.pageType,
        visitStatus: visit.visitStatus,
        clickId: visit.clickId,
        rcid: visit.rcid,
        vidRaw: visit.vidRaw,
        affRaw: visit.affRaw,
        vendorId: visit.vendorId,
        affiliateId: visit.affiliateId,
        ipAddress: visit.ipAddress,
        userAgent: visit.userAgent,
        createdAt: visit.createdAt,
        updatedAt: visit.updatedAt,
      },
      events,
      apiCalls,
      timeline,
      pagePath: derivePagePath(visit),
    };
  };

  return {
    maskPhone,
    indexVisitEvent,
    createVisit,
    getVisit,
    getVisitDetail,
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
