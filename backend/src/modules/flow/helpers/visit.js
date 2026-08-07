import { randomUUID } from 'crypto';
import { partnersService } from '../../partners/partners.service.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { VisitStatus } from '../../../database/entities/visit.entity.js';
import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { redisService } from '../../../common/services/redis.service.js';
import { splitDualCampids } from '../../markets/helpers/tracking-id.util.js';
import { heService } from '../he.service.js';

export function createFlowVisit(deps) {
  // deps reserved for future wiring; visit helpers use imported services directly
  void deps;

  const applyHeRedirectVars = (rawUrl, vars = {}) => {
    let url = String(rawUrl || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) return '';
    for (const [key, val] of Object.entries(vars)) {
      const encoded = encodeURIComponent(val == null ? '' : String(val));
      url = url.split(`{{${key}}}`).join(encoded);
      url = url.split(`{${key}}`).join(encoded);
    }
    return url;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /**
   * One landing click → one visit. detect-msisdn and /page race; lock on rcid,
   * then reconcile to the oldest visit if two slipped through.
   */
  const resolveOrCreateLandingVisit = async (campaign, input = {}) => {
    const networkRcid =
      String(input.rcid || input.clickId || '').trim() || null;
    const dualIds = splitDualCampids(input);

    const attrCacheKey = `flow:attr:${input.vid || ''}`;
    let attribution = await redisService.get(attrCacheKey);
    if (!attribution) {
      attribution = await partnersService
        .resolveAttribution(input.vid)
        .catch(() => ({
          vendorId: undefined,
          affiliateId: null,
          mismatch: false,
        }));
      await redisService.set(attrCacheKey, attribution, 15);
    }

    const patchMeta = async (visitId) => {
      await analyticsService.ensureVisitAttribution(visitId, {
        campid: dualIds.vendorCampid,
        trackingCampid: dualIds.trackingCampid || campaign.trackingId || '',
        vidRaw: input.vid,
        vendorId: attribution.vendorId,
      });
    };

    const reuse = async (visit) => {
      await patchMeta(visit.id);
      if (input.phone) {
        await analyticsService.setVisitPhone(visit.id, input.phone);
      }
      return {
        visitId: visit.id,
        clickId: visit.clickId || null,
        rcid: visit.rcid || networkRcid,
        created: false,
      };
    };

    if (input.visitId) {
      const existing = await analyticsService.getVisit(input.visitId);
      if (existing && existing.campaignId === campaign.id) {
        return reuse(existing);
      }
    }

    if (networkRcid) {
      const recent = await analyticsService.findRecentVisitByRcid(
        campaign.id,
        networkRcid,
      );
      if (recent) return reuse(recent);
    }

    const createFresh = async () => {
      const ourClickId = randomUUID();
      const visit = await analyticsService.createVisit({
        campaignId: campaign.id,
        phone: heService.normalizePhone(input.phone) || undefined,
        country: campaign.country,
        operator: campaign.operator,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        landingUrl: input.landingUrl,
        visitStatus: VisitStatus.VISIT,
        pageType: CampaignPageType.HOME,
        vendorId: attribution.vendorId,
        affiliateId: null,
        clickId: ourClickId,
        rcid: networkRcid,
        campid: dualIds.vendorCampid || null,
        trackingCampid:
          dualIds.trackingCampid || campaign.trackingId || null,
        vidRaw: input.vid || null,
        affRaw: null,
      });
      return { visit, ourClickId };
    };

    /** If a parallel request won, drop our orphan and use the oldest visit. */
    const reconcile = async (createdVisit, ourClickId) => {
      if (!networkRcid) {
        return {
          visitId: createdVisit.id,
          clickId: ourClickId,
          rcid: networkRcid,
          created: true,
        };
      }
      const winner = await analyticsService.findRecentVisitByRcid(
        campaign.id,
        networkRcid,
      );
      if (winner && winner.id !== createdVisit.id) {
        await analyticsService
          .abandonOrphanVisit(createdVisit.id)
          .catch(() => {});
        return reuse(winner);
      }
      return {
        visitId: createdVisit.id,
        clickId: ourClickId,
        rcid: networkRcid,
        created: true,
      };
    };

    const lockKey = networkRcid
      ? `flow:vlock:${campaign.id}:${networkRcid}`
      : null;

    if (lockKey) {
      for (let i = 0; i < 25; i++) {
        const got = await redisService.setNx(lockKey, '1', 8);
        if (got) {
          try {
            const again = await analyticsService.findRecentVisitByRcid(
              campaign.id,
              networkRcid,
            );
            if (again) return reuse(again);
            const { visit, ourClickId } = await createFresh();
            return reconcile(visit, ourClickId);
          } finally {
            await redisService.del(lockKey);
          }
        }
        await sleep(40);
        const raced = await analyticsService.findRecentVisitByRcid(
          campaign.id,
          networkRcid,
        );
        if (raced) return reuse(raced);
      }
    }

    const { visit, ourClickId } = await createFresh();
    return reconcile(visit, ourClickId);
  };

  /**
   * Ensure visit + dual click IDs before HE HTTP so api_call_logs always have visitId.
   * HOME_VIEW is still logged on getPage — only VISIT event here (via createVisit).
   */
  const ensureVisitForDetect = async (campaign, input) => {
    if (!campaign?.id) {
      return { visitId: null, clickId: null, rcid: null };
    }
    return resolveOrCreateLandingVisit(campaign, input);
  };

  return {
    applyHeRedirectVars,
    sleep,
    resolveOrCreateLandingVisit,
    ensureVisitForDetect,
  };
}
