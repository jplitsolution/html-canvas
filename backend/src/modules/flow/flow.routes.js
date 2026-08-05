import { flowService } from './flow.service.js';
import { postbackService } from '../partners/postback.service.js';
import { CampaignPageType } from '../campaigns/entities/campaign-page.entity.js';
import { publicRateLimit } from '../../common/guards/public-rate-limit.guard.js';
import getConfig from '../../config/configuration.js';
import { apiCallLogService } from './api-call-log.service.js';
import { ApiCallType } from './entities/api-call-log.entity.js';

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

/**
 * Resolve MSISDN for HE flows.
 * Priority:
 *   1) Real carrier HE header (x-msisdn, …) — always wins
 *   2) Query msisdn/phone (already known from URL/session)
 *   3) HE_DUMMY_MSISDN — ONLY when header is absent (and no query phone)
 */
function resolveRequestMsisdn(headers, query = {}) {
  const headerPhone = String(extractHeaderMsisdn(headers) || '').replace(/\D/g, '');
  const queryPhone = String(query.msisdn || query.phone || '').replace(/\D/g, '');

  // Real operator header enrichment — never replace with dummy.
  if (headerPhone) {
    return { phone: headerPhone, source: 'header', headerPhone };
  }

  // Session / URL already has a number (user entered or prior resolve).
  if (queryPhone) {
    return { phone: queryPhone, source: 'query', headerPhone: '' };
  }

  // Local / test fallback — only when no HE header arrived.
  const config = getConfig();
  const dummy = config.heDummyMsisdn || '';
  if (dummy) {
    const isProd = String(config.environment || '').toLowerCase() === 'production';
    if (isProd) {
      console.warn(
        `[HE DEBUG] no HE header — using HE_DUMMY_MSISDN=${dummy} (unset on live operator traffic)`,
      );
    } else {
      console.log(`[HE DEBUG] no HE header — using HE_DUMMY_MSISDN=${dummy}`);
    }
    return { phone: dummy, source: 'he_dummy_msisdn', headerPhone: '' };
  }

  return { phone: '', source: null, headerPhone: '' };
}

/**
 * Dual-ID intake:
 * - rcid = affiliate original (explicit rcid, else first-land click_id when no visit yet)
 * - clickId = our id once issued (click_id / clickId); on first land may equal affiliate's
 *   until visit create rewrites it — service treats input.rcid || input.clickId as affiliate rcid.
 */
function resolveAttributionParams(q = {}) {
  const hasVisit = Boolean(q.visitId);
  const rcid = String(q.rcid || (!hasVisit ? q.click_id || q.clickId || '' : '') || '').trim();
  const clickId = String(q.clickId || q.click_id || '').trim();
  return {
    rcid: rcid || undefined,
    clickId: clickId || undefined,
  };
}

export async function flowRoutes(fastify, options) {
  fastify.get('/detect-msisdn', async (request, reply) => {
    const q = request.query || {};
    const allHeaders = { ...(request.headers || {}) };
    const resolved = resolveRequestMsisdn(request.headers, q);
    const ipAddress =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    console.log('[HE DEBUG] /detect-msisdn headers:', JSON.stringify(allHeaders, null, 2));
    console.log(
      '[HE DEBUG] extracted MSISDN:',
      resolved.phone || '(none)',
      resolved.source ? `(${resolved.source})` : '',
    );

    const result = await flowService.detectMsisdn({
      country: q.country,
      operator: q.operator,
      campid: q.campid,
      phone: resolved.phone,
      clickId: q.click_id || q.clickId || q.clickid,
      rcid: q.rcid,
      sessionId: q.sessionId || q.session_id || request.headers['x-session-id'],
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
    });

    return {
      ...result,
      debugHeaders: allHeaders,
      debugHeaderPhone: resolved.headerPhone || null,
      debugMsisdnSource: resolved.source,
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
    const resolved = resolveRequestMsisdn(request.headers, q);
    const attr = resolveAttributionParams(q);
    const ipAddress =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    console.log('[HE DEBUG] /flow/page headers:', JSON.stringify(allHeaders, null, 2));
    console.log(
      '[HE DEBUG] /flow/page extracted MSISDN:',
      resolved.phone || '(none)',
      resolved.source ? `(${resolved.source})` : '',
      'page=',
      q.page,
    );

    const direct =
      q.direct === '1' ||
      q.direct === 'true' ||
      q.direct === true ||
      q.direct === 1;

    const result = await flowService.getPage({
      country: q.country,
      operator: q.operator,
      campid: q.campid,
      pageType: String(q.page || CampaignPageType.HOME).toUpperCase(),
      phone: resolved.phone,
      visitId: q.visitId ? Number(q.visitId) : undefined,
      pack: q.pack,
      vid: q.vid,
      affId: q.affId || q.aff_id,
      clickId: attr.clickId,
      rcid: attr.rcid,
      landingUrl: q.landingUrl || request.url,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
      direct: Boolean(direct),
    });

    return {
      ...result,
      debugHeaders: allHeaders,
      debugHeaderPhone: resolved.headerPhone || null,
      debugMsisdnSource: resolved.source,
    };
  });

  fastify.post('/transition', { preHandler: publicRateLimit }, async (request, reply) => {
    const body = request.body || {};
    const hasVisit = Boolean(body.visitId);
    const rcid = String(
      body.rcid || (!hasVisit ? body.click_id || body.clickId || '' : '') || '',
    ).trim();
    const clickId = String(body.clickId || body.click_id || '').trim();

    return flowService.transition({
      visitId: body.visitId,
      fromPage: body.fromPage,
      action: body.action,
      phone: body.phone,
      planId: body.planId,
      country: body.country,
      operator: body.operator,
      campid: body.campid,
      clickId: clickId || undefined,
      rcid: rcid || undefined,
      vid: body.vid,
      affId: body.affId || body.aff_id,
    });
  });

  /**
   * Server-side fetch for Priority Chain API checks.
   * Browser CORS blocks direct calls to partner checksub URLs — this proxies them.
   * Persists request/response into api_call_logs (same audit trail as checksub).
   */
  fastify.post('/priority-check', { preHandler: publicRateLimit }, async (request, reply) => {
    const body = request.body || {};
    const rawUrl = String(body.url || '').trim();
    if (!rawUrl || rawUrl === 'https://' || rawUrl === 'http://') {
      return reply.code(400).send({ ok: false, error: 'url is required' });
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return reply.code(400).send({ ok: false, error: 'invalid url' });
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return reply.code(400).send({ ok: false, error: 'only http/https allowed' });
    }

    const visitId = body.visitId ? parseInt(body.visitId, 10) : null;
    const campaignId = body.campaignId ? parseInt(body.campaignId, 10) : null;
    const msisdn = String(body.msisdn || body.phone || '').replace(/\D/g, '') || null;
    const clickId = body.clickId || null;
    const rcid = body.rcid || null;
    const stepIndex =
      body.stepIndex != null && Number.isFinite(Number(body.stepIndex))
        ? Number(body.stepIndex)
        : null;
    const pageType = body.pageType ? String(body.pageType).toUpperCase() : null;
    const requestMeta = {
      source: 'priority_chain',
      method: 'GET',
      ...(stepIndex != null ? { priority: stepIndex + 1, stepIndex } : {}),
      ...(pageType ? { pageType } : {}),
      ...(Array.isArray(body.rules) ? { rules: body.rules } : {}),
      ...(body.successKey ? { successKey: body.successKey } : {}),
      ...(body.successValue != null ? { successValue: body.successValue } : {}),
    };

    const serializeBody = (data) => {
      if (data == null) return null;
      try {
        return typeof data === 'string' ? data : JSON.stringify(data);
      } catch {
        return String(data);
      }
    };

    const priorityStatusLabel = (json, httpOk) => {
      const nested = json?.data ?? json ?? {};
      const current = String(nested.currentStatus || '')
        .trim()
        .toLowerCase();
      const sub = String(nested.subscriptionStatus || '')
        .trim()
        .toLowerCase();
      if (current === 'active' || sub === 'active') return 'ACTIVE';
      if (current) return current.toUpperCase();
      if (sub) return sub.toUpperCase();
      const code = json?.responseCode;
      if (code === '0' || code === 0) return 'SUCCESS';
      if (!httpOk) return 'FAILED';
      return httpOk ? 'SUCCESS' : 'FAILED';
    };

    const logPriorityCall = async ({
      responseStatus,
      responseBody,
      success,
      errorMessage,
      statusLabel,
    }) => {
      try {
        await apiCallLogService.record({
          visitId,
          campaignId,
          msisdn,
          clickId,
          rcid,
          callType: ApiCallType.PRIORITY,
          requestUrl: rawUrl,
          requestBody: serializeBody(requestMeta),
          responseStatus,
          responseBody: serializeBody(responseBody),
          success,
          errorMessage,
          statusLabel,
        });
      } catch (err) {
        console.warn(`[Priority Check] api_call_logs write failed: ${err.message}`);
      }
    };

    try {
      const axios = (await import('axios')).default;
      const res = await axios.get(rawUrl, {
        timeout: 12000,
        validateStatus: () => true,
        headers: { Accept: 'application/json, text/plain, */*' },
      });
      let json = res.data;
      if (typeof json === 'string') {
        try {
          json = JSON.parse(json);
        } catch {
          json = null;
        }
      }
      const ok = res.status >= 200 && res.status < 300;
      await logPriorityCall({
        responseStatus: res.status,
        responseBody: json ?? res.data,
        success: ok,
        errorMessage: ok ? null : `HTTP ${res.status}`,
        statusLabel: priorityStatusLabel(json, ok),
      });
      return {
        ok,
        status: res.status,
        body: json,
      };
    } catch (err) {
      console.warn('[Priority Check] proxy fetch failed:', err.message);
      await logPriorityCall({
        responseStatus: 0,
        responseBody: null,
        success: false,
        errorMessage: err.message || 'proxy fetch failed',
        statusLabel: 'FAILED',
      });
      return {
        ok: false,
        status: 0,
        body: null,
        error: err.message || 'proxy fetch failed',
      };
    }
  });

  /** Billing / operator → us: fire pending vendor CPA for MSISDN. */
  const handleCallback = async (request) => {
    const q = { ...(request.query || {}), ...(request.body || {}) };
    return postbackService.processOperatorCallback(q);
  };
  fastify.get('/callback', { preHandler: publicRateLimit }, handleCallback);
  fastify.post('/callback', { preHandler: publicRateLimit }, handleCallback);

  /** Optional pre-register (CG / getredirecturl parity). */
  fastify.post('/register-postback', { preHandler: publicRateLimit }, async (request) => {
    const body = request.body || {};
    return postbackService.registerPending({
      visitId: body.visitId,
      msisdn: body.msisdn || body.phone,
      campaignId: body.campaignId,
      campid: body.campid || body.camp,
      clickId: body.clickId || body.click_id,
      rcid: body.rcid,
      vendorId: body.vendorId,
      affiliateId: body.affiliateId,
      offerCode: body.offerCode || body.offer,
    });
  });
}
