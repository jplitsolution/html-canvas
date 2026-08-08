import axios from 'axios';
import { getRepository } from '../../../database/index.js';
import { Vendor } from '../../../database/entities/vendor.entity.js';
import {
  ConversionPostback,
  ConversionPostbackStatus,
} from '../../../database/entities/conversion-postback.entity.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { fillTemplate, serializeBody } from './postback-register.js';

export const createPostbackForward = (deps) => {
  const {
    getPostbackRepo = () => getRepository(ConversionPostback),
    getVendorRepo = () => getRepository(Vendor),
    indexPostbackEvent,
    logApiCall,
  } = deps;

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

  return { firePostback };
};
