import axios from 'axios';
import { getRepository } from '../../database/index.js';
import { Vendor } from './entities/vendor.entity.js';
import { Affiliate } from './entities/affiliate.entity.js';
import {
  ConversionPostback,
  ConversionPostbackStatus,
} from './entities/conversion-postback.entity.js';
import { Visit } from '../analytics/entities/visit.entity.js';

/**
 * Affiliate / vendor CPA postbacks (SAFWAP callback_manage parity).
 *
 * Placeholders in postback_url:
 *   {{msisdn}} {{click_id}} {{rcid}} {{campid}} {{camp}} {{offer_code}}
 *   {{visit_id}} {{vendor}} {{affiliate}}
 * Also supports SAFWAP single-brace form: {msisdn}, {rcid}, {campid}
 */
export const createPostbackService = () => {
  const getPostbackRepo = () => getRepository(ConversionPostback);
  const getVendorRepo = () => getRepository(Vendor);
  const getAffiliateRepo = () => getRepository(Affiliate);
  const getVisitRepo = () => getRepository(Visit);

  const fillTemplate = (template, vars) => {
    let url = String(template || '');
    for (const [key, val] of Object.entries(vars)) {
      url = url.split(`{{${key}}}`).join(encodeURIComponent(val ?? ''));
      // SAFWAP-style single braces
      url = url.split(`{${key}}`).join(encodeURIComponent(val ?? ''));
    }
    return url;
  };

  const resolvePostbackTemplate = async (vendorId, affiliateId) => {
    let template = '';
    if (affiliateId) {
      const aff = await getAffiliateRepo().findOne({
        where: { id: affiliateId },
      });
      if (aff?.postbackUrl?.trim()) template = aff.postbackUrl.trim();
      if (!vendorId && aff) vendorId = aff.vendorId;
    }
    if (!template && vendorId) {
      const vendor = await getVendorRepo().findOne({ where: { id: vendorId } });
      if (vendor?.postbackUrl?.trim()) template = vendor.postbackUrl.trim();
    }
    return { template, vendorId };
  };

  /**
   * Queue a pending postback after subscribe / CG redirect (operator may confirm later).
   */
  const registerPending = async (input) => {
    const msisdn = String(input.msisdn || input.phone || '').replace(/\D/g, '');
    if (!msisdn) {
      return { skipped: true, reason: 'missing msisdn' };
    }

    let vendorId = input.vendorId || null;
    let affiliateId = input.affiliateId || null;
    let clickId = input.clickId || input.rcid || '';
    let campid = input.campid || '';
    let visitId = input.visitId || null;

    if (visitId && (!vendorId || !clickId || !campid)) {
      const visit = await getVisitRepo().findOne({
        where: { id: parseInt(visitId, 10) },
      });
      if (visit) {
        vendorId = vendorId || visit.vendorId || null;
        affiliateId = affiliateId || visit.affiliateId || null;
        clickId = clickId || visit.clickId || visit.affRaw || '';
        if (!campid && visit.campaignId) {
          campid = String(visit.campaignId);
        }
      }
    }

    const { template, vendorId: resolvedVendorId } = await resolvePostbackTemplate(
      vendorId,
      affiliateId,
    );
    vendorId = resolvedVendorId || vendorId;

    if (!template) {
      return { skipped: true, reason: 'no postback_url on vendor/affiliate' };
    }

    // Avoid duplicate pending for same msisdn (latest pending wins unless click differs)
    const existingQ = getPostbackRepo()
      .createQueryBuilder('p')
      .where('p.msisdn = :msisdn', { msisdn })
      .andWhere('p.status = :status', {
        status: ConversionPostbackStatus.PENDING,
      })
      .orderBy('p.id', 'DESC')
      .take(1);
    if (clickId) {
      existingQ.andWhere('p.click_id = :clickId', { clickId });
    }
    const existing = await existingQ.getOne();
    if (existing) {
      return { skipped: true, reason: 'already pending', id: existing.id };
    }

    const row = await getPostbackRepo().save(
      getPostbackRepo().create({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: input.campaignId || null,
        vendorId: vendorId || null,
        affiliateId: affiliateId || null,
        msisdn,
        campid: campid || null,
        clickId: clickId || null,
        offerCode: input.offerCode || null,
        postbackUrl: template,
        status: ConversionPostbackStatus.PENDING,
      }),
    );

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
    let affCode = '';
    if (row.vendorId) {
      const v = await getVendorRepo().findOne({ where: { id: row.vendorId } });
      vendorCode = v?.code || '';
    }
    if (row.affiliateId) {
      const a = await getAffiliateRepo().findOne({
        where: { id: row.affiliateId },
      });
      affCode = a?.code || '';
    }

    const url = fillTemplate(row.postbackUrl, {
      msisdn: row.msisdn,
      click_id: row.clickId || '',
      rcid: row.clickId || '',
      campid: row.campid || '',
      camp: row.campid || '',
      offer_code: row.offerCode || '',
      visit_id: row.visitId != null ? String(row.visitId) : '',
      vendor: vendorCode,
      affiliate: affCode,
    });

    try {
      console.log(`Affiliate postback → GET ${url}`);
      const response = await axios.get(url, { timeout: 10000, validateStatus: () => true });
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
   * Operator notifies us (SAFWAP /v1/callback). Find pending by msisdn and fire.
   */
  const processOperatorCallback = async (query = {}) => {
    const msisdn = String(query.msisdn || query.phone || '').replace(/\D/g, '');
    const status = String(query.status || 'active').toLowerCase();

    if (!msisdn) {
      return { skipped: true, reason: 'msisdn required' };
    }

    // Only fire on success-like statuses (or empty)
    const okStatuses = new Set(['', 'active', 'success', 'ok', 'subscribed', '1', 'true']);
    if (status && !okStatuses.has(status)) {
      return { skipped: true, reason: `status=${status} ignored` };
    }

    const pending = await getPostbackRepo().findOne({
      where: { msisdn, status: ConversionPostbackStatus.PENDING },
      order: { id: 'DESC' },
    });

    if (!pending) {
      return { skipped: true, reason: 'No pending callback' };
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
