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

/**
 * Vendor CPA postbacks (SAFWAP callback_manage parity).
 *
 * Placeholders in postback_url:
 *   {{msisdn}} {{click_id}} {{rcid}} {{campid}} {{camp}} {{offer_code}}
 *   {{visit_id}} {{vendor}}
 * Also supports SAFWAP single-brace form: {msisdn}, {rcid}, {campid}
 *
 * click_id = our generated id; rcid = network original click.
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
      phoneMasked: maskPhone(row.msisdn),
      eventType,
      status: row.status,
      responseStatus: row.httpStatus,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  };

  /**
   * Queue a pending postback after confirm / CG (operator may confirm later).
   */
  const registerPending = async (input) => {
    const msisdn = String(input.msisdn || input.phone || '').replace(/\D/g, '');
    if (!msisdn) {
      return { skipped: true, reason: 'missing msisdn' };
    }

    let vendorId = input.vendorId || null;
    let clickId = input.clickId || '';
    let rcid = input.rcid || '';
    let campid = input.campid || '';
    let visitId = input.visitId || null;
    let campaignId = input.campaignId || null;

    if (visitId && (!vendorId || !clickId || !rcid || !campid || !campaignId)) {
      const visit = await getVisitRepo().findOne({
        where: { id: parseInt(visitId, 10) },
      });
      if (visit) {
        vendorId = vendorId || visit.vendorId || null;
        clickId = clickId || visit.clickId || '';
        rcid = rcid || visit.rcid || '';
        campaignId = campaignId || visit.campaignId || null;
        if (!campid && visit.campaignId) {
          campid = String(visit.campaignId);
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
        clickId: clickId || null,
        rcid: rcid || null,
        offerCode: input.offerCode || null,
        postbackUrl: template,
        status: ConversionPostbackStatus.PENDING,
      }),
    );

    if (visitId) {
      await analyticsService.logEvent(visitId, VisitEventType.POSTBACK_PENDING,  {
        postbackId: row.id,
          rcid: row.rcid,
          clickId: row.clickId,
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

    const url = fillTemplate(row.postbackUrl, {
      msisdn: row.msisdn,
      click_id: ourClickId,
      rcid: networkRcid,
      campid: row.campid || '',
      camp: row.campid || '',
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

      row.status =
        response.status >= 200 && response.status < 300
          ? ConversionPostbackStatus.SENT
          : ConversionPostbackStatus.FAILED;
      row.httpStatus = response.status;
      row.responseBody = body;
      row.sentAt = new Date();
      row.errorMessage =
        row.status === ConversionPostbackStatus.FAILED
          ? `HTTP ${response.status}`
          : null;
      await getPostbackRepo().save(row);

      const eventType =
        row.status === ConversionPostbackStatus.SENT
          ? VisitEventType.POSTBACK_SENT
          : VisitEventType.POSTBACK_FAILED;

      if (row.visitId) {
        await analyticsService.logEvent(row.visitId, eventType, {
          postbackId: row.id,
          httpStatus: response.status,
          url,
        });
      } else {
        await indexPostbackEvent(row, eventType, { requestUrl: url });
      }

      return {
        success: row.status === ConversionPostbackStatus.SENT,
        id: row.id,
        url,
        httpStatus: response.status,
        status: row.status,
      };
    } catch (err) {
      row.status = ConversionPostbackStatus.FAILED;
      row.errorMessage = err.message;
      row.sentAt = new Date();
      await getPostbackRepo().save(row);

      if (row.visitId) {
        await analyticsService.logEvent(
          row.visitId,
          VisitEventType.POSTBACK_FAILED,
          {
            postbackId: row.id,
            error: err.message,
            url,
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

    if (!pending) {
      // Fallback: latest visit for this MSISDN that has attribution — register then fire.
      const visit = await getVisitRepo()
        .createQueryBuilder('v')
        .where('v.phone = :msisdn', { msisdn })
        .andWhere('(v.rcid IS NOT NULL OR v.click_id IS NOT NULL)')
        .orderBy('v.id', 'DESC')
        .getOne();

      if (!visit) {
        return { skipped: true, reason: 'No pending callback' };
      }

      const registered = await registerPending({
        visitId: visit.id,
        msisdn,
        campaignId: visit.campaignId,
        vendorId: visit.vendorId,
        affiliateId: null,
        clickId: visit.clickId,
        rcid: visit.rcid,
        campid: visit.campaignId != null ? String(visit.campaignId) : '',
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
