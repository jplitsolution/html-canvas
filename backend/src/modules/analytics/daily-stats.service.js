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
  eachYmd,
  emptyMetrics,
  groupStatsRows,
  totalsFromRows,
} from './helpers/daily-stats.js';

const TODAY_STALE_MS = 2 * 60 * 1000;
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

  const rollupDay = async (ymd, timezone = DEFAULT_TIMEZONE) => {
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

    const rolledAt = new Date();
    const entities = [...map.values()].map((row) =>
      getStatRepo().create({
        ...emptyMetrics(),
        ...row,
        statDate: date,
        timezone: tz,
        campaignId: n(row.campaignId),
        vendorId: n(row.vendorId),
        rolledAt,
      }),
    );

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
    const { rolledAt, count } = await lastRolledAt(ymd, tz);
    if (!force && count > 0) {
      if (ymd !== today) return { date: ymd, skipped: true, rows: count };
      if (rolledAt && Date.now() - rolledAt.getTime() < TODAY_STALE_MS) {
        return { date: ymd, skipped: true, rows: count };
      }
    }
    return rollupDay(ymd, tz);
  };

  const rollupRange = async (fromYmd, toYmd, timezone = DEFAULT_TIMEZONE, opts = {}) => {
    const days = eachYmd(fromYmd, toYmd).slice(0, MAX_ROLLUP_DAYS);
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
    const results = [];
    results.push(await rollupDay(yesterday, tz));
    results.push(await rollupDay(today, tz));
    return results;
  };

  const getReport = async (userId, query = {}) => {
    const timezone = normalizeTimezone(query.timezone || DEFAULT_TIMEZONE);
    let from = String(query.from || query.date || todayYmd(timezone)).slice(0, 10);
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
    await rollupRange(from, to, timezone);

    const { campaignIds, vendorIds, campaigns, vendors } = await resolveUserScope(userId);
    if (!campaignIds.length && !vendorIds.length) {
      return {
        from,
        to,
        timezone,
        groupBy,
        rangeClamped,
        source: 'daily_stats',
        totals: emptyMetrics(),
        rows: [],
      };
    }

    const campaignId = parseInt(query.campaignId, 10);
    const vendorId = parseInt(query.vendorId, 10);
    const qb = getStatRepo()
      .createQueryBuilder('s')
      .where('s.statDate BETWEEN :from AND :to', { from, to })
      .andWhere('s.timezone = :timezone', { timezone });

    if (Number.isFinite(campaignId) && campaignId > 0) {
      if (!campaignIds.includes(campaignId)) {
        return {
          from,
          to,
          timezone,
          groupBy,
          rangeClamped,
          source: 'daily_stats',
          totals: emptyMetrics(),
          rows: [],
        };
      }
      qb.andWhere('s.campaignId = :campaignId', { campaignId });
    } else if (campaignIds.length) {
      qb.andWhere('(s.campaignId IN (:...campaignIds) OR s.campaignId = 0)', {
        campaignIds,
      });
    }

    if (Number.isFinite(vendorId) && vendorId > 0) {
      if (!vendorIds.includes(vendorId)) {
        return {
          from,
          to,
          timezone,
          groupBy,
          rangeClamped,
          source: 'daily_stats',
          totals: emptyMetrics(),
          rows: [],
        };
      }
      qb.andWhere('s.vendorId = :vendorId', { vendorId });
    } else if (vendorIds.length) {
      qb.andWhere('(s.vendorId IN (:...vendorIds) OR s.vendorId = 0)', {
        vendorIds,
      });
    }

    const raw = await qb.orderBy('s.statDate', 'DESC').getMany();
    const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));
    const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));
    const named = raw.map((row) => ({
      ...row,
      campaignName: campaignMap[row.campaignId]?.name || (row.campaignId ? `Campaign #${row.campaignId}` : 'Unattributed'),
      vendorName: vendorMap[row.vendorId]?.name || (row.vendorId ? `Vendor #${row.vendorId}` : 'Unattributed'),
      vendorCode: vendorMap[row.vendorId]?.code || null,
    }));
    const rows = groupStatsRows(named, groupBy);
    return {
      from,
      to,
      timezone,
      groupBy: STAT_GROUP_BY_SAFE(groupBy),
      rangeClamped,
      source: 'daily_stats',
      totals: totalsFromRows(named),
      rows,
    };
  };

  return {
    rollupDay,
    rollupRange,
    rollupRecent,
    ensureDay,
    getReport,
  };
};

function STAT_GROUP_BY_SAFE(groupBy) {
  const allowed = ['date', 'campaign', 'vendor', 'campaign_vendor'];
  return allowed.includes(groupBy) ? groupBy : 'date';
}

export const dailyStatsService = createDailyStatsService();
