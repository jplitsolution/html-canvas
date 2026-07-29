import { flowService } from './flow.service.js';
import { CampaignPageType } from '../campaigns/entities/campaign-page.entity.js';

export async function flowRoutes(fastify, options) {
  fastify.get('/entry', async (request, reply) => {
    const q = request.query || {};
    return flowService.getFlowEntry({
      country: q.country,
      operator: q.operator,
      campid: q.campid,
    });
  });

  fastify.get('/page', async (request, reply) => {
    const q = request.query || {};
    const ipAddress =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return flowService.getPage({
      country: q.country,
      operator: q.operator,
      campid: q.campid,
      pageType: q.page || CampaignPageType.HOME,
      phone: q.msisdn,
      visitId: q.visitId ? Number(q.visitId) : undefined,
      pack: q.pack,
      vid: q.vid,
      affId: q.affId,
      clickId: q.clickId,
      landingUrl: q.landingUrl || request.url,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
    });
  });

  fastify.post('/transition', async (request, reply) => {
    const body = request.body || {};
    return flowService.transition({
      visitId: body.visitId,
      fromPage: body.fromPage,
      action: body.action,
      phone: body.phone,
      planId: body.planId,
      country: body.country,
      operator: body.operator,
      campid: body.campid,
    });
  });
}
