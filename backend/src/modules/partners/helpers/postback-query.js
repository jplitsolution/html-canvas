import { In } from 'typeorm';
import {
  ConversionPostbackStatus,
} from '../../../database/entities/conversion-postback.entity.js';
import {
  VisitEventType,
} from '../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { maskPhone, daysAgo } from './postback-register.js';

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

  const emptySummary = () => ({
    msisdnResolved: 0,
    postbacksCreated: 0,
    pending: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    byVendor: [],
    since: daysAgo(30).toISOString(),
  });

  const getSummary = async (userId, { days = 30 } = {}) => {
    const { campaignIds, vendorIds, vendors } = await resolveUserScope(userId);
    if (!campaignIds.length && !vendorIds.length) {
      return emptySummary();
    }

    const since = daysAgo(Math.min(Math.max(Number(days) || 30, 1), 365));
    const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));

    let msisdnResolved = 0;
    if (campaignIds.length) {
      msisdnResolved = await getVisitRepo()
        .createQueryBuilder('v')
        .where('v.campaignId IN (:...campaignIds)', { campaignIds })
        .andWhere('v.phone IS NOT NULL')
        .andWhere("v.phone <> ''")
        .andWhere('v.createdAt >= :since', { since })
        .getCount();
    }

    const pbQ = getPostbackRepo()
      .createQueryBuilder('p')
      .where('p.createdAt >= :since', { since });
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
          sent: 0,
          failed: 0,
          skipped: 0,
          total: 0,
        };
      }
      byVendorAcc[key].total += cnt;
      if (status === ConversionPostbackStatus.PENDING) byVendorAcc[key].pending += cnt;
      else if (status === ConversionPostbackStatus.SENT) byVendorAcc[key].sent += cnt;
      else if (status === ConversionPostbackStatus.FAILED) byVendorAcc[key].failed += cnt;
      else if (status === ConversionPostbackStatus.SKIPPED) byVendorAcc[key].skipped += cnt;
    }

    return {
      msisdnResolved,
      postbacksCreated,
      pending,
      sent,
      failed,
      skipped,
      byVendor: Object.values(byVendorAcc).sort((a, b) => b.total - a.total),
      since: since.toISOString(),
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
      (row.status === ConversionPostbackStatus.SENT ||
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

  return {
    getSummary,
    listPostbacks,
    getPostbackById,
  };
}
