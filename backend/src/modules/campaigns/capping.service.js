import { getRepository } from '../../database/index.js';
import { Campaign } from '../../database/entities/campaign.entity.js';
import { CampaignTracking } from '../../database/entities/campaign-tracking.entity.js';
import { Visit } from '../../database/entities/visit.entity.js';
import { redisService } from '../../common/services/redis.service.js';
import { partnersService } from '../partners/partners.service.js';

export const createCappingService = () => {
  const getCampaignRepo = () => getRepository(Campaign);
  const getTrackingRepo = () => getRepository(CampaignTracking);
  const getVisitRepo = () => getRepository(Visit);

  const getTodayUtcString = () => {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  };

  const getRedisKey = (campaignId, interval = 'daily') => {
    if (interval === 'total') {
      return `capping:count:${campaignId}:total`;
    }
    return `capping:count:${campaignId}:${getTodayUtcString()}`;
  };

  const getCampaignClickCount = async (campaignId, interval = 'daily') => {
    const key = getRedisKey(campaignId, interval);
    try {
      const cached = await redisService.get(key);
      if (cached !== null && cached !== undefined) {
        return parseInt(cached, 10) || 0;
      }
    } catch {
      // redis error fallback to db
    }

    // DB Fallback count from visits table
    let count = 0;
    try {
      const qb = getVisitRepo()
        .createQueryBuilder('v')
        .where('v.campaign_id = :campaignId', { campaignId });

      if (interval === 'daily') {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        qb.andWhere('v.created_at >= :startOfDay', { startOfDay });
      }

      count = await qb.getCount();

      try {
        await redisService.set(
          key,
          count,
          interval === 'daily' ? 86400 * 2 : 86400 * 7,
        );
      } catch {
        // ignore redis error
      }
    } catch (err) {
      console.warn(
        `Failed to get click count for campaign ${campaignId}: ${err.message}`,
      );
    }

    return count;
  };

  const incrementCampaignClickCount = async (campaignId, interval = 'daily') => {
    const key = getRedisKey(campaignId, interval);
    const ttl = interval === 'daily' ? 86400 * 2 : 86400 * 7;
    try {
      const nextVal = await redisService.incr(key, ttl);
      if (nextVal > 0) return nextVal;
      // If redis is not connected or returned 0, fallback
      const curr = await getCampaignClickCount(campaignId, interval);
      const manualNext = curr + 1;
      await redisService.set(key, manualNext, ttl);
      return manualNext;
    } catch (err) {
      console.warn(
        `Failed to increment capping count for campaign ${campaignId}: ${err.message}`,
      );
      return null;
    }
  };

  const resolveVendorId = async (vid, vendorId) => {
    if (vendorId != null && !Number.isNaN(Number(vendorId))) {
      return Number(vendorId);
    }
    if (vid) {
      const attr = await partnersService.resolveAttribution(vid).catch(() => ({}));
      if (attr?.vendorId) return Number(attr.vendorId);
    }
    return null;
  };

  const isVendorAssignedToCampaign = async (campaignId, resolvedVendorId) => {
    if (!campaignId || !resolvedVendorId) return false;
    const tracking = await getTrackingRepo().findOne({
      where: {
        campaignId: Number(campaignId),
        vendorId: Number(resolvedVendorId),
        active: true,
      },
    });
    return Boolean(tracking);
  };

  /**
   * Evaluate if campaign reached its click capping limit, and determine action.
   * Returns:
   *  - { isCapped: false, action: 'allow' }
   *  - { isCapped: true, action: 'stop', reason: string }
   *  - { isCapped: true, action: 'fallback', targetCampaign: object, resolvedVendorId: number }
   */
  const evaluateCapping = async (campaign, { vid, vendorId } = {}) => {
    if (!campaign || !campaign.cappingEnabled) {
      return { isCapped: false, action: 'allow' };
    }

    const limit =
      campaign.cappingLimit != null ? Number(campaign.cappingLimit) : null;
    if (!limit || limit <= 0) {
      return { isCapped: false, action: 'allow' };
    }

    const interval = campaign.cappingInterval || 'daily';
    const currentCount = await getCampaignClickCount(campaign.id, interval);

    if (currentCount < limit) {
      return { isCapped: false, action: 'allow', currentCount, limit };
    }

    // Cap limit reached!
    const action = String(campaign.cappingAction || 'stop').toLowerCase();
    if (action !== 'fallback' || !campaign.fallbackCampaignId) {
      return {
        isCapped: true,
        action: 'stop',
        currentCount,
        limit,
        reason: 'LIMIT_REACHED',
      };
    }

    // Fallback requested:
    const fallbackCampaign = await getCampaignRepo().findOne({
      where: { id: Number(campaign.fallbackCampaignId) },
      relations: {
        marketOperator: { country: true },
        trackings: { vendor: true },
      },
    });

    if (!fallbackCampaign || !fallbackCampaign.active) {
      return {
        isCapped: true,
        action: 'stop',
        currentCount,
        limit,
        reason: 'FALLBACK_CAMPAIGN_INACTIVE',
      };
    }

    // Check Vendor Assignment on Fallback Campaign
    const resolvedVendorId = await resolveVendorId(vid, vendorId);
    if (!resolvedVendorId) {
      // No vendor assigned/found — redirecting would create an anonymous untracked click
      return {
        isCapped: true,
        action: 'stop',
        currentCount,
        limit,
        reason: 'VENDOR_NOT_FOUND',
      };
    }

    const assigned = await isVendorAssignedToCampaign(
      fallbackCampaign.id,
      resolvedVendorId,
    );
    if (!assigned) {
      return {
        isCapped: true,
        action: 'stop',
        currentCount,
        limit,
        resolvedVendorId,
        fallbackCampaignId: fallbackCampaign.id,
        reason: 'VENDOR_NOT_ASSIGNED',
      };
    }

    return {
      isCapped: true,
      action: 'fallback',
      targetCampaign: fallbackCampaign,
      currentCount,
      limit,
      resolvedVendorId,
    };
  };

  return {
    getCampaignClickCount,
    incrementCampaignClickCount,
    resolveVendorId,
    isVendorAssignedToCampaign,
    evaluateCapping,
  };
};

export const cappingService = createCappingService();
