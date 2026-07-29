import { marketsService } from './markets.service.js';
import { campaignsService } from '../campaigns/campaigns.service.js';

export async function marketsRoutes(fastify, options) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    return marketsService.listMarkets(request.user.id);
  });

  fastify.post('/', async (request, reply) => {
    reply.status(201);
    return marketsService.createMarket(request.body || {}, request.user.id);
  });

  fastify.get('/:countryCode/:operatorCode', async (request, reply) => {
    const { countryCode, operatorCode } = request.params;
    return marketsService.getMarket(countryCode, operatorCode, request.user.id);
  });

  fastify.get('/:countryCode/:operatorCode/campaigns', async (request, reply) => {
    const { countryCode, operatorCode } = request.params;
    return marketsService.listCampaignsForMarket(
      countryCode,
      operatorCode,
      request.user.id,
    );
  });

  fastify.post('/:countryCode/:operatorCode/campaigns', async (request, reply) => {
    const { countryCode, operatorCode } = request.params;
    const dto = request.body || {};
    const { country, operator } = await marketsService.findMarketByCodes(
      countryCode,
      operatorCode,
      request.user.id,
    );
    reply.status(201);
    return campaignsService.create(
      {
        name: dto.name,
        country: country.name,
        operator: operator.name,
        countryCode: country.code,
        operatorCode: operator.code,
        operatorId: operator.id,
        copyFromCampaignId: dto.copyFromCampaignId
          ? Number(dto.copyFromCampaignId)
          : undefined,
      },
      request.user.id,
    );
  });
}
