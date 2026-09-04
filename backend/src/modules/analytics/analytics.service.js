import * as fs from 'fs/promises';
import * as path from 'path';
import { Like } from 'typeorm';
import { getDataSource, getRepository } from '../../database/index.js';
import { Visit, VisitStatus } from '../../database/entities/visit.entity.js';
import { VisitEvent, VisitEventType } from '../../database/entities/visit-event.entity.js';
import { ApiCallLog } from '../../database/entities/api-call-log.entity.js';
import { ConversionPostback, ConversionPostbackStatus } from '../../database/entities/conversion-postback.entity.js';
import { campaignsService } from '../campaigns/campaigns.service.js';
import { searchService } from '../search/search.service.js';
import { flowEngineService } from '../flow/flow-engine.service.js';
import { campaignVendorPerf } from '../otp/helpers/conversion.js';
import getConfig from '../../config/configuration.js';
import { filledTrackingValue } from '../flow/helpers/placeholder-macro.js';
import { resolveRangeBounds } from '../../common/zoned-day.js';

export const createAnalyticsService = () => {
  const getVisitRepo = () => getRepository(Visit);
  const getVisitEventRepo = () => getRepository(VisitEvent);
  const getApiCallLogRepo = () => getRepository(ApiCallLog);
  const getPostbackRepo = () => getRepository(ConversionPostback);

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
    return String(phone).trim();
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
        phone: visit.phone || null,
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
    if (!id || Number.isNaN(Number(id))) return null;
    return await getVisitRepo().findOne({ where: { id: parseInt(id, 10) } });
  };

  /**
   * Reuse visit created by detect-msisdn when /page races in parallel
   * (same campaign + affiliate rcid, recent window).
   */
  /**
   * Reuse visit created by detect-msisdn when /page races in parallel
   * (same campaign + affiliate rcid, recent window).
   * Window uses DB clock (NOW()) so Node/Postgres skew cannot break dedupe.
   */
  const findRecentVisitByRcid = async (campaignId, rcid, withinMs = 120000) => {
    if (!campaignId || Number.isNaN(Number(campaignId))) return null;
    const cId = parseInt(campaignId, 10);
    const key = filledTrackingValue(rcid);
    if (!cId || !key) return null;

    const withinSec = Math.max(1, Math.ceil(Number(withinMs) / 1000) || 120);

    const visit = await getVisitRepo()
      .createQueryBuilder('v')
      .where('v.campaignId = :cId', { cId })
      .andWhere('v.rcid = :key', { key })
      .andWhere(`v.createdAt > NOW() - (:withinSec * INTERVAL '1 second')`, {
        withinSec,
      })
      .orderBy('v.id', 'ASC')
      .getOne();

    return visit || null;
  };

  const updateVisit = async (id, status, pageType, phone) => {
    if (!id || Number.isNaN(Number(id))) return null;
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
    if (!id || Number.isNaN(Number(id))) return;
    const cleanPhone = phone?.trim();
    if (!cleanPhone) return;
    await getVisitRepo().update({ id: parseInt(id, 10) }, { phone: cleanPhone });
  };

  /** Fill vendor campid / our tracking_campid when missing on an existing visit. */
  const ensureVisitCampids = async (id, { campid, trackingCampid } = {}) => {
    const visitId = parseInt(id, 10);
    if (!visitId) return;
    const patch = {};
    const vendor = String(campid || '').trim();
    const tracking = String(trackingCampid || '').trim();
    if (!vendor && !tracking) return;

    const visit = await getVisitRepo().findOne({ where: { id: visitId } });
    if (!visit) return;
    if (vendor && !visit.campid) patch.campid = vendor;
    if (tracking && !visit.trackingCampid) patch.trackingCampid = tracking;
    if (Object.keys(patch).length === 0) return;
    await getVisitRepo().update({ id: visitId }, patch);
  };

  /** Patch attribution fields missing on a visit created by a parallel request. */
  const ensureVisitAttribution = async (
    id,
    { campid, trackingCampid, vidRaw, vendorId } = {},
  ) => {
    const visitId = parseInt(id, 10);
    if (!visitId) return;
    const visit = await getVisitRepo().findOne({ where: { id: visitId } });
    if (!visit) return;
    const patch = {};
    const vendor = String(campid || '').trim();
    const tracking = String(trackingCampid || '').trim();
    const vid = String(vidRaw || '').trim();
    if (vendor && !visit.campid) patch.campid = vendor;
    if (tracking && !visit.trackingCampid) patch.trackingCampid = tracking;
    if (vid && !visit.vidRaw) patch.vidRaw = vid;
    if (vendorId && !visit.vendorId) patch.vendorId = vendorId;
    if (Object.keys(patch).length === 0) return;
    await getVisitRepo().update({ id: visitId }, patch);
  };

  /**
   * Drop a duplicate visit created by parallel detect+/page race.
   * Only removes if it has no meaningful events beyond the auto VISIT.
   */
  const abandonOrphanVisit = async (id) => {
    const visitId = parseInt(id, 10);
    if (!visitId) return false;
    const events = await getVisitEventRepo().find({
      where: { visitId },
      take: 5,
    });
    const meaningful = (events || []).filter(
      (e) => e.eventType && e.eventType !== VisitEventType.VISIT,
    );
    if (meaningful.length > 0) return false;
    if (events?.length) {
      await getVisitEventRepo().delete({ visitId });
    }
    await getVisitRepo().delete({ id: visitId });
    return true;
  };

  const hasVisitEvent = async (visitId, eventType) => {
    if (!visitId || !eventType) return false;
    const row = await getVisitEventRepo().findOne({
      where: { visitId, eventType },
    });
    return Boolean(row);
  };

  const logEvent = async (visitId, eventType, metadata) => {
    if (!visitId || Number.isNaN(Number(visitId))) return null;
    const vId = parseInt(visitId, 10);
    const eventPayload = { visitId: vId, eventType, metadata };

    const eventEntity = getVisitEventRepo().create({
      visitId: vId,
      eventType,
      metadata,
    });
    await getVisitEventRepo().insert(eventEntity);

    void indexVisitEvent(vId, eventType);
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

  const jsonBoolSql = (columnJsonPath, jsonKey) => {
    const dbType = getDataSource().options.type;
    if (dbType === 'postgres') {
      return `(${columnJsonPath}->>'${jsonKey}') IN ('true', 't', '1')`;
    }
    if (dbType === 'sqlite' || dbType === 'better-sqlite3') {
      return `json_extract(${columnJsonPath}, '$.${jsonKey}') IN (1, 'true', 't')`;
    }
    return `JSON_EXTRACT(${columnJsonPath}, '$.${jsonKey}') IN (true, 1, 'true')`;
  };

  const getCampaignVendorStats = async (campaignId, userId, options = {}) => {
    const campaign = await campaignsService.findOne(campaignId, userId);
    const { flowConfig } = await campaignsService.getFlow(campaignId, userId);
    const apiExpose = flowEngineService.isApiExposeFlow(flowConfig);
    const cId = parseInt(campaignId, 10);
    const successTrue = jsonBoolSql('event.metadata', 'success');
    const heldTrue = jsonBoolSql('event.metadata', 'held');

    const { from, to } = resolveRangeBounds(options);

    const clickQB = getVisitRepo()
      .createQueryBuilder('visit')
      .select('visit.vendorId', 'vendorId')
      .addSelect('COUNT(*)', 'clicks')
      .where('visit.campaignId = :cId', { cId });
    if (from) clickQB.andWhere('visit.createdAt >= :since', { since: from });
    if (to) clickQB.andWhere('visit.createdAt <= :until', { until: to });
    const clickRows = await clickQB.groupBy('visit.vendorId').getRawMany();

    const eventQB = getVisitEventRepo()
      .createQueryBuilder('event')
      .innerJoin('event.visit', 'visit')
      .select('visit.vendorId', 'vendorId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_SEND' AND ${successTrue} THEN 1 ELSE 0 END), 0)`,
        'requested',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_VERIFY' AND ${successTrue} THEN 1 ELSE 0 END), 0)`,
        'liveVerified',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_VERIFY' AND ${heldTrue} THEN 1 ELSE 0 END), 0)`,
        'held',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_SEND' AND NOT (${successTrue}) THEN 1 ELSE 0 END), 0)`,
        'failedSend',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_VERIFY' AND NOT (${successTrue}) THEN 1 ELSE 0 END), 0)`,
        'failedVerify',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN event.eventType = 'SUBSCRIBE_SUCCESS' THEN 1 ELSE 0 END), 0)`,
        'subscribeSuccess',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN event.eventType = 'HOME_VIEW' THEN 1 ELSE 0 END), 0)`,
        'homeView',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN event.eventType = 'SUBSCRIBE_CLICK' THEN 1 ELSE 0 END), 0)`,
        'subscribeClick',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN event.eventType = 'CG_REDIRECT' THEN 1 ELSE 0 END), 0)`,
        'cgRedirect',
      )
      // PIN legs for API expose: every attempt, plus distinct MSISDN per leg.
      .addSelect(
        `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_SEND' THEN 1 ELSE 0 END), 0)`,
        'pinRequest',
      )
      .addSelect(
        `COUNT(DISTINCT CASE WHEN event.eventType = 'OTP_SEND' AND ${successTrue} THEN visit.phone END)`,
        'uniquePinSend',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_VERIFY' THEN 1 ELSE 0 END), 0)`,
        'pinValRequest',
      )
      .addSelect(
        `COUNT(DISTINCT CASE WHEN event.eventType = 'OTP_VERIFY' THEN visit.phone END)`,
        'uniquePinValRequest',
      )
      .addSelect(
        `COUNT(DISTINCT CASE WHEN event.eventType = 'OTP_VERIFY' AND ${successTrue} THEN visit.phone END)`,
        'uniquePinVal',
      )
      .where('visit.campaignId = :cId', { cId });
    if (from) eventQB.andWhere('event.createdAt >= :since', { since: from });
    if (to) eventQB.andWhere('event.createdAt <= :until', { until: to });
    const eventRows = await eventQB.groupBy('visit.vendorId').getRawMany();

    const postbackQB = getPostbackRepo()
      .createQueryBuilder('p')
      .select('p.vendorId', 'vendorId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN p.status IN ('${ConversionPostbackStatus.RECEIVED}', '${ConversionPostbackStatus.SENT}') THEN 1 ELSE 0 END), 0)`,
        'postbacksMatched',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN p.status = '${ConversionPostbackStatus.SENT}' THEN 1 ELSE 0 END), 0)`,
        'postbacksSent',
      )
      .where('p.campaignId = :cId', { cId });
    if (from) postbackQB.andWhere('p.createdAt >= :since', { since: from });
    if (to) postbackQB.andWhere('p.createdAt <= :until', { until: to });
    const postbackRows = await postbackQB.groupBy('p.vendorId').getRawMany();

    const statsByVendor = new Map();
    const emptyStats = () => ({
      clicks: 0,
      requested: 0,
      liveVerified: 0,
      held: 0,
      failedApi: 0,
      subscribeSuccess: 0,
      postbacksMatched: 0,
      postbacksSent: 0,
      pinRequest: 0,
      uniquePinSend: 0,
      pinValRequest: 0,
      uniquePinValRequest: 0,
      uniquePinVal: 0,
      homeView: 0,
      subscribeClick: 0,
      cgRedirect: 0,
    });
    const ensure = (vendorId) => {
      const key = Number(vendorId) || 0;
      if (!statsByVendor.has(key)) statsByVendor.set(key, emptyStats());
      return statsByVendor.get(key);
    };

    for (const row of clickRows) {
      ensure(row.vendorId).clicks = Number(row.clicks) || 0;
    }
    for (const row of eventRows) {
      const prev = ensure(row.vendorId);
      prev.requested = Number(row.requested) || 0;
      prev.liveVerified = Number(row.liveVerified) || 0;
      prev.held = Number(row.held) || 0;
      prev.failedApi = (Number(row.failedSend) || 0) + (Number(row.failedVerify) || 0);
      prev.subscribeSuccess = Number(row.subscribeSuccess) || 0;
      prev.pinRequest = Number(row.pinRequest) || 0;
      prev.uniquePinSend = Number(row.uniquePinSend) || 0;
      prev.pinValRequest = Number(row.pinValRequest) || 0;
      prev.uniquePinValRequest = Number(row.uniquePinValRequest) || 0;
      prev.uniquePinVal = Number(row.uniquePinVal) || 0;
      prev.homeView = Number(row.homeView) || 0;
      prev.subscribeClick = Number(row.subscribeClick) || 0;
      prev.cgRedirect = Number(row.cgRedirect) || 0;
    }
    for (const row of postbackRows) {
      const prev = ensure(row.vendorId);
      prev.postbacksMatched = Number(row.postbacksMatched) || 0;
      prev.postbacksSent = Number(row.postbacksSent) || 0;
    }

    const seen = new Set();
    const vendors = [];
    for (const t of campaign.trackings || []) {
      const vendor = t.vendor || {};
      const vendorId = Number(vendor.id || t.vendorId);
      if (!vendorId || seen.has(vendorId)) continue;
      seen.add(vendorId);
      const raw = statsByVendor.get(vendorId) || {};
      vendors.push({
        vendorId,
        vendorName: vendor.name || `Vendor #${vendorId}`,
        vendorCode: vendor.code || null,
        assignmentActive: t.active !== false,
        payoutPercent: Number(t.payoutPercent ?? 100),
        ...campaignVendorPerf({ ...raw, apiExpose }),
      });
    }

    for (const [vendorId, raw] of statsByVendor.entries()) {
      if (!vendorId || seen.has(vendorId)) continue;
      seen.add(vendorId);
      vendors.push({
        vendorId,
        vendorName: `Vendor #${vendorId}`,
        vendorCode: null,
        assignmentActive: false,
        payoutPercent: 100,
        ...campaignVendorPerf({ ...raw, apiExpose }),
      });
    }

    vendors.sort(
      (a, b) => b.totalClicks - a.totalClicks || a.vendorName.localeCompare(b.vendorName),
    );

    return { apiExpose, vendors };
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
    await campaignsService.assertOwnership(campaignId, userId);
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
      const campaign = await campaignsService.assertOwnership(
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
      } else if (row.callType === 'priority') {
        statusLabel = checksubStatusLabel(responseBody, row.success);
      } else if (
        row.callType === 'otp_send' ||
        row.callType === 'otp_verify' ||
        row.callType === 'otp_expose_send_in' ||
        row.callType === 'otp_expose_verify_in'
      ) {
        const nestedOtp = responseBody?.data ?? responseBody ?? {};
        if (nestedOtp.held === true || responseBody?.held === true) {
          statusLabel = 'HELD';
        } else {
          statusLabel =
            row.success === false
              ? 'FAILED'
              : nestedOtp.response
                ? String(nestedOtp.response).toUpperCase()
                : row.success
                  ? 'SUCCESS'
                  : null;
        }
      } else if (row.callType === 'subscribe' && responseBody?.skipped) {
        statusLabel =
          responseBody.statusLabel ||
          (requestBody?.reason === 'no_phone'
            ? 'NO_PHONE'
            : requestBody?.reason === 'test_fail'
              ? 'TEST_FAIL'
              : requestBody?.reason
                ? String(requestBody.reason).toUpperCase()
                : 'SKIPPED_NO_URL');
      } else if (row.callType === 'subscribe') {
        statusLabel =
          checksubStatusLabel(responseBody, row.success) || statusLabel;
      } else if (String(row.callType || '').startsWith('orange_bf_')) {
        const nestedBf = responseBody?.data ?? responseBody ?? {};
        if (nestedBf.subscriptionStatus) {
          statusLabel = String(nestedBf.subscriptionStatus).toUpperCase();
        } else if (responseBody?.outcome) {
          statusLabel = String(responseBody.outcome).toUpperCase();
        } else if (responseBody?.status) {
          statusLabel = String(responseBody.status).toUpperCase();
        } else if (row.success) {
          statusLabel = 'SUCCESS';
        } else {
          statusLabel = 'FAILED';
        }
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
        msisdn: row.msisdn || null,
        clickId: row.clickId,
        rcid: row.rcid,
        createdAt: row.createdAt,
        summary:
          row.callType === 'checksub' || row.callType === 'priority' || row.callType === 'orange_bf_checksub' || row.callType === 'orange_bf_expose_check_in'
            ? {
                currentStatus: nested.currentStatus ?? null,
                subscriptionStatus: nested.subscriptionStatus ?? null,
                serviceId: nested.serviceId ?? requestBody?.serviceId ?? null,
                responseCode: responseBody?.responseCode ?? null,
                responseMessage: responseBody?.responseMessage ?? null,
                transactionId: responseBody?.transactionId ?? nested.transactionId ?? null,
                priority: requestBody?.priority ?? null,
                pageType: requestBody?.pageType ?? null,
              }
            : row.callType === 'otp_send' ||
                row.callType === 'otp_verify' ||
                row.callType === 'otp_expose_send_in' ||
                row.callType === 'otp_expose_verify_in' ||
                row.callType === 'subscribe' ||
                String(row.callType || '').startsWith('orange_bf_')
              ? {
                  response: nested.response ?? null,
                  responseCode:
                    nested.responseCode ?? responseBody?.responseCode ?? null,
                  responseMessage:
                    nested.responseMessage ||
                    nested.errorMessage ||
                    nested.message ||
                    responseBody?.responseMessage ||
                    null,
                  transactionId: responseBody?.transactionId ?? nested.transactionId ?? null,
                  skipped: nested.skipped ?? null,
                  currentStatus: nested.currentStatus ?? null,
                  subscriptionStatus: nested.subscriptionStatus ?? null,
                  pack: requestBody?.pack || requestBody?.planId || null,
                  serviceId:
                    requestBody?.serviceId || nested.serviceId || null,
                  subServiceId: requestBody?.subServiceId || null,
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
          requestBody: c.requestBody,
          responseBody: c.responseBody,
          errorMessage: c.errorMessage,
          msisdn: c.msisdn,
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
        phone: visit.phone || null,
        country: visit.country,
        operator: visit.operator,
        pageType: visit.pageType,
        visitStatus: visit.visitStatus,
        clickId: visit.clickId,
        rcid: visit.rcid,
        campid: visit.campid || null,
        trackingCampid: visit.trackingCampid || null,
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
    findRecentVisitByRcid,
    getVisitDetail,
    updateVisit,
    setVisitPhone,
    ensureVisitCampids,
    ensureVisitAttribution,
    abandonOrphanVisit,
    hasVisitEvent,
    logEvent,
    getCampaignAnalytics,
    getCampaignVendorStats,
    getCampaignActivityLogs,
    derivePagePath,
    archiveOldData,
  };
};

export const analyticsService = createAnalyticsService();
