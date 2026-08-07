import { campaignsService } from '../../campaigns/campaigns.service.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { partnersService } from '../../partners/partners.service.js';
import { flowEngineService } from '../flow-engine.service.js';
import { redisService } from '../../../common/services/redis.service.js';
import {
  isNumericCampid,
  parseTrackingId,
  splitDualCampids,
} from '../../markets/helpers/tracking-id.util.js';

export function createFlowCampaignFns(deps) {
  const { isFlowCacheEnabled, buildCgRedirectUrl } = deps;

  const loadVisitAttribution = async (visitId, input = {}) => {
    let clickId = String(input.clickId || '').trim();
    let rcid = String(input.rcid || '').trim();
    let vid = input.vid || '';
    let affId = input.affId || '';
    let vendorId = input.vendorId || null;
    let affiliateId = input.affiliateId || null;
    let campaignId = input.campaignId || null;
    const dual = splitDualCampids(input);
    let campid = dual.vendorCampid;
    let trackingCampid = dual.trackingCampid;

    if (visitId) {
      try {
        const visit = await analyticsService.getVisit(visitId);
        if (visit) {
          clickId = visit.clickId || clickId;
          rcid = visit.rcid || rcid;
          vid = vid || visit.vidRaw || '';
          affId = affId || visit.affRaw || '';
          vendorId = vendorId || visit.vendorId || null;
          affiliateId = affiliateId || visit.affiliateId || null;
          campaignId = campaignId || visit.campaignId || null;
          if (!campid && visit.campid) campid = String(visit.campid);
          if (!trackingCampid && visit.trackingCampid) {
            trackingCampid = String(visit.trackingCampid);
          }
        }
      } catch {
        /* ignore */
      }
    }
    return {
      clickId,
      rcid,
      vid,
      affId,
      vendorId,
      affiliateId,
      campaignId,
      campid,
      trackingCampid,
    };
  };

  const resolveSuccessRedirect = async (campaign, visitId, input = {}) => {
    const raw = campaign?.successRedirectUrl?.trim();
    if (!raw) return null;
    const attr = await loadVisitAttribution(visitId, input);
    const resolved = buildCgRedirectUrl(raw, {
      clickId: attr.clickId,
      rcid: attr.rcid,
      vid: attr.vid,
      affId: attr.affId,
      campid: attr.campid || '',
      trackingCampid: attr.trackingCampid || campaign.trackingId || '',
    });
    return resolved && /^https?:\/\//i.test(resolved) ? resolved : null;
  };

  const maybeNullFlowCgRedirect = async (campaign, visitId, input = {}) => {
    const mode =
      flowEngineService.normalizeMode(campaign.verificationMode) || 'BOTH';
    const cg = campaign.cgRedirectUrl?.trim();
    if (mode !== 'NONE' || !cg) return null;
  
    const attr = await loadVisitAttribution(visitId, input);
    return buildCgRedirectUrl(cg, {
      clickId: attr.clickId,
      rcid: attr.rcid,
      vid: attr.vid,
      affId: attr.affId,
      campid: attr.campid || '',
      trackingCampid:
        attr.trackingCampid || input.trackingCampid || campaign.trackingId || '',
    });
  };

  const resolveCampaign = async (input) => {
    const dual = splitDualCampids(input);
    const resolveKey = dual.resolveCampid;
    const cacheKey = resolveKey
      ? `flow:campaign:id:${resolveKey}`
      : `flow:campaign:co:${String(input.country).toLowerCase()}:${String(input.operator).toLowerCase()}`;
  
    if (isFlowCacheEnabled()) {
      const cached = await redisService.get(cacheKey);
      if (cached) return cached;
    }
  
    let campaign = null;
    if (resolveKey) {
      const parsed = parseTrackingId(resolveKey);
      if (parsed) {
        campaign = await campaignsService.findByTrackingId(
          parsed.countryCode,
          parsed.operatorCode,
          parsed.campaignId,
        );
      } else if (isNumericCampid(resolveKey)) {
        campaign = await campaignsService.findByIdForFlow(
          Number(resolveKey),
        );
      }
    }
    if (!campaign) {
      campaign = await campaignsService.findByCountryOperator(
        input.country,
        input.operator,
      );
    }
  
    if (campaign && isFlowCacheEnabled()) {
      await redisService.set(cacheKey, campaign, 15);
      await redisService.set(`flow:campaign:id:${campaign.id}`, campaign, 15);
      if (campaign.trackingId) {
        await redisService.set(
          `flow:campaign:id:${campaign.trackingId}`,
          campaign,
          15,
        );
      }
    }
    return campaign;
  };

  const assertTrackingAssignmentAvailable = async (
    campaign,
    vid,
    _affId,
    vendorId,
  ) => {
    const trackings = campaign.trackings || [];
    if (trackings.length === 0) return;
    if (!vid && vendorId == null) return;
  
    const vidNorm = vid ? String(vid).trim().toLowerCase() : '';
    let resolvedVendorId = vendorId;
  
    let matched =
      trackings.find((t) => {
        const vCode = t.vendor?.code?.trim().toLowerCase() || '';
        return vidNorm && vCode === vidNorm;
      }) || null;
  
    if (!matched && !resolvedVendorId) {
      const attribution = await partnersService
        .resolveAttribution(vid)
        .catch(() => ({ vendorId: undefined }));
      resolvedVendorId = attribution.vendorId;
    }
  
    if (!matched && resolvedVendorId) {
      matched =
        trackings.find(
          (t) => (t.vendor?.id ?? t.vendorId) === resolvedVendorId,
        ) || null;
    }
  
    if (!matched) return;
  
    const assignmentActive = matched.active !== false;
    const vendorActive = matched.vendor?.active !== false;
  
    if (!assignmentActive || !vendorActive) {
      const err = new Error('This offer is not available');
      err.statusCode = 403;
      throw err;
    }
  };

  const getFlowEntry = async (input) => {
    const campaign = await resolveCampaign(input);
    if (!campaign) {
      const err = new Error(
        `No campaign found for ${input.country} / ${input.operator}`,
      );
      err.statusCode = 404;
      throw err;
    }
    if (!campaign.active) {
      const err = new Error('This offer is not available');
      err.statusCode = 403;
      throw err;
    }
    const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
    return {
      campaignId: campaign.id,
      entryPage: flowEngineService.getEntryPage(flowConfig),
    };
  };

  return {
    loadVisitAttribution,
    resolveSuccessRedirect,
    maybeNullFlowCgRedirect,
    resolveCampaign,
    assertTrackingAssignmentAvailable,
    getFlowEntry,
  };
}
