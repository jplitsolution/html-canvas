import { getRepository } from '../../database/index.js';
import { DailyStat } from '../../database/entities/daily-stat.entity.js';
import { Visit } from '../../database/entities/visit.entity.js';
import { VisitEvent, VisitEventType } from '../../database/entities/visit-event.entity.js';
import { ConversionPostback, ConversionPostbackStatus } from '../../database/entities/conversion-postback.entity.js';
import { ApiCallLog, ApiCallType } from '../../database/entities/api-call-log.entity.js';
import { Campaign } from '../../database/entities/campaign.entity.js';
import { Vendor } from '../../database/entities/vendor.entity.js';
import {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
  resolveRangeBounds,
} from '../../common/zoned-day.js';
import { todayYmd } from '../partners/helpers/postback-day-report.js';
import {
  bumpMetric,
  bumpOperatorStatus,
  eachYmd,
  emptyMetrics,
  flattenOperatorStatus,
  groupStatsRows,
  parseOperatorStatusMap,
  totalsFromRows,
} from './helpers/daily-stats.js';

const MAX_ROLLUP_DAYS = 93;

const EVENT_METRIC = {
  [VisitEventType.OTP_SEND]: 'otpSend',
  [VisitEventType.OTP_VERIFY]: 'otpVerify',
  [VisitEventType.SUBSCRIBE_SUCCESS]: 'subscribeSuccess',
  [VisitEventType.SUBSCRIBE_FAILED]: 'subscribeFailed',
};

function n(value) {
  return Number(value) || 0;
}

export const createDailyStatsService = () => {
  const getStatRepo = () => getRepository(DailyStat);
  const getVisitRepo = () => getRepository(Visit);
  const getVisitEventRepo = () => getRepository(VisitEvent);
  const getPostbackRepo = () => getRepository(ConversionPostback);
  const getApiCallLogRepo = () => getRepository(ApiCallLog);
  const getCampaignRepo = () => getRepository(Campaign);
  const getVendorRepo = () => getRepository(Vendor);

  const resolveUserScope = async (userId) => {
    const [campaigns, vendors] = await Promise.all([
      getCampaignRepo().find({
        where: { userId },
        select: ['id', 'name'],
      }),
      getVendorRepo().find({
        where: { userId },
        select: ['id', 'name', 'code'],
      }),
    ]);
    return {
      campaigns,
      vendors,
      campaignIds: campaigns.map((c) => c.id),
      vendorIds: vendors.map((v) => v.id),
    };
  };

  const collectDay = async (ymd, timezone = DEFAULT_TIMEZONE, { persist = true } = {}) => {
    const date = String(ymd || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { date, rows: 0 };
    }
    const tz = normalizeTimezone(timezone);
    const { from, to } = resolveRangeBounds({ from: date, to: date, timezone: tz });
    const map = new Map();

    const visitRows = await getVisitRepo()
      .createQueryBuilder('v')
      .select('v.campaignId', 'campaignId')
      .addSelect('v.vendorId', 'vendorId')
      .addSelect('COUNT(*)', 'visits')
      .addSelect(
        `SUM(CASE WHEN v.phone IS NOT NULL AND v.phone <> '' THEN 1 ELSE 0 END)`,
        'msisdnResolved',
      )
      .where('v.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('v.campaignId')
      .addGroupBy('v.vendorId')
      .getRawMany();

    for (const row of visitRows) {
      bumpMetric(map, row.campaignId, row.vendorId, 'visits', n(row.visits));
      bumpMetric(map, row.campaignId, row.vendorId, 'msisdnResolved', n(row.msisdnResolved));
    }

    const eventTypes = Object.keys(EVENT_METRIC);
    const eventRows = await getVisitEventRepo()
      .createQueryBuilder('e')
      .innerJoin('e.visit', 'v')
      .select('v.campaignId', 'campaignId')
      .addSelect('v.vendorId', 'vendorId')
      .addSelect('e.eventType', 'eventType')
      .addSelect('COUNT(*)', 'cnt')
      .where('e.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('e.eventType IN (:...eventTypes)', { eventTypes })
      .groupBy('v.campaignId')
      .addGroupBy('v.vendorId')
      .addGroupBy('e.eventType')
      .getRawMany();

    for (const row of eventRows) {
      const field = EVENT_METRIC[row.eventType];
      if (field) bumpMetric(map, row.campaignId, row.vendorId, field, n(row.cnt));
    }

    const queuedRows = await getPostbackRepo()
      .createQueryBuilder('p')
      .select('p.campaignId', 'campaignId')
      .addSelect('p.vendorId', 'vendorId')
      .addSelect('p.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('p.campaignId')
      .addGroupBy('p.vendorId')
      .addGroupBy('p.status')
      .getRawMany();

    for (const row of queuedRows) {
      bumpMetric(map, row.campaignId, row.vendorId, 'postbacksQueued', n(row.cnt));
      const status = String(row.status || '');
      if (status === ConversionPostbackStatus.PENDING) {
        bumpMetric(map, row.campaignId, row.vendorId, 'pending', n(row.cnt));
      }
    }

    const sentRows = await getPostbackRepo()
      .createQueryBuilder('p')
      .select('p.campaignId', 'campaignId')
      .addSelect('p.vendorId', 'vendorId')
      .addSelect('p.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.sentAt BETWEEN :from AND :to', { from, to })
      .groupBy('p.campaignId')
      .addGroupBy('p.vendorId')
      .addGroupBy('p.status')
      .getRawMany();

    for (const row of sentRows) {
      const status = String(row.status || '');
      if (status === ConversionPostbackStatus.SENT) {
        bumpMetric(map, row.campaignId, row.vendorId, 'vendorSent', n(row.cnt));
      } else if (status === ConversionPostbackStatus.FAILED) {
        bumpMetric(map, row.campaignId, row.vendorId, 'vendorFailed', n(row.cnt));
      } else if (status === ConversionPostbackStatus.SKIPPED) {
        bumpMetric(map, row.campaignId, row.vendorId, 'skipped', n(row.cnt));
      }
    }

    const skipRows = await getPostbackRepo()
      .createQueryBuilder('p')
      .select('p.campaignId', 'campaignId')
      .addSelect('p.vendorId', 'vendorId')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.status = :skipped', { skipped: ConversionPostbackStatus.SKIPPED })
      .andWhere('p.sentAt IS NULL')
      .andWhere('p.updatedAt BETWEEN :from AND :to', { from, to })
      .groupBy('p.campaignId')
      .addGroupBy('p.vendorId')
      .getRawMany();

    for (const row of skipRows) {
      bumpMetric(map, row.campaignId, row.vendorId, 'skipped', n(row.cnt));
    }

    const heRows = await getApiCallLogRepo()
      .createQueryBuilder('l')
      .leftJoin(Visit, 'v', 'v.id = l.visitId')
      .select('COALESCE(l.campaignId, v.campaignId)', 'campaignId')
      .addSelect('v.vendorId', 'vendorId')
      .addSelect('COUNT(*)', 'cnt')
      .where('l.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('l.callType = :heRedirect', { heRedirect: ApiCallType.HE_REDIRECT })
      .andWhere('l.success = :fail', { fail: false })
      .groupBy('l.campaignId')
      .addGroupBy('v.campaignId')
      .addGroupBy('v.vendorId')
      .getRawMany();

    for (const row of heRows) {
      bumpMetric(map, row.campaignId, row.vendorId, 'heFailCg', n(row.cnt));
    }

    const unmatchedRows = await getApiCallLogRepo()
      .createQueryBuilder('l')
      .leftJoin(Visit, 'v', 'v.id = l.visitId')
      .select('COALESCE(l.campaignId, v.campaignId)', 'campaignId')
      .addSelect('v.vendorId', 'vendorId')
      .addSelect('COUNT(*)', 'cnt')
      .where('l.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('l.callType = :billing', { billing: ApiCallType.BILLING_CALLBACK })
      .andWhere('(l.success = :fail OR l.visitId IS NULL)', { fail: false })
      .groupBy('l.campaignId')
      .addGroupBy('v.campaignId')
      .addGroupBy('v.vendorId')
      .getRawMany();

    for (const row of unmatchedRows) {
      bumpMetric(map, row.campaignId, row.vendorId, 'unmatchedCallbacks', n(row.cnt));
    }

    const billingLogRows = await getApiCallLogRepo()
      .createQueryBuilder('l')
      .leftJoin(Visit, 'v', 'v.id = l.visitId')
      .select('COALESCE(l.campaignId, v.campaignId)', 'campaignId')
      .addSelect('v.vendorId', 'vendorId')
      .addSelect('COUNT(*)', 'cnt')
      .where('l.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('l.callType = :billing', { billing: ApiCallType.BILLING_CALLBACK })
      .andWhere('l.success = :ok', { ok: true })
      .andWhere('l.visitId IS NOT NULL')
      .groupBy('l.campaignId')
      .addGroupBy('v.campaignId')
      .addGroupBy('v.vendorId')
      .getRawMany();

    for (const row of billingLogRows) {
      bumpMetric(map, row.campaignId, row.vendorId, 'billingReceived', n(row.cnt));
    }

    try {
      const statusExpr =
        `LOWER(COALESCE(NULLIF((regexp_match(l.request_body, '"status"[[:space:]]*:[[:space:]]*"([^"]+)"'))[1], ''), 'unknown'))`;
      const statusRows = await getApiCallLogRepo()
        .createQueryBuilder('l')
        .leftJoin(Visit, 'v', 'v.id = l.visitId')
        .select('COALESCE(l.campaignId, v.campaignId)', 'campaignId')
        .addSelect('v.vendorId', 'vendorId')
        .addSelect(statusExpr, 'operatorStatus')
        .addSelect('COUNT(*)', 'cnt')
        .where('l.createdAt BETWEEN :from AND :to', { from, to })
        .andWhere('l.callType = :billing', { billing: ApiCallType.BILLING_CALLBACK })
        .groupBy('l.campaignId')
        .addGroupBy('v.campaignId')
        .addGroupBy('v.vendorId')
        .addGroupBy(statusExpr)
        .getRawMany();
      for (const row of statusRows) {
        bumpOperatorStatus(
          map,
          row.campaignId,
          row.vendorId,
          row.operatorStatus || 'unknown',
          n(row.cnt),
        );
      }
    } catch (err) {
      console.warn(`daily_stats operator status rollup (logs): ${err?.message || err}`);
      const fallbackRows = await getPostbackRepo()
        .createQueryBuilder('p')
        .select('p.campaignId', 'campaignId')
        .addSelect('p.vendorId', 'vendorId')
        .addSelect('LOWER(p.operatorStatus)', 'operatorStatus')
        .addSelect('COUNT(*)', 'cnt')
        .where('p.updatedAt BETWEEN :from AND :to', { from, to })
        .andWhere('p.operatorStatus IS NOT NULL')
        .andWhere("p.operatorStatus <> ''")
        .groupBy('p.campaignId')
        .addGroupBy('p.vendorId')
        .addGroupBy('LOWER(p.operatorStatus)')
        .getRawMany();
      for (const row of fallbackRows) {
        bumpOperatorStatus(
          map,
          row.campaignId,
          row.vendorId,
          row.operatorStatus || 'unknown',
          n(row.cnt),
        );
      }
    }

    if (!persist) return { date, timezone: tz, map };
    return persistDay(date, tz, map);
  };

  const rollupDay = (ymd, timezone = DEFAULT_TIMEZONE) =>
    collectDay(ymd, timezone, { persist: true });

  const aggregateDayFromRaw = (ymd, timezone = DEFAULT_TIMEZONE) =>
    collectDay(ymd, timezone, { persist: false });

  const persistDay = async (date, tz, map) => {
    const rolledAt = new Date();
    const entities = [...map.values()].map((row) => {
      const { operatorStatus, ...rest } = row;
      return getStatRepo().create({
        ...emptyMetrics(),
        ...rest,
        operatorStatusJson: parseOperatorStatusMap(operatorStatus),
        statDate: date,
        timezone: tz,
        campaignId: n(row.campaignId),
        vendorId: n(row.vendorId),
        rolledAt,
      });
    });

    await getStatRepo()
      .createQueryBuilder()
      .delete()
      .where('statDate = :date', { date })
      .andWhere('timezone = :tz', { tz })
      .execute();

    if (entities.length) {
      await getStatRepo().save(entities);
    }

    return { date, timezone: tz, rows: entities.length };
  };

  const dayNeedsOperatorBackfill = async (ymd, timezone) => {
    const row = await getStatRepo()
      .createQueryBuilder('s')
      .select('COUNT(*)', 'cnt')
      .where('s.statDate = :date', { date: ymd })
      .andWhere('s.timezone = :tz', { tz: timezone })
      .andWhere('s.operatorStatusJson IS NULL')
      .getRawOne();
    return n(row?.cnt) > 0;
  };

  const lastRolledAt = async (ymd, timezone) => {
    const row = await getStatRepo()
      .createQueryBuilder('s')
      .select('MAX(s.rolledAt)', 'rolledAt')
      .addSelect('COUNT(*)', 'cnt')
      .where('s.statDate = :date', { date: ymd })
      .andWhere('s.timezone = :tz', { tz: timezone })
      .getRawOne();
    return {
      rolledAt: row?.rolledAt ? new Date(row.rolledAt) : null,
      count: n(row?.cnt),
    };
  };

  const ensureDay = async (ymd, timezone = DEFAULT_TIMEZONE, { force = false } = {}) => {
    const tz = normalizeTimezone(timezone);
    const today = todayYmd(tz);
    if (ymd === today && !force) {
      return { date: ymd, skipped: true, rows: 0, reason: 'today_is_raw' };
    }
    const { count } = await lastRolledAt(ymd, tz);
    const needsOperator = count > 0 ? await dayNeedsOperatorBackfill(ymd, tz) : false;
    if (!force && !needsOperator && count > 0) {
      return { date: ymd, skipped: true, rows: count };
    }
    return rollupDay(ymd, tz);
  };

  const rollupRange = async (fromYmd, toYmd, timezone = DEFAULT_TIMEZONE, opts = {}) => {
    const tz = normalizeTimezone(timezone);
    const today = todayYmd(tz);
    const days = eachYmd(fromYmd, toYmd)
      .slice(0, MAX_ROLLUP_DAYS)
      .filter((day) => opts.force || day < today);
    const rolled = [];
    for (const day of days) {
      rolled.push(await ensureDay(day, timezone, opts));
    }
    return rolled;
  };

  const rollupRecent = async (timezone = DEFAULT_TIMEZONE) => {
    const tz = normalizeTimezone(timezone);
    const today = todayYmd(tz);
    const yesterdayDate = new Date(`${today}T00:00:00Z`);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);
    return [await rollupDay(yesterday, tz)];
  };

  const getReport = async (userId, query = {}) => {
    const timezone = normalizeTimezone(query.timezone || DEFAULT_TIMEZONE);
    const today = todayYmd(timezone);
    let from = String(query.from || query.date || today).slice(0, 10);
    let to = String(query.to || from).slice(0, 10);
    if (from > to) {
      const swap = from;
      from = to;
      to = swap;
    }
    const days = eachYmd(from, to);
    const rangeClamped = days.length > MAX_ROLLUP_DAYS;
    const usedDays = days.slice(0, MAX_ROLLUP_DAYS);
    to = usedDays[usedDays.length - 1] || from;

    const groupBy = String(query.groupBy || 'date');
    const includesToday = from <= today && to >= today;
    const yesterdayDate = new Date(`${today}T00:00:00Z`);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);
    const statsFrom = from;
    const statsTo = includesToday ? (from < today ? yesterday : null) : to;
    if (statsTo && statsFrom <= statsTo) {
      await rollupRange(statsFrom, statsTo, timezone);
    }

    const empty = (source) => ({
      from,
      to,
      timezone,
      groupBy,
      rangeClamped,
      source,
      todayLive: includesToday,
      totals: emptyMetrics(),
      rows: [],
    });

    const { campaignIds, vendorIds, campaigns, vendors } = await resolveUserScope(userId);
    if (!campaignIds.length && !vendorIds.length) {
      return empty(includesToday ? 'raw_today' : 'daily_stats');
    }

    const campaignId = parseInt(query.campaignId, 10);
    const vendorId = parseInt(query.vendorId, 10);
    if (Number.isFinite(campaignId) && campaignId > 0 && !campaignIds.includes(campaignId)) {
      return empty(includesToday ? 'raw_today' : 'daily_stats');
    }
    if (Number.isFinite(vendorId) && vendorId > 0 && !vendorIds.includes(vendorId)) {
      return empty(includesToday ? 'raw_today' : 'daily_stats');
    }

    const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));
    const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));
    const nameRow = (row, date = row.statDate) => {
      const cid = n(row.campaignId);
      const vid = n(row.vendorId);
      return {
        ...emptyMetrics(),
        ...row,
        statDate: date,
        timezone,
        campaignId: cid,
        vendorId: vid,
        operatorStatus: parseOperatorStatusMap(row.operatorStatus || row.operatorStatusJson),
        campaignName:
          campaignMap[cid]?.name || (cid ? `Campaign #${cid}` : 'Unattributed'),
        vendorName: vendorMap[vid]?.name || (vid ? `Vendor #${vid}` : 'Unattributed'),
        vendorCode: vendorMap[vid]?.code || null,
      };
    };
    const inScope = (row) => {
      const cid = n(row.campaignId);
      const vid = n(row.vendorId);
      if (Number.isFinite(campaignId) && campaignId > 0 && cid !== campaignId) return false;
      if (
        !(Number.isFinite(campaignId) && campaignId > 0) &&
        campaignIds.length &&
        cid !== 0 &&
        !campaignIds.includes(cid)
      ) {
        return false;
      }
      if (Number.isFinite(vendorId) && vendorId > 0 && vid !== vendorId) return false;
      if (
        !(Number.isFinite(vendorId) && vendorId > 0) &&
        vendorIds.length &&
        vid !== 0 &&
        !vendorIds.includes(vid)
      ) {
        return false;
      }
      return true;
    };

    const named = [];
    if (statsTo && statsFrom <= statsTo) {
      const qb = getStatRepo()
        .createQueryBuilder('s')
        .where('s.statDate BETWEEN :from AND :to', { from: statsFrom, to: statsTo })
        .andWhere('s.timezone = :timezone', { timezone });
      if (Number.isFinite(campaignId) && campaignId > 0) {
        qb.andWhere('s.campaignId = :campaignId', { campaignId });
      } else if (campaignIds.length) {
        qb.andWhere('(s.campaignId IN (:...campaignIds) OR s.campaignId = 0)', {
          campaignIds,
        });
      }
      if (Number.isFinite(vendorId) && vendorId > 0) {
        qb.andWhere('s.vendorId = :vendorId', { vendorId });
      } else if (vendorIds.length) {
        qb.andWhere('(s.vendorId IN (:...vendorIds) OR s.vendorId = 0)', {
          vendorIds,
        });
      }
      const stored = await qb.orderBy('s.statDate', 'DESC').getMany();
      named.push(...stored.map((row) => nameRow(row)));
    }

    if (includesToday) {
      const live = await aggregateDayFromRaw(today, timezone);
      for (const row of live.map.values()) {
        if (!inScope(row)) continue;
        named.push(nameRow(row, today));
      }
    }

    const source = includesToday
      ? statsTo && statsFrom <= statsTo
        ? 'daily_stats+raw_today'
        : 'raw_today'
      : 'daily_stats';
    const rows = groupStatsRows(named, groupBy);
    return {
      from,
      to,
      timezone,
      groupBy: STAT_GROUP_BY_SAFE(groupBy),
      rangeClamped,
      source,
      todayLive: includesToday,
      totals: totalsFromRows(named),
      rows,
    };
  };

  const getDashboardSummary = async (userId, query = {}) => {
    const timezone = normalizeTimezone(query.timezone || DEFAULT_TIMEZONE);
    let from = String(query.from || '').slice(0, 10);
    let to = String(query.to || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      const span = Math.min(Math.max(Number(query.days) || 30, 1), MAX_ROLLUP_DAYS);
      to = todayYmd(timezone);
      const dt = new Date(`${to}T00:00:00Z`);
      dt.setUTCDate(dt.getUTCDate() - (span - 1));
      from = dt.toISOString().slice(0, 10);
    }
    const dateReport = await getReport(userId, {
      ...query,
      from,
      to,
      timezone,
      groupBy: 'date',
    });
    const vendorReport = await getReport(userId, {
      ...query,
      from,
      to,
      timezone,
      groupBy: 'vendor',
    });
    const totals = dateReport.totals || emptyMetrics();
    const byOperatorStatus = flattenOperatorStatus(dateReport.rows);
    const callbacksReceived =
      byOperatorStatus.reduce((sum, row) => sum + (Number(row.count) || 0), 0) ||
      n(totals.billingReceived) + n(totals.unmatchedCallbacks);
    const byDateMap = Object.fromEntries(
      (dateReport.rows || []).map((row) => [row.statDate, row]),
    );
    const byDate = eachYmd(dateReport.from, dateReport.to).map((statDate) => {
      const row = byDateMap[statDate];
      return {
        statDate,
        visits: n(row?.visits),
        msisdnResolved: n(row?.msisdnResolved),
        otpSend: n(row?.otpSend),
        otpVerify: n(row?.otpVerify),
        subscribeSuccess: n(row?.subscribeSuccess),
        subscribeFailed: n(row?.subscribeFailed),
        postbacksQueued: n(row?.postbacksQueued),
        pending: n(row?.pending),
        billingReceived: n(row?.billingReceived),
        vendorSent: n(row?.vendorSent),
        vendorFailed: n(row?.vendorFailed),
        skipped: n(row?.skipped),
        unmatchedCallbacks: n(row?.unmatchedCallbacks),
        heFailCg: n(row?.heFailCg),
      };
    });

    return {
      visits: n(totals.visits),
      msisdnResolved: n(totals.msisdnResolved),
      heFailCg: n(totals.heFailCg),
      otpSend: n(totals.otpSend),
      otpVerify: n(totals.otpVerify),
      subscribeSuccess: n(totals.subscribeSuccess),
      subscribeFailed: n(totals.subscribeFailed),
      postbacksCreated: n(totals.postbacksQueued),
      pending: n(totals.pending),
      received: n(totals.billingReceived),
      sent: n(totals.vendorSent),
      failed: n(totals.vendorFailed),
      skipped: n(totals.skipped),
      unmatchedCallbacks: n(totals.unmatchedCallbacks),
      callbacksReceived,
      byOperatorStatus,
      byDate,
      byVendor: (vendorReport.rows || [])
        .map((row) => ({
          vendorId: row.vendorId || null,
          vendorName: row.vendorName,
          vendorCode: row.vendorCode,
          visits: n(row.visits),
          pending: n(row.pending),
          received: n(row.billingReceived),
          sent: n(row.vendorSent),
          failed: n(row.vendorFailed),
          skipped: n(row.skipped),
          total: n(row.postbacksQueued),
        }))
        .sort((a, b) => b.total - a.total || b.visits - a.visits),
      since: dateReport.from,
      until: dateReport.to,
      timezone: dateReport.timezone,
      source: dateReport.source,
      todayLive: Boolean(dateReport.todayLive),
    };
  };

  return {
    rollupDay,
    rollupRange,
    rollupRecent,
    ensureDay,
    aggregateDayFromRaw,
    getReport,
    getDashboardSummary,
  };
};

function STAT_GROUP_BY_SAFE(groupBy) {
  const allowed = ['date', 'campaign', 'vendor', 'campaign_vendor'];
  return allowed.includes(groupBy) ? groupBy : 'date';
}

export const dailyStatsService = createDailyStatsService();
