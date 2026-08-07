import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { searchService } from '../search/search.service.js';
import { campaignsService } from '../campaigns/campaigns.service.js';

const buildParams = (campaignId, query) => {
  const interval =
    query.interval === 'hour' || query.interval === 'day'
      ? query.interval
      : undefined;
  return {
    campaignId,
    visitId: query.visitId ? Number(query.visitId) : undefined,
    from: query.from,
    to: query.to,
    eventType: query.eventType,
    vendorId: query.vendorId ? Number(query.vendorId) : undefined,
    affiliateId: query.affiliateId ? Number(query.affiliateId) : undefined,
    clickId: query.clickId,
    q: query.q,
    page: query.page ? Number(query.page) : undefined,
    size: query.size ? Number(query.size) : undefined,
    interval,
    timezone: query.timezone || undefined,
    view: query.view === 'sessions' ? 'sessions' : 'events',
  };
};

export const logsController = {
  status: asyncHandler(async (_req, res) => {
    res.json({ enabled: searchService.isEnabled() });
  }),

  campaignSearch: asyncHandler(async (req, res) => {
    const campaignId = parseInt(req.params.campaignId, 10);
    await campaignsService.findOne(campaignId, req.user.id);
    const data = await searchService.search(
      buildParams(campaignId, req.query || {}),
    );
    res.json(data);
  }),

  campaignAggregations: asyncHandler(async (req, res) => {
    const campaignId = parseInt(req.params.campaignId, 10);
    await campaignsService.findOne(campaignId, req.user.id);
    const data = await searchService.aggregations(
      buildParams(campaignId, req.query || {}),
    );
    res.json(data);
  }),

  allSearch: asyncHandler(async (req, res) => {
    const campaigns = await campaignsService.findAll(req.user.id);
    const campaignIds = campaigns.map((c) => c.id);
    if (campaignIds.length === 0) {
      return res.json({ total: 0, page: 1, size: 25, items: [] });
    }
    const data = await searchService.search(
      buildParams(campaignIds, req.query || {}),
    );
    res.json(data);
  }),

  allAggregations: asyncHandler(async (req, res) => {
    const campaigns = await campaignsService.findAll(req.user.id);
    const campaignIds = campaigns.map((c) => c.id);
    if (campaignIds.length === 0) {
      return res.json({
        enabled: true,
        timeSeries: [],
        byEventType: [],
        byVendor: [],
        byAffiliate: [],
        byStatus: [],
      });
    }
    const data = await searchService.aggregations(
      buildParams(campaignIds, req.query || {}),
    );
    res.json(data);
  }),
};
