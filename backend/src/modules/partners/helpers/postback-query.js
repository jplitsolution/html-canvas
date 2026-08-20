import { In } from 'typeorm';
import {
  ConversionPostbackStatus,
} from '../../../database/entities/conversion-postback.entity.js';
import {
  VisitEventType,
} from '../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { maskPhone, daysAgo } from './postback-register.js';
import {
  matchesHitFilters,
  matchesNumberFilters,
  paginateItems,
  parseReportQuery,
} from './report-filters.js';
import {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
  resolveRangeBounds,
} from '../../../common/zoned-day.js';
import {
  DAY_REPORT_EVENT_TYPES,
  DAY_REPORT_HE_LOG_TYPES,
  DAY_REPORT_HIT_TYPES,
  DAY_REPORT_LOG_TYPES,
  DAY_REPORT_MAX_NUMBERS,
  buildCallbackHit,
  buildNumberStory,
  digitsMsisdn,
  emptyDayReport,
  formatDayReportText,
  isHeFailCgRedirect,
  summarizeHits,
  summarizeStories,
  todayYmd,
} from './postback-day-report.js';

export function createPostbackQuery(deps) {
  const {
    getPostbackRepo,
    getVendorRepo,
    getVisitRepo,
    getCampaignRepo,
    getVisitEventRepo,
    getApiCallLogRepo,
  } = deps;

  const resolveUserScope = async (userId) => {
    const [campaigns, vendors] = await Promise.all([
      getCampaignRepo().find({
        where: { userId },
        select: ['id'],
      }),
      getVendorRepo().find({
        where: { userId },
        select: ['id', 'name', 'code'],
      }),
    ]);
    return {
      campaignIds: campaigns.map((c) => c.id),
      vendorIds: vendors.map((v) => v.id),
      vendors,
    };
  };

  const assertPostbackAccess = async (row, userId) => {
    const { campaignIds, vendorIds } = await resolveUserScope(userId);
    const okCampaign =
      row.campaignId && campaignIds.includes(Number(row.campaignId));
    const okVendor = row.vendorId && vendorIds.includes(Number(row.vendorId));
    if (!okCampaign && !okVendor) {
      const err = new Error('Postback not found');
      err.statusCode = 404;
      throw err;
    }
  };

  const serializePostback = (row, vendorMap = {}) => {
    const vendor = row.vendorId ? vendorMap[row.vendorId] : null;
    return {
      id: row.id,
      msisdn: maskPhone(row.msisdn),
      status: row.status,
      clickId: row.clickId,
      rcid: row.rcid,
      campid: row.campid,
      trackingCampid: row.trackingCampid,
      campaignId: row.campaignId,
      vendorId: row.vendorId,
      vendorName: vendor?.name || null,
      vendorCode: vendor?.code || null,
      visitId: row.visitId,
      offerCode: row.offerCode,
      postbackUrl: row.postbackUrl,
      httpStatus: row.httpStatus,
      responseBody: row.responseBody,
      errorMessage: row.errorMessage,
      sentAt: row.sentAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  };

  const applyCreatedAtRange = (qb, alias, query = {}) => {
    const { from, to } = resolveRangeBounds({
      from: query.from,
      to: query.to,
      timezone: query.timezone,
    });
    if (from) qb.andWhere(`${alias}.createdAt >= :from`, { from });
    if (to) qb.andWhere(`${alias}.createdAt <= :to`, { to });
    return { from, to };
  };

  const emptySummary = () => ({
    msisdnResolved: 0,
    postbacksCreated: 0,
    pending: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    heFailCg: 0,
    byVendor: [],
    since: daysAgo(30).toISOString(),
  });

  const getSummary = async (userId, query = {}) => {
    const { campaignIds, vendorIds, vendors } = await resolveUserScope(userId);
    if (!campaignIds.length && !vendorIds.length) {
      return emptySummary();
    }

    const days = Math.min(Math.max(Number(query.days) || 30, 1), 365);
    const hasExplicitRange = Boolean(query.from || query.to);
    const { from, to } = hasExplicitRange
      ? resolveRangeBounds({
          from: query.from,
          to: query.to,
          timezone: query.timezone,
        })
      : { from: daysAgo(days), to: undefined };
    const since = from || daysAgo(days);
    const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));

    let msisdnResolved = 0;
    let heFailCg = 0;
    if (campaignIds.length) {
      const visitQ = getVisitRepo()
        .createQueryBuilder('v')
        .where('v.campaignId IN (:...campaignIds)', { campaignIds })
        .andWhere('v.phone IS NOT NULL')
        .andWhere("v.phone <> ''")
        .andWhere('v.createdAt >= :since', { since });
      if (to) visitQ.andWhere('v.createdAt <= :until', { until: to });
      msisdnResolved = await visitQ.getCount();

      const failQ = getApiCallLogRepo()
        .createQueryBuilder('l')
        .where('l.campaignId IN (:...campaignIds)', { campaignIds })
        .andWhere('l.callType = :heRedirect', {
          heRedirect: ApiCallType.HE_REDIRECT,
        })
        .andWhere('l.success = :fail', { fail: false })
        .andWhere('l.createdAt >= :since', { since });
      if (to) failQ.andWhere('l.createdAt <= :until', { until: to });
      heFailCg = await failQ.getCount();
    }

    const pbQ = getPostbackRepo()
      .createQueryBuilder('p')
      .where('p.createdAt >= :since', { since });
    if (to) pbQ.andWhere('p.createdAt <= :until', { until: to });
    if (campaignIds.length && vendorIds.length) {
      pbQ.andWhere(
        '(p.campaignId IN (:...campaignIds) OR p.vendorId IN (:...vendorIds))',
        { campaignIds, vendorIds },
      );
    } else if (campaignIds.length) {
      pbQ.andWhere('p.campaignId IN (:...campaignIds)', { campaignIds });
    } else {
      pbQ.andWhere('p.vendorId IN (:...vendorIds)', { vendorIds });
    }

    const rows = await pbQ
      .select('p.status', 'status')
      .addSelect('p.vendorId', 'vendorId')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('p.status')
      .addGroupBy('p.vendorId')
      .getRawMany();

    let pending = 0;
    let received = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let postbacksCreated = 0;
    const byVendorAcc = {};

    for (const r of rows) {
      const cnt = Number(r.cnt) || 0;
      const status = String(r.status || '');
      const vid = r.vendorId != null ? Number(r.vendorId) : null;
      postbacksCreated += cnt;
      if (status === ConversionPostbackStatus.PENDING) pending += cnt;
      else if (status === ConversionPostbackStatus.RECEIVED) received += cnt;
      else if (status === ConversionPostbackStatus.SENT) sent += cnt;
      else if (status === ConversionPostbackStatus.FAILED) failed += cnt;
      else if (status === ConversionPostbackStatus.SKIPPED) skipped += cnt;

      const key = vid || 0;
      if (!byVendorAcc[key]) {
        const v = vid ? vendorMap[vid] : null;
        byVendorAcc[key] = {
          vendorId: vid,
          vendorName: v?.name || (vid ? `Vendor #${vid}` : 'Unknown'),
          vendorCode: v?.code || null,
          pending: 0,
          received: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          total: 0,
        };
      }
      byVendorAcc[key].total += cnt;
      if (status === ConversionPostbackStatus.PENDING) byVendorAcc[key].pending += cnt;
      else if (status === ConversionPostbackStatus.RECEIVED) byVendorAcc[key].received += cnt;
      else if (status === ConversionPostbackStatus.SENT) byVendorAcc[key].sent += cnt;
      else if (status === ConversionPostbackStatus.FAILED) byVendorAcc[key].failed += cnt;
      else if (status === ConversionPostbackStatus.SKIPPED) byVendorAcc[key].skipped += cnt;
    }

    return {
      msisdnResolved,
      heFailCg,
      postbacksCreated,
      pending,
      received,
      sent,
      failed,
      skipped,
      byVendor: Object.values(byVendorAcc).sort((a, b) => b.total - a.total),
      since: since.toISOString(),
      until: to ? to.toISOString() : null,
    };
  };

  const listPostbacks = async (userId, query = {}) => {
    const { campaignIds, vendorIds, vendors } = await resolveUserScope(userId);
    if (!campaignIds.length && !vendorIds.length) {
      return { total: 0, page: 1, limit: 25, items: [] };
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
    const status = String(query.status || '').trim().toLowerCase();
    const q = String(query.q || '').trim();
    const vendorIdFilter = query.vendorId
      ? parseInt(query.vendorId, 10)
      : null;

    const qb = getPostbackRepo().createQueryBuilder('p');
    if (campaignIds.length && vendorIds.length) {
      qb.where(
        '(p.campaignId IN (:...campaignIds) OR p.vendorId IN (:...vendorIds))',
        { campaignIds, vendorIds },
      );
    } else if (campaignIds.length) {
      qb.where('p.campaignId IN (:...campaignIds)', { campaignIds });
    } else {
      qb.where('p.vendorId IN (:...vendorIds)', { vendorIds });
    }

    if (
      status &&
      Object.values(ConversionPostbackStatus).includes(status)
    ) {
      qb.andWhere('p.status = :status', { status });
    }
    if (vendorIdFilter && !Number.isNaN(vendorIdFilter)) {
      qb.andWhere('p.vendorId = :vendorIdFilter', { vendorIdFilter });
    }
    if (q) {
      const like = `%${q}%`;
      qb.andWhere(
        '(p.msisdn LIKE :like OR p.clickId LIKE :like OR p.rcid LIKE :like OR p.campid LIKE :like OR p.trackingCampid LIKE :like)',
        { like },
      );
    }
    applyCreatedAtRange(qb, 'p', query);

    const total = await qb.clone().getCount();
    const rows = await qb
      .orderBy('p.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));
    // Load any referenced vendors not in user's vendor list (edge)
    const missingVids = [
      ...new Set(
        rows
          .map((r) => r.vendorId)
          .filter((id) => id && !vendorMap[id]),
      ),
    ];
    if (missingVids.length) {
      const extra = await getVendorRepo().find({
        where: { id: In(missingVids) },
      });
      for (const v of extra) vendorMap[v.id] = v;
    }

    return {
      total,
      page,
      limit,
      items: rows.map((r) => serializePostback(r, vendorMap)),
    };
  };

  const getPostbackById = async (id, userId) => {
    const row = await getPostbackRepo().findOne({
      where: { id: parseInt(id, 10) },
    });
    if (!row) {
      const err = new Error('Postback not found');
      err.statusCode = 404;
      throw err;
    }
    await assertPostbackAccess(row, userId);

    let vendor = null;
    if (row.vendorId) {
      vendor = await getVendorRepo().findOne({ where: { id: row.vendorId } });
    }
    const vendorMap = vendor ? { [vendor.id]: vendor } : {};

    let billingReceived = false;
    let billingReceivedAt = null;
    if (row.visitId) {
      const ev = await getVisitEventRepo().findOne({
        where: {
          visitId: row.visitId,
          eventType: VisitEventType.CALLBACK_RECEIVED,
        },
        order: { id: 'DESC' },
      });
      if (ev) {
        billingReceived = true;
        billingReceivedAt = ev.createdAt || null;
      }
      const billLog = await getApiCallLogRepo().findOne({
        where: {
          visitId: row.visitId,
          callType: ApiCallType.BILLING_CALLBACK,
        },
        order: { id: 'DESC' },
      });
      if (billLog) {
        billingReceived = true;
        billingReceivedAt = billingReceivedAt || billLog.createdAt || null;
      }
    }
    if (
      !billingReceived &&
      (row.status === ConversionPostbackStatus.RECEIVED ||
        row.status === ConversionPostbackStatus.SENT ||
        row.status === ConversionPostbackStatus.FAILED)
    ) {
      billingReceived = true;
      billingReceivedAt = row.sentAt || row.updatedAt || null;
    }

    const vendorFired =
      Boolean(row.sentAt) ||
      row.status === ConversionPostbackStatus.SENT ||
      row.status === ConversionPostbackStatus.FAILED ||
      row.status === ConversionPostbackStatus.SKIPPED;

    let relatedLogs = [];
    if (row.visitId) {
      relatedLogs = await getApiCallLogRepo().find({
        where: {
          visitId: row.visitId,
          callType: In([
            ApiCallType.BILLING_CALLBACK,
            ApiCallType.VENDOR_POSTBACK,
          ]),
        },
        order: { id: 'DESC' },
        take: 10,
      });
    }

    return {
      ...serializePostback(row, vendorMap),
      lifecycle: {
        created: true,
        createdAt: row.createdAt,
        billingReceived,
        billingReceivedAt,
        vendorFired,
        vendorFireStatus: row.status,
        vendorName: vendor?.name || null,
        vendorCode: vendor?.code || null,
      },
      relatedLogs: relatedLogs.map((l) => ({
        id: l.id,
        callType: l.callType,
        requestUrl: l.requestUrl,
        responseStatus: l.responseStatus,
        success: l.success,
        errorMessage: l.errorMessage,
        createdAt: l.createdAt,
      })),
    };
  };

  const applyUserScope = (qb, alias, campaignIds, vendorIds) => {
    if (campaignIds.length && vendorIds.length) {
      qb.andWhere(
        `(${alias}.campaignId IN (:...campaignIds) OR ${alias}.vendorId IN (:...vendorIds))`,
        { campaignIds, vendorIds },
      );
    } else if (campaignIds.length) {
      qb.andWhere(`${alias}.campaignId IN (:...campaignIds)`, { campaignIds });
    } else {
      qb.andWhere(`${alias}.vendorId IN (:...vendorIds)`, { vendorIds });
    }
  };

  /**
   * All postback activity for a date range, grouped by MSISDN.
   * Includes rows created earlier if callback/fire happened today.
   */
  const getDayReport = async (userId, query = {}) => {
    const timezone = normalizeTimezone(query.timezone || DEFAULT_TIMEZONE);
    let startYmd = String(query.from || query.date || todayYmd(timezone)).slice(0, 10);
    let endYmd = String(query.to || startYmd).slice(0, 10);
    if (startYmd > endYmd) {
      const swap = startYmd;
      startYmd = endYmd;
      endYmd = swap;
    }
    const MAX_RANGE_DAYS = 93;
    const startUtc = Date.parse(`${startYmd}T00:00:00Z`);
    const endUtc = Date.parse(`${endYmd}T00:00:00Z`);
    let rangeClamped = false;
    if (Number.isFinite(startUtc) && Number.isFinite(endUtc)) {
      const span = Math.round((endUtc - startUtc) / 86400000);
      if (span > MAX_RANGE_DAYS) {
        const clamped = new Date(startUtc);
        clamped.setUTCDate(clamped.getUTCDate() + MAX_RANGE_DAYS);
        endYmd = clamped.toISOString().slice(0, 10);
        rangeClamped = true;
      }
    }
    const date = startYmd;
    const endDate = endYmd;
    const { from, to } = resolveRangeBounds({ from: date, to: endDate, timezone });
    const meta = { date, timezone, from: date, to: endDate, rangeClamped };

    const { campaignIds, vendorIds, vendors } = await resolveUserScope(userId);
    if (!campaignIds.length && !vendorIds.length) {
      return emptyDayReport(meta);
    }

    const filters = parseReportQuery(query);
    if (filters.campaignId && !campaignIds.includes(filters.campaignId)) {
      return emptyDayReport(meta);
    }
    if (filters.vendorId && !vendorIds.includes(filters.vendorId)) {
      return emptyDayReport(meta);
    }
    const scopedCampaignIds = filters.campaignId
      ? [filters.campaignId]
      : campaignIds;
    const scopedVendorIds = filters.vendorId ? [filters.vendorId] : vendorIds;

    const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));

    const pbQ = getPostbackRepo()
      .createQueryBuilder('p')
      .where(
        '(p.createdAt BETWEEN :from AND :to OR p.updatedAt BETWEEN :from AND :to OR p.sentAt BETWEEN :from AND :to)',
        { from, to },
      );
    applyUserScope(pbQ, 'p', scopedCampaignIds, scopedVendorIds);
    if (filters.q) {
      const like = `%${filters.q}%`;
      pbQ.andWhere(
        '(p.msisdn LIKE :like OR p.clickId LIKE :like OR p.rcid LIKE :like OR p.campid LIKE :like OR p.trackingCampid LIKE :like)',
        { like },
      );
    }
    const postbacks = await pbQ
      .orderBy('p.id', 'DESC')
      .take(DAY_REPORT_MAX_NUMBERS)
      .getMany();

    const seedMsisdns = [
      ...new Set(postbacks.map((p) => digitsMsisdn(p.msisdn)).filter(Boolean)),
    ];
    const seedVisitIds = [
      ...new Set(postbacks.map((p) => p.visitId).filter(Boolean)),
    ];

    const logQ = getApiCallLogRepo()
      .createQueryBuilder('l')
      .where('l.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('l.callType IN (:...logTypes)', { logTypes: DAY_REPORT_LOG_TYPES });
    const unmatchedHits = '(l.campaignId IS NULL AND l.callType IN (:...hitTypes))';
    const hitTypes = DAY_REPORT_HIT_TYPES;
    if (filters.vendorId) {
      logQ.leftJoin(Visit, 'lv', 'lv.id = l.visitId');
      logQ.andWhere('lv.vendorId = :vendorFilter', {
        vendorFilter: filters.vendorId,
      });
    }
    if (filters.q) {
      const like = `%${filters.q}%`;
      logQ.andWhere(
        '(l.msisdn LIKE :like OR l.clickId LIKE :like OR l.rcid LIKE :like)',
        { like },
      );
    }
    if (scopedCampaignIds.length) {
      const parts = [`l.campaignId IN (:...campaignIds)`, unmatchedHits];
      if (seedMsisdns.length) parts.push('l.msisdn IN (:...seedMsisdns)');
      if (seedVisitIds.length) parts.push('l.visitId IN (:...seedVisitIds)');
      logQ.andWhere(`(${parts.join(' OR ')})`, {
        campaignIds: scopedCampaignIds,
        hitTypes,
        ...(seedMsisdns.length ? { seedMsisdns } : {}),
        ...(seedVisitIds.length ? { seedVisitIds } : {}),
      });
    } else if (seedMsisdns.length) {
      logQ.andWhere(`(l.msisdn IN (:...seedMsisdns) OR ${unmatchedHits})`, {
        seedMsisdns,
        hitTypes,
      });
    } else {
      logQ.andWhere(unmatchedHits, { hitTypes });
    }
    const logs = await logQ.orderBy('l.id', 'ASC').take(8000).getMany();

    let events = [];
    if (scopedCampaignIds.length) {
      const eventQ = getVisitEventRepo()
        .createQueryBuilder('e')
        .innerJoinAndSelect('e.visit', 'v')
        .where('e.createdAt BETWEEN :from AND :to', { from, to })
        .andWhere('e.eventType IN (:...eventTypes)', {
          eventTypes: DAY_REPORT_EVENT_TYPES,
        })
        .andWhere('v.campaignId IN (:...campaignIds)', {
          campaignIds: scopedCampaignIds,
        });
      if (filters.vendorId) {
        eventQ.andWhere('v.vendorId = :vendorFilter', {
          vendorFilter: filters.vendorId,
        });
      }
      events = await eventQ.orderBy('e.id', 'ASC').take(8000).getMany();
    }

    const byMsisdn = new Map();
    const byVisit = new Map();
    const heLogTypes = new Set(DAY_REPORT_HE_LOG_TYPES);
    const seedCallTypes = new Set(DAY_REPORT_HIT_TYPES.concat([ApiCallType.HE_REDIRECT]));

    const ensure = (raw) => {
      const msisdn = digitsMsisdn(raw);
      if (!msisdn) return null;
      if (!byMsisdn.has(msisdn)) {
        byMsisdn.set(msisdn, { msisdn, postback: null, logs: [], events: [] });
      }
      return byMsisdn.get(msisdn);
    };

    const ensureVisit = (visitId, fallbackKey) => {
      const key = visitId ? `visit:${visitId}` : fallbackKey;
      if (!key) return null;
      if (!byVisit.has(key)) {
        byVisit.set(key, {
          msisdn: '',
          visitId: visitId || null,
          postback: null,
          logs: [],
          events: [],
        });
      }
      return byVisit.get(key);
    };

    const putInBucket = (msisdn, visitId, clickId, postbackId) => {
      const digits = digitsMsisdn(msisdn);
      if (digits) return ensure(digits);
      return ensureVisit(
        visitId,
        clickId ? `click:${clickId}` : postbackId ? `pb:${postbackId}` : null,
      );
    };

    for (const row of postbacks) {
      const bucket = putInBucket(row.msisdn, row.visitId, row.clickId, row.id);
      if (!bucket) continue;
      if (!bucket.postback || Number(row.id) > Number(bucket.postback.id)) {
        bucket.postback = row;
      }
    }
    for (const log of logs) {
      const msisdn = digitsMsisdn(log.msisdn);
      if (!msisdn) continue;
      if (seedCallTypes.has(log.callType)) {
        const bucket = ensure(msisdn);
        if (bucket) bucket.logs.push(log);
        continue;
      }
      const existing = byMsisdn.get(msisdn);
      if (existing) existing.logs.push(log);
    }

    const visitToMsisdn = new Map();
    const rememberVisit = (bucket) => {
      const fromPb = bucket.postback?.visitId || bucket.visitId;
      if (fromPb) visitToMsisdn.set(Number(fromPb), bucket);
      for (const log of bucket.logs) {
        if (log.visitId) visitToMsisdn.set(Number(log.visitId), bucket);
      }
    };
    for (const bucket of byMsisdn.values()) rememberVisit(bucket);
    for (const bucket of byVisit.values()) rememberVisit(bucket);

    for (const log of logs) {
      if (digitsMsisdn(log.msisdn)) continue;
      if (!isHeFailCgRedirect(log)) continue;
      const vid = log.visitId ? Number(log.visitId) : null;
      if (vid && visitToMsisdn.has(vid)) {
        visitToMsisdn.get(vid).logs.push(log);
        continue;
      }
      const bucket = ensureVisit(vid, log.id ? `log:${log.id}` : null);
      if (bucket) bucket.logs.push(log);
    }

    for (const log of logs) {
      if (digitsMsisdn(log.msisdn)) continue;
      if (!heLogTypes.has(log.callType) || isHeFailCgRedirect(log)) continue;
      const vid = log.visitId ? Number(log.visitId) : null;
      if (!vid) continue;
      if (visitToMsisdn.has(vid)) {
        visitToMsisdn.get(vid).logs.push(log);
        continue;
      }
      const bucket = byVisit.get(`visit:${vid}`);
      if (bucket) bucket.logs.push(log);
    }

    for (const log of logs) {
      if (digitsMsisdn(log.msisdn)) continue;
      if (
        log.callType !== ApiCallType.BILLING_CALLBACK &&
        log.callType !== ApiCallType.VENDOR_POSTBACK
      ) {
        continue;
      }
      const vid = log.visitId ? Number(log.visitId) : null;
      if (vid && visitToMsisdn.has(vid)) {
        visitToMsisdn.get(vid).logs.push(log);
        continue;
      }
      const bucket = ensureVisit(
        vid,
        log.clickId ? `click:${log.clickId}` : log.id ? `log:${log.id}` : null,
      );
      if (bucket) bucket.logs.push(log);
    }

    for (const ev of events) {
      const phone = ev.visit?.phone;
      let bucket = ensure(phone);
      if (!bucket) {
        const vid = ev.visitId || ev.visit?.id;
        if (vid && visitToMsisdn.has(Number(vid))) {
          bucket = visitToMsisdn.get(Number(vid));
        } else if (vid) {
          bucket = ensureVisit(Number(vid));
        }
      }
      if (!bucket) continue;
      bucket.events.push(ev);
    }

    const buckets = [...byMsisdn.values(), ...byVisit.values()];

    const missingMsisdns = [...byMsisdn.values()]
      .filter((b) => !b.postback)
      .map((b) => b.msisdn);
    if (missingMsisdns.length) {
      const extra = await getPostbackRepo().find({
        where: { msisdn: In(missingMsisdns.slice(0, 2000)) },
      });
      for (const row of extra) {
        const bucket = ensure(row.msisdn);
        if (!bucket) continue;
        const inScope =
          (row.campaignId && scopedCampaignIds.includes(Number(row.campaignId))) ||
          (row.vendorId && scopedVendorIds.includes(Number(row.vendorId)));
        if (!inScope) continue;
        if (!bucket.postback || Number(row.id) > Number(bucket.postback.id)) {
          bucket.postback = row;
        }
      }
    }

    const missingVids = [
      ...new Set(
        buckets
          .map((b) => b.postback?.vendorId)
          .filter((id) => id && !vendorMap[id]),
      ),
    ];
    if (missingVids.length) {
      const extraVendors = await getVendorRepo().find({
        where: { id: In(missingVids) },
      });
      for (const v of extraVendors) vendorMap[v.id] = v;
    }

    const campaignIdsNeeded = [
      ...new Set(
        buckets
          .flatMap((b) => [
            b.postback?.campaignId,
            ...b.logs.map((l) => l.campaignId),
          ])
          .filter(Boolean),
      ),
    ];
    const campaignMap = {};
    if (campaignIdsNeeded.length) {
      const campaigns = await getCampaignRepo().find({
        where: { id: In(campaignIdsNeeded) },
        select: ['id', 'name'],
      });
      for (const c of campaigns) campaignMap[c.id] = c;
    }

    let numbers = buckets.map((bucket) => {
      const campaignId =
        bucket.postback?.campaignId ||
        bucket.logs.find((l) => l.campaignId)?.campaignId ||
        null;
      return buildNumberStory({
        msisdn: bucket.msisdn,
        postback: bucket.postback,
        logs: bucket.logs,
        events: bucket.events,
        vendor: bucket.postback?.vendorId
          ? vendorMap[bucket.postback.vendorId]
          : null,
        campaign: campaignId ? campaignMap[campaignId] : null,
      });
    });

    numbers.sort((a, b) => {
      const at = Date.parse(
        a.queuedAt || a.heRedirectedAt || a.billingReceivedAt || a.vendorFiredAt || 0,
      );
      const bt = Date.parse(
        b.queuedAt || b.heRedirectedAt || b.billingReceivedAt || b.vendorFiredAt || 0,
      );
      return (Number.isNaN(bt) ? 0 : bt) - (Number.isNaN(at) ? 0 : at);
    });

    const truncated = numbers.length > DAY_REPORT_MAX_NUMBERS;
    if (truncated) numbers = numbers.slice(0, DAY_REPORT_MAX_NUMBERS);

    let hits = logs
      .filter((l) => DAY_REPORT_HIT_TYPES.includes(l.callType))
      .map((l) => buildCallbackHit(l, timezone));

    const hitVisitIds = [
      ...new Set(hits.map((h) => h.visitId).filter(Boolean)),
    ];
    if (hitVisitIds.length) {
      const visits = await getVisitRepo().find({
        where: { id: In(hitVisitIds) },
        select: ['id', 'vendorId', 'campaignId'],
      });
      const visitMap = Object.fromEntries(visits.map((v) => [v.id, v]));
      hits = hits.map((hit) => {
        const visit = hit.visitId ? visitMap[hit.visitId] : null;
        return {
          ...hit,
          vendorId: hit.vendorId || visit?.vendorId || null,
          campaignId: hit.campaignId || visit?.campaignId || null,
        };
      });
    }

    const filteredNumbers = numbers.filter((row) =>
      matchesNumberFilters(row, filters),
    );
    const filteredHits = hits.filter((hit) => matchesHitFilters(hit, filters));
    const summary = {
      ...summarizeStories(filteredNumbers),
      ...summarizeHits(filteredHits),
    };

    const exportMode =
      filters.writeFile ||
      ['csv', 'txt', 'text'].includes(String(query.format || '').toLowerCase());
    const view = filters.view || 'numbers';
    let pageNumbers = filteredNumbers;
    let pageHits = filteredHits;
    let paging = {
      total: view === 'hits' ? filteredHits.length : filteredNumbers.length,
      page: 1,
      limit: view === 'hits' ? filteredHits.length : filteredNumbers.length,
      totalPages: 1,
    };
    if (!exportMode) {
      if (view === 'hits') {
        paging = paginateItems(filteredHits, filters.page, filters.limit);
        pageHits = paging.items;
        pageNumbers = [];
      } else {
        paging = paginateItems(filteredNumbers, filters.page, filters.limit);
        pageNumbers = paging.items;
        pageHits = [];
      }
    }

    const generatedAt = new Date().toISOString();
    const payload = {
      date,
      timezone,
      from: date,
      to: endDate,
      generatedAt,
      truncated,
      rangeClamped: Boolean(rangeClamped),
      summary,
      numbers: pageNumbers,
      hits: pageHits,
      view,
      total: paging.total,
      page: paging.page,
      limit: paging.limit,
      totalPages: paging.totalPages,
      filters: {
        campaignId: filters.campaignId,
        vendorId: filters.vendorId,
        outcome: filters.outcome,
        hitType: filters.hitType,
        q: filters.q,
        view,
      },
    };
    payload.text = formatDayReportText(
      { ...payload, numbers: filteredNumbers, hits: filteredHits },
      timezone,
    );
    return payload;
  };

  return {
    getSummary,
    listPostbacks,
    getPostbackById,
    getDayReport,
  };
}
