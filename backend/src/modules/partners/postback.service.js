import axios from 'axios';
import { In } from 'typeorm';
import { getRepository } from '../../database/index.js';
import { Vendor } from './entities/vendor.entity.js';
import {
  ConversionPostback,
  ConversionPostbackStatus,
} from './entities/conversion-postback.entity.js';
import { Visit } from '../analytics/entities/visit.entity.js';
import { analyticsService } from '../analytics/analytics.service.js';
import {
  VisitEvent,
  VisitEventType,
} from '../analytics/entities/visit-event.entity.js';
import { searchService } from '../search/search.service.js';
import { apiCallLogService } from '../flow/api-call-log.service.js';
import {
  ApiCallLog,
  ApiCallType,
} from '../flow/entities/api-call-log.entity.js';
import { Campaign } from '../campaigns/entities/campaign.entity.js';

/**
 * Vendor CPA postbacks (SAFWAP callback_manage parity).
 *
 * Placeholders in postback_url:
 *   {{msisdn}} {{click_id}} {{rcid}} {{campid}} {{camp}} {{tracking_campid}}
 *   {{offer_code}} {{visit_id}} {{vendor}}
 * Also supports SAFWAP single-brace form: {msisdn}, {rcid}, {campid}
 *
 * click_id = our generated id; rcid = network original click.
 * campid / camp = vendor campid from tracking URL (NOT our BF-OBF-11).
 * tracking_campid = our tracking id.
 */
export const createPostbackService = () => {
  const getPostbackRepo = () => getRepository(ConversionPostback);
  const getVendorRepo = () => getRepository(Vendor);
  const getVisitRepo = () => getRepository(Visit);
  const getCampaignRepo = () => getRepository(Campaign);
  const getVisitEventRepo = () => getRepository(VisitEvent);
  const getApiCallLogRepo = () => getRepository(ApiCallLog);

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

  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  };

  const maskPhone = (phone) => {
    if (!phone) return undefined;
    const trimmed = String(phone).trim();
    if (trimmed.length <= 4) return '****';
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-2)}`;
  };

  const serializeBody = (data) => {
    if (data == null) return null;
    try {
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch {
      return String(data);
    }
  };

  const fillTemplate = (template, vars) => {
    let url = String(template || '');
    for (const [key, val] of Object.entries(vars)) {
      url = url.split(`{{${key}}}`).join(encodeURIComponent(val ?? ''));
      url = url.split(`{${key}}`).join(encodeURIComponent(val ?? ''));
    }
    return url;
  };

  const resolvePostbackTemplate = async (vendorId) => {
    let template = '';
    if (vendorId) {
      const vendor = await getVendorRepo().findOne({ where: { id: vendorId } });
      if (vendor?.postbackUrl?.trim()) template = vendor.postbackUrl.trim();
    }
    return { template, vendorId };
  };

  const indexPostbackEvent = async (row, eventType, extra = {}) => {
    void searchService.indexEvent({
      campaignId: row.campaignId,
      visitId: row.visitId,
      vendorId: row.vendorId,
      affiliateId: row.affiliateId,
      clickId: row.clickId,
      rcid: row.rcid,
      campid: row.campid,
      trackingCampid: row.trackingCampid,
      phoneMasked: maskPhone(row.msisdn),
      eventType,
      status: row.status,
      responseStatus: row.httpStatus,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  };

  const logApiCall = async (input) => {
    try {
      await apiCallLogService.record(input);
    } catch (err) {
      console.warn(`postback api_call_logs write failed: ${err.message}`);
    }
  };

  /**
   * Queue a pending postback (confirm / CG / HE new redirect).
   * MSISDN-unique upsert: same number → update clickId, rcid, vendor campid
   * and reset status to pending (SAFWAP sendcallback=0 parity).
   * campid = vendor; trackingCampid = ours.
   */
  const registerPending = async (input) => {
    const msisdn = String(input.msisdn || input.phone || '').replace(/\D/g, '');
    if (!msisdn) {
      return { skipped: true, reason: 'missing msisdn' };
    }

    let vendorId = input.vendorId || null;
    let clickId = input.clickId || '';
    let rcid = input.rcid || '';
    let campid = String(input.campid || '').trim();
    let trackingCampid = String(
      input.trackingCampid || input.tracking_campid || '',
    ).trim();
    let visitId = input.visitId || null;
    let campaignId = input.campaignId || null;

    if (
      visitId &&
      (!vendorId || !clickId || !rcid || !campid || !trackingCampid || !campaignId)
    ) {
      const visit = await getVisitRepo().findOne({
        where: { id: parseInt(visitId, 10) },
      });
      if (visit) {
        vendorId = vendorId || visit.vendorId || null;
        clickId = clickId || visit.clickId || '';
        rcid = rcid || visit.rcid || '';
        campaignId = campaignId || visit.campaignId || null;
        if (!campid && visit.campid) campid = String(visit.campid);
        if (!trackingCampid && visit.trackingCampid) {
          trackingCampid = String(visit.trackingCampid);
        }
      }
    }

    // Legacy rows: if only one id was stored as click_id, treat as rcid for network.
    if (!rcid && clickId && input.legacyClickAsRcid) {
      rcid = clickId;
    }

    const { template, vendorId: resolvedVendorId } =
      await resolvePostbackTemplate(vendorId);
    vendorId = resolvedVendorId || vendorId;

    if (!template) {
      return { skipped: true, reason: 'no postback_url on vendor' };
    }

    const existing = await getPostbackRepo()
      .createQueryBuilder('p')
      .where('p.msisdn = :msisdn', { msisdn })
      .orderBy('p.id', 'DESC')
      .take(1)
      .getOne();

    const parsedVisitId = visitId ? parseInt(visitId, 10) : null;

    if (existing) {
      existing.clickId = clickId || existing.clickId || null;
      existing.rcid = rcid || existing.rcid || null;
      existing.campid = campid || existing.campid || null;
      if (trackingCampid) existing.trackingCampid = trackingCampid;
      if (parsedVisitId) existing.visitId = parsedVisitId;
      if (campaignId) existing.campaignId = campaignId;
      if (vendorId) existing.vendorId = vendorId;
      existing.postbackUrl = template;
      existing.status = ConversionPostbackStatus.PENDING;
      existing.httpStatus = null;
      existing.responseBody = null;
      existing.errorMessage = null;
      existing.sentAt = null;
      if (input.offerCode) existing.offerCode = input.offerCode;

      const row = await getPostbackRepo().save(existing);

      if (parsedVisitId) {
        await analyticsService.logEvent(
          parsedVisitId,
          VisitEventType.POSTBACK_PENDING,
          {
            info: 'Vendor CPA postback updated (msisdn upsert) — waiting for billing callback.',
            postbackId: row.id,
            updated: true,
            rcid: row.rcid,
            clickId: row.clickId,
            campid: row.campid,
            trackingCampid: row.trackingCampid,
            postbackUrl: template,
          },
        );
      } else {
        await indexPostbackEvent(row, 'POSTBACK_PENDING', { updated: true });
      }

      if (input.fireImmediate) {
        return firePostback(row.id);
      }

      return { success: true, id: row.id, status: 'pending', updated: true };
    }

    const row = await getPostbackRepo().save(
      getPostbackRepo().create({
        visitId: parsedVisitId,
        campaignId: campaignId || null,
        vendorId: vendorId || null,
        affiliateId: null,
        msisdn,
        campid: campid || null,
        trackingCampid: trackingCampid || null,
        clickId: clickId || null,
        rcid: rcid || null,
        offerCode: input.offerCode || null,
        postbackUrl: template,
        status: ConversionPostbackStatus.PENDING,
      }),
    );

    if (parsedVisitId) {
      await analyticsService.logEvent(
        parsedVisitId,
        VisitEventType.POSTBACK_PENDING,
        {
          info: 'Vendor CPA postback queued — waiting for billing callback.',
          postbackId: row.id,
          rcid: row.rcid,
          clickId: row.clickId,
          campid: row.campid,
          trackingCampid: row.trackingCampid,
          postbackUrl: template,
        },
      );
    } else {
      await indexPostbackEvent(row, 'POSTBACK_PENDING');
    }

    if (input.fireImmediate) {
      return firePostback(row.id);
    }

    return { success: true, id: row.id, status: 'pending' };
  };

  const firePostback = async (postbackId) => {
    const row = await getPostbackRepo().findOne({
      where: { id: parseInt(postbackId, 10) },
    });
    if (!row) {
      return { skipped: true, reason: 'postback not found' };
    }
    if (row.status === ConversionPostbackStatus.SENT) {
      return { skipped: true, reason: 'already sent', id: row.id };
    }

    let vendorCode = '';
    if (row.vendorId) {
      const v = await getVendorRepo().findOne({ where: { id: row.vendorId } });
      vendorCode = v?.code || '';
    }

    const networkRcid = row.rcid || row.clickId || '';
    const ourClickId = row.clickId || '';
    const vendorCampid = row.campid || '';

    const url = fillTemplate(row.postbackUrl, {
      msisdn: row.msisdn,
      click_id: ourClickId,
      rcid: networkRcid,
      campid: vendorCampid,
      camp: vendorCampid,
      tracking_campid: row.trackingCampid || '',
      offer_code: row.offerCode || '',
      visit_id: row.visitId != null ? String(row.visitId) : '',
      vendor: vendorCode,
      affiliate: '',
    });

    try {
      console.log(`Vendor postback → GET ${url}`);
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true,
      });
      const body =
        typeof response.data === 'string'
          ? response.data.slice(0, 2000)
          : JSON.stringify(response.data).slice(0, 2000);

      const ok = response.status >= 200 && response.status < 300;
      row.status = ok
        ? ConversionPostbackStatus.SENT
        : ConversionPostbackStatus.FAILED;
      row.httpStatus = response.status;
      row.responseBody = body;
      row.sentAt = new Date();
      row.errorMessage = ok ? null : `HTTP ${response.status}`;
      await getPostbackRepo().save(row);

      await logApiCall({
        visitId: row.visitId,
        campaignId: row.campaignId,
        msisdn: row.msisdn,
        rcid: row.rcid,
        clickId: row.clickId,
        callType: ApiCallType.VENDOR_POSTBACK,
        requestUrl: url,
        requestBody: serializeBody({
          method: 'GET',
          postbackId: row.id,
          vendorId: row.vendorId,
          campid: vendorCampid,
          trackingCampid: row.trackingCampid,
          template: row.postbackUrl,
        }),
        responseStatus: response.status,
        responseBody: body,
        success: ok,
        errorMessage: ok ? null : `HTTP ${response.status}`,
        statusLabel: ok ? 'SUCCESS' : 'FAILED',
      });

      const eventType = ok
        ? VisitEventType.POSTBACK_SENT
        : VisitEventType.POSTBACK_FAILED;

      if (row.visitId) {
        await analyticsService.logEvent(row.visitId, eventType, {
          info: ok
            ? 'Vendor / affiliate CPA postback fired successfully.'
            : `Vendor / affiliate CPA postback failed (HTTP ${response.status}).`,
          postbackId: row.id,
          httpStatus: response.status,
          url,
          campid: vendorCampid,
          trackingCampid: row.trackingCampid,
          responseBody: body,
        });
      } else {
        await indexPostbackEvent(row, eventType, { requestUrl: url });
      }

      return {
        success: ok,
        id: row.id,
        url,
        httpStatus: response.status,
        status: row.status,
        responseBody: body,
      };
    } catch (err) {
      row.status = ConversionPostbackStatus.FAILED;
      row.errorMessage = err.message;
      row.sentAt = new Date();
      await getPostbackRepo().save(row);

      await logApiCall({
        visitId: row.visitId,
        campaignId: row.campaignId,
        msisdn: row.msisdn,
        rcid: row.rcid,
        clickId: row.clickId,
        callType: ApiCallType.VENDOR_POSTBACK,
        requestUrl: url,
        requestBody: serializeBody({
          method: 'GET',
          postbackId: row.id,
          vendorId: row.vendorId,
          campid: vendorCampid,
          trackingCampid: row.trackingCampid,
          template: row.postbackUrl,
        }),
        responseStatus: err.response?.status ?? null,
        responseBody: serializeBody(err.response?.data),
        success: false,
        errorMessage: err.message,
        statusLabel: 'FAILED',
      });

      if (row.visitId) {
        await analyticsService.logEvent(
          row.visitId,
          VisitEventType.POSTBACK_FAILED,
          {
            info: `Vendor / affiliate CPA postback error: ${err.message}`,
            postbackId: row.id,
            error: err.message,
            url,
            campid: vendorCampid,
            trackingCampid: row.trackingCampid,
          },
        );
      } else {
        await indexPostbackEvent(row, 'POSTBACK_FAILED', {
          requestUrl: url,
        });
      }

      return {
        success: false,
        id: row.id,
        url,
        error: err.message,
        status: row.status,
      };
    }
  };

  /**
   * Operator/billing notifies us. Find latest pending by msisdn and fire vendor postback.
   */
  const processOperatorCallback = async (query = {}) => {
    const msisdn = String(query.msisdn || query.phone || '').replace(/\D/g, '');
    const status = String(query.status || 'active').toLowerCase();

    if (!msisdn) {
      return { skipped: true, reason: 'msisdn required' };
    }

    const okStatuses = new Set([
      '',
      'active',
      'success',
      'ok',
      'subscribed',
      '1',
      'true',
    ]);
    if (status && !okStatuses.has(status)) {
      return { skipped: true, reason: `status=${status} ignored` };
    }

    const pending = await getPostbackRepo().findOne({
      where: { msisdn, status: ConversionPostbackStatus.PENDING },
      order: { id: 'DESC' },
    });

    const logInbound = async (visitId, campaignId, clickId, rcid, extra = {}) => {
      const safeQuery = { ...query };
      if (safeQuery.msisdn) safeQuery.msisdn = maskPhone(safeQuery.msisdn);
      if (safeQuery.phone) safeQuery.phone = maskPhone(safeQuery.phone);

      if (visitId) {
        await analyticsService.logEvent(visitId, VisitEventType.CALLBACK_RECEIVED, {
          info: 'Billing / operator callback received — firing vendor postback.',
          msisdn: maskPhone(msisdn),
          status,
          ...extra,
        });
      }
      await logApiCall({
        visitId: visitId || null,
        campaignId: campaignId || null,
        msisdn,
        rcid: rcid || null,
        clickId: clickId || null,
        callType: ApiCallType.BILLING_CALLBACK,
        requestUrl: '/api/flow/callback',
        requestBody: serializeBody({
          msisdn: maskPhone(msisdn),
          status,
          query: safeQuery,
          ...extra,
        }),
        responseStatus: 200,
        responseBody: null,
        success: true,
        statusLabel: 'RECEIVED',
      });
    };

    if (!pending) {
      const visit = await getVisitRepo()
        .createQueryBuilder('v')
        .where('v.phone = :msisdn', { msisdn })
        .andWhere('(v.rcid IS NOT NULL OR v.click_id IS NOT NULL)')
        .orderBy('v.id', 'DESC')
        .getOne();

      if (!visit) {
        return { skipped: true, reason: 'No pending callback' };
      }

      await logInbound(visit.id, visit.campaignId, visit.clickId, visit.rcid, {
        action: 'register_then_fire',
        reason: 'no pending row — registered from latest visit',
        campid: visit.campid,
        trackingCampid: visit.trackingCampid,
      });

      const registered = await registerPending({
        visitId: visit.id,
        msisdn,
        campaignId: visit.campaignId,
        vendorId: visit.vendorId,
        affiliateId: null,
        clickId: visit.clickId,
        rcid: visit.rcid,
        campid: visit.campid || '',
        trackingCampid: visit.trackingCampid || '',
      });
      if (registered.skipped && !registered.id) {
        return registered;
      }
      const id = registered.id;
      if (!id) {
        return { skipped: true, reason: 'No pending callback' };
      }
      return firePostback(id);
    }

    await logInbound(
      pending.visitId,
      pending.campaignId,
      pending.clickId,
      pending.rcid,
      {
        action: 'fire',
        postbackId: pending.id,
        campid: pending.campid,
        trackingCampid: pending.trackingCampid,
      },
    );

    return firePostback(pending.id);
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
    fillTemplate,
    resolvePostbackTemplate,
    registerPending,
    firePostback,
    processOperatorCallback,
    getSummary,
    listPostbacks,
    getPostbackById,
  };
};

export const postbackService = createPostbackService();
