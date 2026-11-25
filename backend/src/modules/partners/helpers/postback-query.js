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
  describeVendorFireDecision,
} from './operator-callback-status.js';
import { filterCampaignsByMarket, parseMultiParam } from './campaign-market.js';
import {
  DAY_REPORT_EVENT_TYPES,
  DAY_REPORT_HE_LOG_TYPES,
  DAY_REPORT_HIT_TYPES,
  DAY_REPORT_LOG_TYPES,
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

function applyChecksubStatusFilter(qb, tokens) {
  const outcomes = [];
  const jobs = [];
  let includeEmptyOutcome = false;
  for (const token of tokens) {
    const raw = String(token || '').trim();
    if (!raw) continue;
    if (raw === 'outcome:__none__' || raw.toLowerCase() === 'none') {
      includeEmptyOutcome = true;
      continue;
    }
    if (raw.toLowerCase().startsWith('job:')) {
      const job = raw.slice(4).trim().toLowerCase();
      if (job) jobs.push(job);
      continue;
    }
    const outcome = raw.toLowerCase().startsWith('outcome:') ? raw.slice(8).trim() : raw;
    if (outcome) outcomes.push(outcome.toLowerCase());
  }
  const parts = [];
  const params = {};
  if (outcomes.length) {
    parts.push('LOWER(p.delayedChecksubOutcome) IN (:...checksubOutcomes)');
    params.checksubOutcomes = [...new Set(outcomes)];
  }
  if (jobs.length) {
    parts.push('LOWER(p.delayedChecksubStatus) IN (:...checksubJobs)');
    params.checksubJobs = [...new Set(jobs)];
  }
  if (includeEmptyOutcome) {
    parts.push("(p.delayedChecksubOutcome IS NULL OR p.delayedChecksubOutcome = '')");
  }
  if (!parts.length) return;
  qb.andWhere(`(${parts.join(' OR ')})`, params);
}

export function createPostbackQuery(deps) {
  const {
    getPostbackRepo,
    getVendorRepo,
    getVisitRepo,
    getCampaignRepo,
    getVisitEventRepo,
    getApiCallLogRepo,
    getTrackingRepo,
  } = deps;

  const resolveUserScope = async (userId) => {
    const [campaigns, vendors] = await Promise.all([
      getCampaignRepo().find({
        where: { userId },
        relations: { marketOperator: { country: true } },
      }),
      getVendorRepo().find({
        where: { userId },
        select: ['id', 'name', 'code'],
      }),
    ]);
    return {
      campaignIds: campaigns.map((c) => c.id),
      vendorIds: vendors.map((v) => v.id),
      campaigns,
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

  const serializePostback = (row, vendorMap = {}, campaignMap = {}) => {
    const vendor = row.vendorId ? vendorMap[row.vendorId] : null;
    const campaign = row.campaignId ? campaignMap[row.campaignId] : null;
    return {
      id: row.id,
      msisdn: maskPhone(row.msisdn),
      status: row.status,
      operatorStatus: row.operatorStatus || null,
      clickId: row.clickId,
      rcid: row.rcid,
      campid: row.campid,
      trackingCampid: row.trackingCampid,
      campaignId: row.campaignId,
      campaignName: campaign?.name || null,
      campaignTrackingId: campaign?.trackingId || null,
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
      delayedChecksubStatus: row.delayedChecksubStatus || null,
      delayedChecksubScheduledAt: row.delayedChecksubScheduledAt || null,
      delayedChecksubExecutedAt: row.delayedChecksubExecutedAt || null,
      delayedChecksubOutcome: row.delayedChecksubOutcome || null,
      delayedChecksubResponse: row.delayedChecksubResponse || null,
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
    received: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    heFailCg: 0,
    callbacksReceived: 0,
    byOperatorStatus: [],
    byVendor: [],
    since: daysAgo(30).toISOString(),
  });

  const getSummary = async (userId, query = {}) => {
    const { campaignIds, vendorIds, vendors, campaigns } =
      await resolveUserScope(userId);
    if (!campaignIds.length && !vendorIds.length) {
      return emptySummary();
    }

    const campaignIdFilter = parseInt(query.campaignId, 10);
    const vendorIdFilter = query.vendorId
      ? parseInt(query.vendorId, 10)
      : null;
    const offerCodeFilter = String(query.offerCode || '').trim();
    const scopedCampaigns = filterCampaignsByMarket(campaigns, query);
    const scopedCampaignIds = scopedCampaigns.map((c) => c.id);
    const askedForCampaign = Number.isFinite(campaignIdFilter) && campaignIdFilter > 0;
    if (askedForCampaign && scopedCampaignIds.length === 0) {
      return emptySummary();
    }

    if (scopedCampaignIds.length === 0 && !vendorIds.length) {
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
    if (scopedCampaignIds.length) {
      const visitQ = getVisitRepo()
        .createQueryBuilder('v')
        .where('v.campaignId IN (:...scopedCampaignIds)', { scopedCampaignIds })
        .andWhere('v.phone IS NOT NULL')
        .andWhere("v.phone <> ''")
        .andWhere('v.createdAt >= :since', { since });
      if (to) visitQ.andWhere('v.createdAt <= :until', { until: to });
      if (vendorIdFilter && !Number.isNaN(vendorIdFilter)) {
        visitQ.andWhere('v.vendorId = :vendorIdFilter', { vendorIdFilter });
      }
      msisdnResolved = await visitQ.getCount();

      const failQ = getApiCallLogRepo()
        .createQueryBuilder('l')
        .where('l.campaignId IN (:...scopedCampaignIds)', { scopedCampaignIds })
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
    if (scopedCampaignIds.length && vendorIds.length) {
      pbQ.andWhere(
        '(p.campaignId IN (:...scopedCampaignIds) OR p.vendorId IN (:...vendorIds))',
        { scopedCampaignIds, vendorIds },
      );
    } else if (scopedCampaignIds.length) {
      pbQ.andWhere('p.campaignId IN (:...scopedCampaignIds)', { scopedCampaignIds });
    } else {
      pbQ.andWhere('p.vendorId IN (:...vendorIds)', { vendorIds });
    }
    if (vendorIdFilter && !Number.isNaN(vendorIdFilter)) {
      pbQ.andWhere('p.vendorId = :vendorIdFilter', { vendorIdFilter });
    }
    if (offerCodeFilter) {
      pbQ.andWhere('p.offerCode = :offerCodeFilter', { offerCodeFilter });
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

    const opQ = getPostbackRepo()
      .createQueryBuilder('p')
      .where('p.createdAt >= :since', { since })
      .andWhere('p.operatorStatus IS NOT NULL')
      .andWhere("p.operatorStatus <> ''");
    if (to) opQ.andWhere('p.createdAt <= :until', { until: to });
    if (scopedCampaignIds.length && vendorIds.length) {
      opQ.andWhere(
        '(p.campaignId IN (:...scopedCampaignIds) OR p.vendorId IN (:...vendorIds))',
        { scopedCampaignIds, vendorIds },
      );
    } else if (scopedCampaignIds.length) {
      opQ.andWhere('p.campaignId IN (:...scopedCampaignIds)', { scopedCampaignIds });
    } else {
      opQ.andWhere('p.vendorId IN (:...vendorIds)', { vendorIds });
    }
    if (vendorIdFilter && !Number.isNaN(vendorIdFilter)) {
      opQ.andWhere('p.vendorId = :vendorIdFilter', { vendorIdFilter });
    }
    if (offerCodeFilter) {
      opQ.andWhere('p.offerCode = :offerCodeFilter', { offerCodeFilter });
    }
    const operatorRows = await opQ
      .select('LOWER(p.operatorStatus)', 'operatorStatus')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('LOWER(p.operatorStatus)')
      .getRawMany();
    const latestByOperatorStatus = operatorRows
      .map((r) => ({
        status: String(r.operatorStatus || 'unknown'),
        count: Number(r.cnt) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    let callbacksReceived = 0;
    let byOperatorStatus = latestByOperatorStatus;
    if (scopedCampaignIds.length) {
      try {
        const statusExpr =
          `LOWER(COALESCE(NULLIF((regexp_match(l.request_body, '"status"[[:space:]]*:[[:space:]]*"([^"]+)"'))[1], ''), 'unknown'))`;
        const cbQ = getApiCallLogRepo()
          .createQueryBuilder('l')
          .where('l.callType = :cbType', { cbType: ApiCallType.BILLING_CALLBACK })
          .andWhere('l.campaignId IN (:...scopedCampaignIds)', { scopedCampaignIds })
          .andWhere('l.createdAt >= :since', { since });
        if (to) cbQ.andWhere('l.createdAt <= :until', { until: to });
        const cbRows = await cbQ
          .select(statusExpr, 'operatorStatus')
          .addSelect('COUNT(*)', 'cnt')
          .groupBy(statusExpr)
          .getRawMany();
        const hits = [];
        for (const row of cbRows) {
          const count = Number(row.cnt) || 0;
          callbacksReceived += count;
          hits.push({
            status: String(row.operatorStatus || 'unknown'),
            count,
          });
        }
        hits.sort((a, b) => b.count - a.count);
        if (hits.length) byOperatorStatus = hits;
      } catch (err) {
        console.warn(`callback status aggregation failed: ${err?.message || err}`);
        callbacksReceived = latestByOperatorStatus.reduce((n, r) => n + r.count, 0);
      }
    } else {
      callbacksReceived = latestByOperatorStatus.reduce((n, r) => n + r.count, 0);
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
      callbacksReceived,
      byOperatorStatus,
      byVendor: Object.values(byVendorAcc).sort((a, b) => b.total - a.total),
      since: since.toISOString(),
      until: to ? to.toISOString() : null,
    };
  };

  const listStatusOptions = async (userId) => {
    const { campaignIds, vendorIds } = await resolveUserScope(userId);
    if (!campaignIds.length && !vendorIds.length) {
      return { statuses: [], checksub: [] };
    }
    const scoped = () => {
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
      return qb;
    };

    const statusRows = await scoped()
      .select('p.status', 'value')
      .addSelect('COUNT(*)', 'count')
      .andWhere("p.status IS NOT NULL AND p.status <> ''")
      .groupBy('p.status')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    const outcomeRows = await scoped()
      .select('p.delayedChecksubOutcome', 'value')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.delayedChecksubOutcome')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    const jobRows = await scoped()
      .select('p.delayedChecksubStatus', 'value')
      .addSelect('COUNT(*)', 'count')
      .andWhere("p.delayedChecksubStatus IS NOT NULL AND p.delayedChecksubStatus <> ''")
      .groupBy('p.delayedChecksubStatus')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    const jobLabels = {
      pending: 'Pending (not checked yet)',
      completed: 'Completed',
      failed: 'Check failed',
      skipped: 'Skipped',
    };
    const checksub = [];
    for (const row of outcomeRows) {
      const value = String(row.value || '').trim();
      const count = Number(row.count) || 0;
      if (!value) {
        if (count) {
          checksub.push({
            value: 'outcome:__none__',
            label: 'No 30m result',
            group: 'result',
            count,
          });
        }
        continue;
      }
      checksub.push({
        value: `outcome:${value}`,
        label: value,
        group: 'result',
        count,
      });
    }
    for (const row of jobRows) {
      const value = String(row.value || '').trim();
      if (!value) continue;
      const key = value.toLowerCase();
      checksub.push({
        value: `job:${key}`,
        label: jobLabels[key] || value,
        group: 'job',
        count: Number(row.count) || 0,
      });
    }

    return {
      statuses: statusRows
        .filter((row) => String(row.value || '').trim())
        .map((row) => ({
          value: String(row.value),
          label: String(row.value),
          count: Number(row.count) || 0,
        })),
      checksub,
    };
  };

  const listPostbacks = async (userId, query = {}) => {
    const { campaignIds, vendorIds, campaigns, vendors } = await resolveUserScope(userId);
    if (!campaignIds.length && !vendorIds.length) {
      return { total: 0, page: 1, limit: 25, items: [] };
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
    const statuses = parseMultiParam(query.status).map((value) => value.toLowerCase());
    const checksubTokens = parseMultiParam(query.checksubStatus);
    const operatorStatus = String(query.operatorStatus || '').trim().toLowerCase();
    const q = String(query.q || '').trim();
    const vendorIdFilter = query.vendorId
      ? parseInt(query.vendorId, 10)
      : null;
    const campaignIdFilter = parseInt(query.campaignId, 10);
    const offerCodeFilter = String(query.offerCode || '').trim();
    const campidFilter = String(query.campid || '').trim();
    const wantsCampaignScope = Boolean(
      String(query.country || '').trim() ||
        String(query.operator || '').trim() ||
        (Number.isFinite(campaignIdFilter) && campaignIdFilter > 0),
    );

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

    if (wantsCampaignScope) {
      const matchedCampaignIds = filterCampaignsByMarket(campaigns, query).map((c) => c.id);
      if (!matchedCampaignIds.length) {
        return { total: 0, page, limit, items: [] };
      }
      qb.andWhere('p.campaignId IN (:...matchedCampaignIds)', { matchedCampaignIds });
    }
    if (statuses.length === 1) {
      qb.andWhere('LOWER(p.status) = :status', { status: statuses[0] });
    } else if (statuses.length > 1) {
      qb.andWhere('LOWER(p.status) IN (:...statuses)', { statuses });
    }
    if (checksubTokens.length) {
      applyChecksubStatusFilter(qb, checksubTokens);
    }
    if (operatorStatus) {
      qb.andWhere('LOWER(p.operatorStatus) = :operatorStatus', { operatorStatus });
    }
    if (vendorIdFilter && !Number.isNaN(vendorIdFilter)) {
      qb.andWhere('p.vendorId = :vendorIdFilter', { vendorIdFilter });
    }
    if (offerCodeFilter) {
      qb.andWhere('p.offerCode = :offerCodeFilter', { offerCodeFilter });
    }
    if (campidFilter) {
      const campidLike = `%${campidFilter.replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        "(LOWER(p.campid) LIKE :campidLike OR LOWER(p.trackingCampid) LIKE :campidLike)",
        { campidLike: campidLike.toLowerCase() },
      );
    }
    if (q) {
      const like = `%${q}%`;
      qb.andWhere(
        '(p.msisdn LIKE :like OR p.clickId LIKE :like OR p.rcid LIKE :like OR p.campid LIKE :like OR p.trackingCampid LIKE :like OR p.offerCode LIKE :like)',
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

    const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));
    const missingCids = [
      ...new Set(
        rows
          .map((r) => r.campaignId)
          .filter((id) => id && !campaignMap[id]),
      ),
    ];
    if (missingCids.length) {
      const extra = await getCampaignRepo().find({
        where: { id: In(missingCids) },
        select: ['id', 'name', 'country', 'operator'],
      });
      for (const c of extra) campaignMap[c.id] = c;
    }

    return {
      total,
      page,
      limit,
      items: rows.map((r) => serializePostback(r, vendorMap, campaignMap)),
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

    let campaign = null;
    if (row.campaignId) {
      campaign = await getCampaignRepo().findOne({
        where: { id: parseInt(row.campaignId, 10) },
        select: ['id', 'name', 'country', 'operator'],
      });
    }
    const campaignMap = campaign ? { [campaign.id]: campaign } : {};

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

    let allowedConfig = null;
    try {
      if (row.campaignId && row.vendorId && getTrackingRepo) {
        const tracking = await getTrackingRepo().findOne({
          where: {
            campaignId: parseInt(row.campaignId, 10),
            vendorId: parseInt(row.vendorId, 10),
          },
        });
        if (tracking?.allowedCallbackStatuses?.trim()) {
          allowedConfig = tracking.allowedCallbackStatuses.trim();
        }
      }
      if (!allowedConfig && vendor?.allowedCallbackStatuses?.trim()) {
        allowedConfig = vendor.allowedCallbackStatuses.trim();
      }
      if (!allowedConfig && row.campaignId && getCampaignRepo) {
        const campaign = await getCampaignRepo().findOne({
          where: { id: parseInt(row.campaignId, 10) },
        });
        if (campaign?.allowedCallbackStatuses?.trim()) {
          allowedConfig = campaign.allowedCallbackStatuses.trim();
        }
      }
    } catch {
      allowedConfig = null;
    }
    const fireDecision = row.operatorStatus
      ? describeVendorFireDecision(row.operatorStatus, allowedConfig)
      : describeVendorFireDecision('', allowedConfig);
    const vendorFireSkipReason =
      billingReceived &&
      !vendorFired &&
      row.operatorStatus &&
      fireDecision &&
      !fireDecision.shouldFire
        ? fireDecision.info
        : null;

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
      ...serializePostback(row, vendorMap, campaignMap),
      lifecycle: {
        created: true,
        createdAt: row.createdAt,
        billingReceived,
        billingReceivedAt,
        operatorStatus: row.operatorStatus || null,
        allowedStatuses: fireDecision.allowedLabel,
        receivedStatus: row.operatorStatus || fireDecision.received || null,
        vendorFireSkipReason,
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
    // A picked offer/vendor must narrow the query. OR-ing every vendor the
    // user owns ignores the offer filter and pulls other offers into the file.
    if (filters.campaignId) {
      pbQ.andWhere('p.campaignId = :filterCampaignId', {
        filterCampaignId: filters.campaignId,
      });
    }
    if (filters.vendorId) {
      pbQ.andWhere('p.vendorId = :filterVendorId', {
        filterVendorId: filters.vendorId,
      });
    }
    if (!filters.campaignId && !filters.vendorId) {
      applyUserScope(pbQ, 'p', campaignIds, vendorIds);
    }
    if (filters.q) {
      const like = `%${filters.q}%`;
      pbQ.andWhere(
        '(p.msisdn LIKE :like OR p.clickId LIKE :like OR p.rcid LIKE :like OR p.campid LIKE :like OR p.trackingCampid LIKE :like)',
        { like },
      );
    }
    const postbacks = await pbQ.orderBy('p.id', 'DESC').getMany();

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
      logQ.andWhere(
        `(l.campaignId IN (:...campaignIds) OR ${unmatchedHits})`,
        { campaignIds: scopedCampaignIds, hitTypes },
      );
    } else if (seedMsisdns.length || seedVisitIds.length) {
      const parts = [unmatchedHits];
      if (seedMsisdns.length) parts.push('l.msisdn IN (:...seedMsisdns)');
      if (seedVisitIds.length) parts.push('l.visitId IN (:...seedVisitIds)');
      logQ.andWhere(`(${parts.join(' OR ')})`, {
        hitTypes,
        ...(seedMsisdns.length ? { seedMsisdns } : {}),
        ...(seedVisitIds.length ? { seedVisitIds } : {}),
      });
    } else {
      logQ.andWhere(unmatchedHits, { hitTypes });
    }
    const logs = await logQ.orderBy('l.id', 'ASC').getMany();

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
      events = await eventQ.orderBy('e.id', 'ASC').getMany();
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
      const extra = [];
      for (let i = 0; i < missingMsisdns.length; i += 1000) {
        const chunk = missingMsisdns.slice(i, i + 1000);
        const rows = await getPostbackRepo().find({
          where: { msisdn: In(chunk) },
        });
        extra.push(...rows);
      }
      for (const row of extra) {
        const bucket = ensure(row.msisdn);
        if (!bucket) continue;
        const rowCampaignId = row.campaignId ? Number(row.campaignId) : null;
        const rowVendorId = row.vendorId ? Number(row.vendorId) : null;
        if (filters.campaignId && rowCampaignId !== Number(filters.campaignId)) {
          continue;
        }
        if (filters.vendorId && rowVendorId !== Number(filters.vendorId)) {
          continue;
        }
        const inScope =
          (rowCampaignId && scopedCampaignIds.includes(rowCampaignId)) ||
          (rowVendorId && scopedVendorIds.includes(rowVendorId));
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

    let hits = logs
      .filter((l) => DAY_REPORT_HIT_TYPES.includes(l.callType))
      .map((l) => buildCallbackHit(l, timezone));

    const hitVisitIds = [
      ...new Set(hits.map((h) => h.visitId).filter(Boolean)),
    ];
    if (hitVisitIds.length) {
      const visits = [];
      for (let i = 0; i < hitVisitIds.length; i += 1000) {
        const chunk = hitVisitIds.slice(i, i + 1000);
        const rows = await getVisitRepo().find({
          where: { id: In(chunk) },
          select: ['id', 'vendorId', 'campaignId'],
        });
        visits.push(...rows);
      }
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
      truncated: false,
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
    listStatusOptions,
    listPostbacks,
    getPostbackById,
    getDayReport,
  };
}
