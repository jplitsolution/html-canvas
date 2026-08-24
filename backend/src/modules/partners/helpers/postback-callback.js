import {
  ConversionPostbackStatus,
} from '../../../database/entities/conversion-postback.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { appendPostbackHitSafe } from './postback-day-report-file.js';
import {
  parseOperatorStatus,
  shouldFireVendorPostback,
} from './operator-callback-status.js';

const maskPhone = (phone) => {
  if (!phone) return undefined;
  return String(phone).trim();
};

const serializeBody = (data) => {
  if (data == null) return null;
  try {
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch {
    return String(data);
  }
};

const callAnalytics = async (method, ...args) => {
  const { analyticsService } = await import('../../analytics/analytics.service.js');
  return analyticsService[method](...args);
};

export const parseCallbackClickId = (query = {}) =>
  String(
    query.click_id ||
      query.clickId ||
      query.ext_id ||
      query.extId ||
      '',
  ).trim();

export const parseCallbackMsisdn = (query = {}) =>
  String(query.msisdn || query.phone || '').replace(/\D/g, '');

export const createPostbackCallback = (deps) => {
  const {
    getPostbackRepo,
    getVisitRepo,
    logApiCall,
    registerPending,
    firePostback,
    appendHit = appendPostbackHitSafe,
    logEvent = (visitId, type, payload) =>
      callAnalytics('logEvent', visitId, type, payload),
    setVisitPhone = (id, phone) => callAnalytics('setVisitPhone', id, phone),
  } = deps;

  /**
   * Always store the inbound billing callback.
   * Recover conversion when click_id / msisdn exists in our system.
   * Unknown click_id, or msisdn-only not in system → success: false (still logged).
   * Every query is written to the hit file, including skip / false / unmatched.
   */
  const persistHit = async (query, result = {}) => {
    const skipped = Boolean(result.skipped || result.vendorSkipped);
    const success = result.success === true && !skipped;
    const operatorStatus = parseOperatorStatus(query);
    let statusLabel = String(operatorStatus || 'OK').toUpperCase();
    if (skipped) statusLabel = 'SKIPPED';
    else if (result.success === false) statusLabel = 'FAILED';
    await appendHit({
      callType: ApiCallType.BILLING_CALLBACK,
      msisdn: parseCallbackMsisdn(query) || null,
      clickId: parseCallbackClickId(query) || null,
      requestUrl: '/api/flow/callback',
      requestBody: serializeBody({
        query,
        skipped,
        success: result.success === true,
        reason: result.reason || result.error || null,
        id: result.id || null,
        operatorStatus,
        vendorFired: result.vendorFired === true,
      }),
      responseStatus: 200,
      success,
      statusLabel,
      errorMessage: result.reason || result.error || null,
      query,
      reason: result.reason || result.error || '',
      createdAt: new Date(),
    });
  };

  const processOperatorCallbackInner = async (query = {}) => {
    const incomingMsisdn = parseCallbackMsisdn(query);
    const clickId = parseCallbackClickId(query);
    const status = parseOperatorStatus(query);
    const fireVendor = shouldFireVendorPostback(status);

    const findLatestByMsisdn = async (msisdn) => {
      if (!msisdn) return null;
      return getPostbackRepo().findOne({
        where: { msisdn },
        order: { id: 'DESC' },
      });
    };

    const findVisitByClickId = async (cid) => {
      if (!cid) return null;
      return getVisitRepo()
        .createQueryBuilder('v')
        .where('v.click_id = :clickId', { clickId: cid })
        .orderBy('v.id', 'DESC')
        .getOne();
    };

    const findVisitByPhone = async (msisdn) => {
      if (!msisdn) return null;
      return getVisitRepo()
        .createQueryBuilder('v')
        .where('v.phone = :msisdn', { msisdn })
        .andWhere('(v.rcid IS NOT NULL OR v.click_id IS NOT NULL)')
        .orderBy('v.id', 'DESC')
        .getOne();
    };

    const logInbound = async (
      visitId,
      campaignId,
      rowClickId,
      rcid,
      msisdn,
      extra = {},
    ) => {
      const safeQuery = { ...query };
      if (safeQuery.msisdn) safeQuery.msisdn = maskPhone(safeQuery.msisdn);
      if (safeQuery.phone) safeQuery.phone = maskPhone(safeQuery.phone);
      const matched = extra.matched !== false;

      if (visitId) {
        await logEvent(visitId, VisitEventType.CALLBACK_RECEIVED, {
          info: matched
            ? 'Billing / operator callback received — firing vendor postback.'
            : 'Billing / operator callback received — not matched in our system.',
          msisdn: maskPhone(msisdn),
          clickId: rowClickId || clickId || null,
          status,
          ...extra,
        });
      }
      await logApiCall({
        visitId: visitId || null,
        campaignId: campaignId || null,
        msisdn: msisdn || null,
        rcid: rcid || null,
        clickId: rowClickId || clickId || null,
        callType: ApiCallType.BILLING_CALLBACK,
        requestUrl: '/api/flow/callback',
        requestBody: serializeBody({
          msisdn: maskPhone(msisdn),
          clickId: rowClickId || clickId || null,
          status,
          query: safeQuery,
          ...extra,
        }),
        responseStatus: 200,
        responseBody: null,
        success: matched,
        statusLabel: matched
          ? String(status || 'RECEIVED').toUpperCase().slice(0, 32)
          : 'UNMATCHED',
      });
    };

    const reject = async (reason) => {
      await logInbound(null, null, clickId || null, null, incomingMsisdn || null, {
        action: 'unmatched',
        reason,
        matched: false,
      });
      return { success: false, skipped: true, reason };
    };

    if (!incomingMsisdn && !clickId) {
      return reject('msisdn or click_id required');
    }

    const firePending = async (pending, extra = {}) => {
      pending.operatorStatus = status;
      if (
        fireVendor &&
        pending.status !== ConversionPostbackStatus.SENT &&
        pending.status !== ConversionPostbackStatus.RECEIVED
      ) {
        pending.status = ConversionPostbackStatus.RECEIVED;
      }
      await getPostbackRepo().save(pending);
      if (!fireVendor) {
        await logInbound(
          pending.visitId,
          pending.campaignId,
          pending.clickId,
          pending.rcid,
          pending.msisdn,
          {
            action: 'hold',
            vendorFired: false,
            operatorStatus: status,
            postbackId: pending.id,
            vendorId: pending.vendorId,
            campid: pending.campid,
            trackingCampid: pending.trackingCampid,
            ...extra,
          },
        );
        return {
          success: true,
          id: pending.id,
          vendorFired: false,
          operatorStatus: status,
          status: pending.status,
        };
      }
      await logInbound(
        pending.visitId,
        pending.campaignId,
        pending.clickId,
        pending.rcid,
        pending.msisdn,
        {
          action: 'fire',
          vendorFired: true,
          operatorStatus: status,
          postbackId: pending.id,
          vendorId: pending.vendorId,
          campid: pending.campid,
          trackingCampid: pending.trackingCampid,
          ...extra,
        },
      );
      const fired = await firePostback(pending.id);
      return { ...fired, vendorFired: true, operatorStatus: status };
    };

    const registerAndFireFromVisit = async (visit, msisdn, extra = {}) => {
      const digits = String(msisdn || '').replace(/\D/g, '') || '';
      const visitPhone = String(visit.phone || '').replace(/\D/g, '');
      if (visit.id && digits && !visitPhone) {
        await setVisitPhone(visit.id, digits).catch(() => {});
      }

      await logInbound(
        visit.id,
        visit.campaignId,
        visit.clickId || clickId,
        visit.rcid,
        digits || visitPhone || null,
        {
          vendorFired: fireVendor,
          operatorStatus: status,
          vendorId: visit.vendorId,
          ...extra,
        },
      );

      const registered = await registerPending({
        visitId: visit.id,
        msisdn: digits || null,
        campaignId: visit.campaignId,
        vendorId: visit.vendorId,
        affiliateId: null,
        clickId: visit.clickId || clickId || null,
        rcid: visit.rcid,
        campid: visit.campid || '',
        trackingCampid: visit.trackingCampid || '',
        keepIfSent: true,
        asReceived: fireVendor,
        operatorStatus: status,
      });
      if (registered.skipped && !registered.id) {
        return { success: false, ...registered, operatorStatus: status };
      }
      const id = registered.id;
      if (!id) {
        return { success: false, skipped: true, reason: 'No pending callback', operatorStatus: status };
      }
      if (!fireVendor) {
        return {
          success: true,
          id,
          vendorFired: false,
          operatorStatus: status,
          status: registered.status,
        };
      }
      const fired = await firePostback(id);
      return { ...fired, vendorFired: true, operatorStatus: status };
    };

    // click_id present: recover if that click exists here (MSISDN optional).
    if (clickId) {
      const visit = await findVisitByClickId(clickId);
      if (visit) {
        const phone =
          incomingMsisdn || String(visit.phone || '').replace(/\D/g, '') || '';
        return registerAndFireFromVisit(visit, phone, {
          action: 'register_then_fire',
          reason: incomingMsisdn
            ? 'click_id + msisdn — visit by click_id'
            : phone
              ? 'click_id only — msisdn from visit'
              : 'click_id only — stored without msisdn',
          campid: visit.campid,
          trackingCampid: visit.trackingCampid,
        });
      }
      if (!incomingMsisdn) {
        return reject('No visit for click_id');
      }
    }

    // msisdn present (alone, or unknown click_id): recover if number is in system.
    if (incomingMsisdn) {
      const pending = await findLatestByMsisdn(incomingMsisdn);
      if (pending) {
        return firePending(pending);
      }

      const visitByPhone = await findVisitByPhone(incomingMsisdn);
      if (visitByPhone) {
        return registerAndFireFromVisit(visitByPhone, incomingMsisdn, {
          action: 'register_then_fire',
          reason: 'no pending row — registered from latest visit',
          campid: visitByPhone.campid,
          trackingCampid: visitByPhone.trackingCampid,
        });
      }

      return reject(
        clickId ? 'No visit for click_id and msisdn not in system' : 'msisdn not in system',
      );
    }

    return reject('No pending callback');
  };

  const processOperatorCallback = async (query = {}) => {
    let result = { success: false, skipped: true, reason: 'unprocessed' };
    try {
      result = await processOperatorCallbackInner(query);
      return result;
    } catch (err) {
      result = {
        success: false,
        skipped: true,
        reason: err?.message || 'callback error',
      };
      throw err;
    } finally {
      try {
        await persistHit(query, result);
      } catch (err) {
        console.warn(`callback hit file write failed: ${err?.message || err}`);
      }
    }
  };

  return { processOperatorCallback };
};
