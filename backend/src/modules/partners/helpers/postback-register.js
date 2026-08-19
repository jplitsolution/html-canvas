import { getRepository } from '../../../database/index.js';
import { Vendor } from '../../../database/entities/vendor.entity.js';
import { CampaignTracking } from '../../../database/entities/campaign-tracking.entity.js';
import {
  ConversionPostback,
  ConversionPostbackStatus,
} from '../../../database/entities/conversion-postback.entity.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { searchService } from '../../search/search.service.js';
import { apiCallLogService } from '../../flow/api-call-log.service.js';

/** Returns full MSISDN for UI display (no masking). */
export const maskPhone = (phone) => {
  if (!phone) return undefined;
  return String(phone).trim();
};

export const serializeBody = (data) => {
  if (data == null) return null;
  try {
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch {
    return String(data);
  }
};

export const fillTemplate = (template, vars) => {
  let url = String(template || '');
  for (const [key, val] of Object.entries(vars)) {
    url = url.split(`{{${key}}}`).join(encodeURIComponent(val ?? ''));
    url = url.split(`{${key}}`).join(encodeURIComponent(val ?? ''));
  }
  return url;
};

export const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

export const createPostbackRegister = (deps) => {
  const {
    getPostbackRepo = () => getRepository(ConversionPostback),
    getVendorRepo = () => getRepository(Vendor),
    getVisitRepo = () => getRepository(Visit),
    getTrackingRepo = () => getRepository(CampaignTracking),
  } = deps;

  const resolvePostbackTemplate = async (vendorId) => {
    let template = '';
    if (vendorId) {
      const vendor = await getVendorRepo().findOne({ where: { id: vendorId } });
      if (vendor?.postbackUrl?.trim()) template = vendor.postbackUrl.trim();
    }
    return { template, vendorId };
  };

  /** Visit often has no vendorId when opened without ?vid= — use campaign trackings. */
  const resolveVendorFromCampaign = async (campaignId) => {
    if (!campaignId) return { vendorId: null, template: '' };
    const trackings = await getTrackingRepo().find({
      where: { campaignId: parseInt(campaignId, 10), active: true },
      order: { id: 'ASC' },
      take: 20,
    });
    for (const t of trackings) {
      if (!t.vendorId) continue;
      const { template, vendorId } = await resolvePostbackTemplate(t.vendorId);
      if (template) return { vendorId, template };
    }
    // Prefer any linked vendor even without URL (row still visible in Postbacks UI).
    const firstVendorId = trackings.find((t) => t.vendorId)?.vendorId || null;
    return { vendorId: firstVendorId, template: '' };
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
      phone: row.msisdn || null,
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
    const { firePostback } = deps;
    const msisdn =
      String(input.msisdn || input.phone || '').replace(/\D/g, '') || null;
    let vendorId = input.vendorId || null;
    let clickId = input.clickId || '';
    if (!msisdn && !String(clickId || '').trim() && !input.visitId) {
      return { skipped: true, reason: 'missing msisdn or click_id' };
    }
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

    let { template, vendorId: resolvedVendorId } =
      await resolvePostbackTemplate(vendorId);
    vendorId = resolvedVendorId || vendorId;

    // No vendor on visit (opened without tracking vid) → campaign's assigned vendor.
    if (!template) {
      const fromCampaign = await resolveVendorFromCampaign(campaignId);
      if (fromCampaign.vendorId) vendorId = vendorId || fromCampaign.vendorId;
      if (fromCampaign.template) template = fromCampaign.template;
    }

    if (!template) {
      // Still queue pending so Postbacks UI + billing callback lookup work.
      console.warn(
        `[postback] queueing pending without postback_url (msisdn=${msisdn || 'none'}, clickId=${clickId || 'none'}, vendorId=${vendorId || 'none'}, campaignId=${campaignId || 'none'})`,
      );
    }

    if (!msisdn && !String(clickId || '').trim()) {
      return { skipped: true, reason: 'missing msisdn or click_id' };
    }

    const findExisting = async () => {
      const cid = String(clickId || '').trim();
      if (cid) {
        const byClick = await getPostbackRepo()
          .createQueryBuilder('p')
          .where('p.clickId = :clickId', { clickId: cid })
          .orderBy('p.id', 'DESC')
          .take(1)
          .getOne();
        if (byClick) return byClick;
      }
      if (msisdn) {
        return getPostbackRepo()
          .createQueryBuilder('p')
          .where('p.msisdn = :msisdn', { msisdn })
          .orderBy('p.id', 'DESC')
          .take(1)
          .getOne();
      }
      return null;
    };

    const existing = await findExisting();

    const parsedVisitId = visitId ? parseInt(visitId, 10) : null;
    const savedTemplate = template || null;
    const keepIfSent = Boolean(input.keepIfSent);
    const alreadySent = existing?.status === ConversionPostbackStatus.SENT;
    const nextStatus = input.asReceived
      ? ConversionPostbackStatus.RECEIVED
      : ConversionPostbackStatus.PENDING;

    if (existing) {
      existing.clickId = clickId || existing.clickId || null;
      existing.rcid = rcid || existing.rcid || null;
      existing.campid = campid || existing.campid || null;
      if (msisdn) existing.msisdn = msisdn;
      if (trackingCampid) existing.trackingCampid = trackingCampid;
      if (parsedVisitId) existing.visitId = parsedVisitId;
      if (campaignId) existing.campaignId = campaignId;
      if (vendorId) existing.vendorId = vendorId;
      if (savedTemplate) existing.postbackUrl = savedTemplate;
      if (!(keepIfSent && alreadySent)) {
        existing.status = nextStatus;
        existing.httpStatus = null;
        existing.responseBody = null;
        existing.errorMessage = null;
        existing.sentAt = null;
      }
      if (input.offerCode) existing.offerCode = input.offerCode;

      const row = await getPostbackRepo().save(existing);

      if (!input.asReceived) {
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
              postbackUrl: row.postbackUrl,
            },
          );
        } else {
          await indexPostbackEvent(row, 'POSTBACK_PENDING', { updated: true });
        }
      }

      if (input.fireImmediate) {
        return firePostback(row.id);
      }

      return { success: true, id: row.id, status: row.status, updated: true };
    }

    const row = await getPostbackRepo().save(
      getPostbackRepo().create({
        visitId: parsedVisitId,
        campaignId: campaignId || null,
        vendorId: vendorId || null,
        affiliateId: null,
        msisdn: msisdn || null,
        campid: campid || null,
        trackingCampid: trackingCampid || null,
        clickId: clickId || null,
        rcid: rcid || null,
        offerCode: input.offerCode || null,
        postbackUrl: savedTemplate,
        status: nextStatus,
      }),
    );

    if (!input.asReceived) {
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
            postbackUrl: row.postbackUrl,
          },
        );
      } else {
        await indexPostbackEvent(row, 'POSTBACK_PENDING');
      }
    }

    if (input.fireImmediate) {
      return firePostback(row.id);
    }

    return { success: true, id: row.id, status: row.status };
  };

  return {
    fillTemplate,
    resolvePostbackTemplate,
    indexPostbackEvent,
    logApiCall,
    registerPending,
  };
};
