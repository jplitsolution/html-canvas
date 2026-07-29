import { analyticsService } from './analytics.service.js';

export async function analyticsRoutes(fastify, options) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/campaign/:campaignId', async (request, reply) => {
    return analyticsService.getCampaignAnalytics(
      request.params.campaignId,
      request.user.id,
    );
  });

  fastify.get('/campaign/:campaignId/logs', async (request, reply) => {
    return analyticsService.getCampaignActivityLogs(
      request.params.campaignId,
      request.user.id,
      request.query || {},
    );
  });
}
