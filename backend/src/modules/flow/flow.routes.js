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
    const allHeaders = { ...(request.headers || {}) };
    const headerPhone = extractHeaderMsisdn(request.headers);
    const ipAddress =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    // TEMP debug — full headers for HE testing (also returned to browser console)
    console.log('[HE DEBUG] /detect-msisdn headers:', JSON.stringify(allHeaders, null, 2));
    console.log('[HE DEBUG] extracted MSISDN:', headerPhone || '(none)');

    const result = await flowService.detectMsisdn({
      country: q.country,
      operator: q.operator,
      campid: q.campid,
      phone: headerPhone || q.msisdn || q.phone,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
    });

    return {
      ...result,
      debugHeaders: allHeaders,
      debugHeaderPhone: headerPhone || null,
    };
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
    const allHeaders = { ...(request.headers || {}) };
    const headerPhone = extractHeaderMsisdn(request.headers);
    const ipAddress =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    // TEMP debug — ERROR/HOME/etc. sab pages pe headers dikhne chahiye
    console.log('[HE DEBUG] /flow/page headers:', JSON.stringify(allHeaders, null, 2));
    console.log('[HE DEBUG] /flow/page extracted MSISDN:', headerPhone || '(none)', 'page=', q.page);

    const result = await flowService.getPage({
      country: q.country,
      operator: q.operator,
      campid: q.campid,
      pageType: q.page || CampaignPageType.HOME,
      phone: headerPhone || q.msisdn,
      visitId: q.visitId ? Number(q.visitId) : undefined,
      pack: q.pack,
      vid: q.vid,
      affId: q.affId || q.aff_id,
      clickId: q.clickId || q.click_id || q.rcid,
      landingUrl: q.landingUrl || request.url,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
    });

    return {
      ...result,
      debugHeaders: allHeaders,
      debugHeaderPhone: headerPhone || null,
    };
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
      clickId: body.clickId || body.click_id || body.rcid,
      vid: body.vid,
      affId: body.affId || body.aff_id,
    });
  });
}
