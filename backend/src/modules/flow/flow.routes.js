import { flowService } from './flow.service.js';
import { CampaignPageType } from '../campaigns/entities/campaign-page.entity.js';
import { publicRateLimit } from '../../common/guards/public-rate-limit.guard.js';

function extractHeaderMsisdn(headers) {
  if (!headers) return '';
  const candidate =
    headers['x-msisdn'] ||
    headers['x-msisdn-number'] ||
    headers['msisdn'] ||
    headers['x-up-calling-line-id'] ||
    headers['x-fh-msisdn'] ||
    headers['user-identity-forward-msisdn'] ||
    headers['http-msisdn'] ||
    headers['x-network-info'] ||
    headers['x-operator-msisdn'] ||
    '';
  return Array.isArray(candidate) ? candidate[0] : String(candidate || '');
}

export async function flowRoutes(fastify, options) {
  fastify.get('/detect-msisdn', async (request, reply) => {
    const q = request.query || {};
    const headerPhone = extractHeaderMsisdn(request.headers);
    const ipAddress =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return flowService.detectMsisdn({
      country: q.country,
      operator: q.operator,
      campid: q.campid,
      phone: headerPhone || q.msisdn || q.phone,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
    });
  });

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
    const headerPhone = extractHeaderMsisdn(request.headers);
    const ipAddress =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return flowService.getPage({
      country: q.country,
      operator: q.operator,
      campid: q.campid,
      pageType: q.page || CampaignPageType.HOME,
      phone: headerPhone || q.msisdn,
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

  fastify.post('/transition', { preHandler: publicRateLimit }, async (request, reply) => {
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
