import { searchService } from '../search/search.service.js';
import { campaignsService } from '../campaigns/campaigns.service.js';

export async function logsRoutes(fastify, options) {
  fastify.addHook('onRequest', fastify.authenticate);

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

  fastify.get('/status', async (request, reply) => {
    return { enabled: searchService.isEnabled() };
  });

  fastify.get('/campaign/:campaignId', async (request, reply) => {
    const campaignId = parseInt(request.params.campaignId, 10);
    await campaignsService.findOne(campaignId, request.user.id);
    return searchService.search(buildParams(campaignId, request.query || {}));
  });

  fastify.get('/campaign/:campaignId/aggregations', async (request, reply) => {
    const campaignId = parseInt(request.params.campaignId, 10);
    await campaignsService.findOne(campaignId, request.user.id);
    return searchService.aggregations(buildParams(campaignId, request.query || {}));
  });

  fastify.get('/all', async (request, reply) => {
    const campaigns = await campaignsService.findAll(request.user.id);
    const campaignIds = campaigns.map((c) => c.id);
    if (campaignIds.length === 0) return { total: 0, page: 1, size: 25, items: [] };
    return searchService.search(buildParams(campaignIds, request.query || {}));
  });

  fastify.get('/all/aggregations', async (request, reply) => {
    const campaigns = await campaignsService.findAll(request.user.id);
    const campaignIds = campaigns.map((c) => c.id);
    if (campaignIds.length === 0) {
      return {
        enabled: true,
        timeSeries: [],
        byEventType: [],
        byVendor: [],
        byAffiliate: [],
        byStatus: [],
      };
    }
    return searchService.aggregations(buildParams(campaignIds, request.query || {}));
  });
}
