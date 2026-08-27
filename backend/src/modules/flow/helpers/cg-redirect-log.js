import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { apiCallLogService } from '../api-call-log.service.js';

/**
 * HOME CTA / landing left to operator CG. Session Detail must show the hop
 * (visit event + api_call_logs URL) even though the browser does the GET.
 */
export async function recordCgRedirectHop({
  visitId,
  campaign,
  redirectUrl,
  trigger = 'subscribe',
  planId,
  logSubscribeClick = false,
} = {}) {
  if (!visitId || !redirectUrl) return;

  let visit = null;
  try {
    visit = await analyticsService.getVisit(visitId);
  } catch {
    visit = null;
  }

  if (logSubscribeClick) {
    await analyticsService.logEvent(visitId, VisitEventType.SUBSCRIBE_CLICK, {
      ...(planId ? { pack: planId } : {}),
      to: 'CG',
    });
  }

  await analyticsService.logEvent(visitId, VisitEventType.CG_REDIRECT, {
    url: redirectUrl,
    trigger,
    ...(planId ? { pack: planId } : {}),
  });

  try {
    await apiCallLogService.record({
      visitId,
      campaignId: campaign?.id || visit?.campaignId || null,
      msisdn: visit?.phone || null,
      rcid: visit?.rcid || null,
      clickId: visit?.clickId || null,
      vendorId: visit?.vendorId || null,
      callType: ApiCallType.CG_REDIRECT,
      requestUrl: redirectUrl,
      requestBody: JSON.stringify({
        trigger,
        pack: planId || null,
        verificationMode: campaign?.verificationMode || null,
      }),
      responseStatus: null,
      responseBody: null,
      success: true,
      statusLabel: 'REDIRECT',
    });
  } catch (err) {
    console.warn(`cg_redirect log failed: ${err.message}`);
  }
}
