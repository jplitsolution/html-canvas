import axios from 'axios';
import { getRepository } from '../../database/index.js';
import { Vendor } from './entities/vendor.entity.js';
import {
  ConversionPostback,
  ConversionPostbackStatus,
} from './entities/conversion-postback.entity.js';
import { Visit } from '../analytics/entities/visit.entity.js';
import { analyticsService } from '../analytics/analytics.service.js';
import { VisitEventType } from '../analytics/entities/visit-event.entity.js';
import { searchService } from '../search/search.service.js';
import { apiCallLogService } from '../flow/api-call-log.service.js';
import { ApiCallType } from '../flow/entities/api-call-log.entity.js';

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
   * Queue a pending postback after confirm / CG (operator may confirm later).
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

    const existingQ = getPostbackRepo()
      .createQueryBuilder('p')
      .where('p.msisdn = :msisdn', { msisdn })
      .andWhere('p.status = :status', {
        status: ConversionPostbackStatus.PENDING,
      })
      .orderBy('p.id', 'DESC')
      .take(1);
    if (clickId) {
      existingQ.andWhere('p.clickId = :clickId', { clickId });
    }
    const existing = await existingQ.getOne();
    if (existing) {
      return { skipped: true, reason: 'already pending', id: existing.id };
    }

    const row = await getPostbackRepo().save(
      getPostbackRepo().create({
        visitId: visitId ? parseInt(visitId, 10) : null,
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

    if (visitId) {
      await analyticsService.logEvent(
        visitId,
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

  return {
    fillTemplate,
    resolvePostbackTemplate,
    registerPending,
    firePostback,
    processOperatorCallback,
  };
};

export const postbackService = createPostbackService();
