import {
  ConversionPostbackStatus,
} from '../../../database/entities/conversion-postback.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';

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
    logEvent = (visitId, type, payload) =>
      callAnalytics('logEvent', visitId, type, payload),
    setVisitPhone = (id, phone) => callAnalytics('setVisitPhone', id, phone),
  } = deps;

  /**
   * Operator/billing notifies us.
   * - msisdn only → pending by number (existing)
   * - click_id only → visit by click_id, msisdn from visit.phone
   * - both → visit by click_id, msisdn = subscribe number from callback
   */
  const processOperatorCallback = async (query = {}) => {
    const incomingMsisdn = parseCallbackMsisdn(query);
    const clickId = parseCallbackClickId(query);
    const status = String(query.status || 'active').toLowerCase();

    if (!incomingMsisdn && !clickId) {
      return { skipped: true, reason: 'msisdn or click_id required' };
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

    const findPendingByMsisdn = async (msisdn) => {
      if (!msisdn) return null;
      return getPostbackRepo().findOne({
        where: { msisdn, status: ConversionPostbackStatus.PENDING },
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

      if (visitId) {
        await logEvent(visitId, VisitEventType.CALLBACK_RECEIVED, {
          info: 'Billing / operator callback received — firing vendor postback.',
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
        success: true,
        statusLabel: 'RECEIVED',
      });
    };

    const firePending = async (pending, extra = {}) => {
      await logInbound(
        pending.visitId,
        pending.campaignId,
        pending.clickId,
        pending.rcid,
        pending.msisdn,
        {
          action: 'fire',
          postbackId: pending.id,
          campid: pending.campid,
          trackingCampid: pending.trackingCampid,
          ...extra,
        },
      );
      return firePostback(pending.id);
    };

    const registerAndFireFromVisit = async (visit, msisdn, extra = {}) => {
      const digits = String(msisdn || '').replace(/\D/g, '');
      if (!digits) {
        return { skipped: true, reason: 'msisdn required' };
      }
      const visitPhone = String(visit.phone || '').replace(/\D/g, '');
      if (visit.id && digits && !visitPhone) {
        await setVisitPhone(visit.id, digits).catch(() => {});
      }

      await logInbound(
        visit.id,
        visit.campaignId,
        visit.clickId || clickId,
        visit.rcid,
        digits,
        extra,
      );

      const registered = await registerPending({
        visitId: visit.id,
        msisdn: digits,
        campaignId: visit.campaignId,
        vendorId: visit.vendorId,
        affiliateId: null,
        clickId: visit.clickId || clickId || null,
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
    };

    // click_id + msisdn: visit by click (HE never resolved number, user subscribed on CG).
    if (clickId && incomingMsisdn) {
      const visit = await findVisitByClickId(clickId);
      if (visit) {
        return registerAndFireFromVisit(visit, incomingMsisdn, {
          action: 'register_then_fire',
          reason: 'click_id + msisdn — visit by click_id',
          campid: visit.campid,
          trackingCampid: visit.trackingCampid,
        });
      }
    }

    // msisdn present (alone, or click_id with no visit): existing pending-by-number.
    if (incomingMsisdn) {
      const pending = await findPendingByMsisdn(incomingMsisdn);
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

      if (!clickId) {
        return { skipped: true, reason: 'No pending callback' };
      }
    }

    // click_id only (or click_id leftover after msisdn miss): visit, phone from visit.
    if (clickId) {
      const visit = await findVisitByClickId(clickId);
      if (!visit) {
        return { skipped: true, reason: 'No visit for click_id' };
      }
      const visitPhone = String(visit.phone || '').replace(/\D/g, '');
      if (!visitPhone) {
        return { skipped: true, reason: 'click_id visit has no msisdn' };
      }
      return registerAndFireFromVisit(visit, visitPhone, {
        action: 'register_then_fire',
        reason: 'click_id only — msisdn from visit',
        campid: visit.campid,
        trackingCampid: visit.trackingCampid,
      });
    }

    return { skipped: true, reason: 'No pending callback' };
  };

  return { processOperatorCallback };
};
