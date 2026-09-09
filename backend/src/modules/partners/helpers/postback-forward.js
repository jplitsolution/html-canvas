import axios from 'axios';
import { getRepository } from '../../../database/index.js';
import { Vendor } from '../../../database/entities/vendor.entity.js';
import { CampaignTracking } from '../../../database/entities/campaign-tracking.entity.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import {
  ConversionPostback,
  ConversionPostbackStatus,
} from '../../../database/entities/conversion-postback.entity.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import {
  applyVisitAttributionToPostback,
  fillTemplate,
  serializeBody,
} from './postback-template.js';

export const createPostbackForward = (deps) => {
  const {
    getPostbackRepo = () => getRepository(ConversionPostback),
    getVendorRepo = () => getRepository(Vendor),
    getTrackingRepo = () => getRepository(CampaignTracking),
    getVisitRepo = () => getRepository(Visit),
    indexPostbackEvent,
    logApiCall,
    logVisitEvent = (visitId, eventType, payload) =>
      analyticsService.logEvent(visitId, eventType, payload),
    httpClient = axios,
  } = deps;

  const logSkippedFire = async (row, reason, extra = {}) => {
    if (!logApiCall) {
      return { skipped: true, reason, id: row?.id };
    }
    const networkRcid = row?.rcid || row?.clickId || '';
    const vendorCampid = row?.campid || '';
    const displayUrl = row?.postbackUrl
      ? fillTemplate(row.postbackUrl, {
          msisdn: row?.msisdn || '',
          click_id: networkRcid,
          rcid: networkRcid,
          campid: vendorCampid,
          camp: vendorCampid,
          tracking_campid: row?.trackingCampid || '',
          offer_code: row?.offerCode || '',
          visit_id: row?.visitId != null ? String(row.visitId) : '',
        })
      : '';
    await logApiCall({
      visitId: row?.visitId || null,
      campaignId: row?.campaignId || null,
      msisdn: row?.msisdn || null,
      rcid: row?.rcid || null,
      clickId: row?.clickId || null,
      callType: ApiCallType.VENDOR_POSTBACK,
      requestUrl: displayUrl || row?.postbackUrl || '',
      requestBody: serializeBody({
        skipped: true,
        reason,
        postbackId: row?.id || null,
        vendorId: row?.vendorId || null,
        ...extra,
      }),
      responseStatus: null,
      success: false,
      errorMessage: reason,
      statusLabel: 'SKIPPED',
    });
    return { skipped: true, reason, id: row?.id };
  };

  const resolveMissingPostbackUrl = async (row) => {
    if (String(row.postbackUrl || '').trim()) return String(row.postbackUrl).trim();
    if (row.vendorId) {
      const vendor = await getVendorRepo().findOne({ where: { id: row.vendorId } });
      if (vendor?.postbackUrl?.trim()) return vendor.postbackUrl.trim();
    }
    if (!row.campaignId || !getTrackingRepo) return '';
    const trackings = await getTrackingRepo().find({
      where: { campaignId: parseInt(row.campaignId, 10), active: true },
      order: { id: 'ASC' },
      take: 20,
    });
    for (const tracking of trackings) {
      if (!tracking.vendorId) continue;
      const vendor = await getVendorRepo().findOne({ where: { id: tracking.vendorId } });
      if (!vendor?.postbackUrl?.trim()) continue;
      if (!row.vendorId) row.vendorId = tracking.vendorId;
      return vendor.postbackUrl.trim();
    }
    return '';
  };

  const firePostback = async (postbackId, options = {}) => {
    const manual = Boolean(options.manual);
    const row = await getPostbackRepo().findOne({
      where: { id: parseInt(postbackId, 10) },
    });
    if (!row) {
      return logSkippedFire(null, 'postback not found', { force: Boolean(options.force), manual });
    }
    const force = Boolean(options.force);
    if (row.status === ConversionPostbackStatus.SENT && !force) {
      return logSkippedFire(row, 'already sent', { force, manual });
    }

    const resolvedUrl = await resolveMissingPostbackUrl(row);
    if (resolvedUrl) row.postbackUrl = resolvedUrl;

    if (row.visitId && getVisitRepo) {
      const visit = await getVisitRepo().findOne({
        where: { id: parseInt(row.visitId, 10) },
      });
      if (visit) {
        const before = `${row.clickId || ''}|${row.rcid || ''}|${row.campid || ''}|${row.trackingCampid || ''}`;
        applyVisitAttributionToPostback(row, visit);
        const after = `${row.clickId || ''}|${row.rcid || ''}|${row.campid || ''}|${row.trackingCampid || ''}`;
        if (after !== before) {
          await getPostbackRepo().save(row);
        }
      }
    }

    let vendorCode = '';
    if (row.vendorId) {
      const vendor = await getVendorRepo().findOne({ where: { id: row.vendorId } });
      vendorCode = vendor?.code || '';
    }

    // Vendor CPA click_id is the affiliate/network original (rcid), not our minted id.
    const networkRcid = row.rcid || row.clickId || '';
    const vendorCampid = row.campid || '';

    if (!String(row.postbackUrl || '').trim()) {
      await logSkippedFire(row, 'no postback_url on vendor', { force, manual });
      return {
        success: true,
        id: row.id,
        status: row.status,
        vendorSkipped: true,
        reason: 'no postback_url on vendor',
      };
    }

    const url = fillTemplate(row.postbackUrl, {
      msisdn: row.msisdn,
      click_id: networkRcid,
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
      const response = await httpClient.get(url, {
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
        rcid: networkRcid,
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
          force,
          manual,
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
        try {
          await logVisitEvent(row.visitId, eventType, {
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
        } catch (eventErr) {
          console.warn(`postback visit event failed: ${eventErr.message}`);
        }
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
        rcid: networkRcid,
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
          force,
          manual,
        }),
        responseStatus: err.response?.status ?? null,
        responseBody: serializeBody(err.response?.data),
        success: false,
        errorMessage: err.message,
        statusLabel: 'FAILED',
      });

      if (row.visitId) {
        try {
          await logVisitEvent(
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
        } catch (eventErr) {
          console.warn(`postback visit event failed: ${eventErr.message}`);
        }
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

  return { firePostback };
};
