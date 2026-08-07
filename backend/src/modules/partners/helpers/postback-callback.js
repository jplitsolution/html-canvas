import { getRepository } from '../../../database/index.js';
import {
  ConversionPostback,
  ConversionPostbackStatus,
} from '../../../database/entities/conversion-postback.entity.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { maskPhone, serializeBody } from './postback-register.js';

export const createPostbackCallback = (deps) => {
  const {
    getPostbackRepo = () => getRepository(ConversionPostback),
    getVisitRepo = () => getRepository(Visit),
    logApiCall,
    registerPending,
    firePostback,
  } = deps;

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

  return { processOperatorCallback };
};
