import { asyncHandler } from '../../../common/middleware/asyncHandler.js';
import { apiCallLogService } from '../api-call-log.service.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';

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

/**
 * Server-side fetch for Priority Chain API checks.
 * Browser CORS blocks direct calls to partner checksub URLs — this proxies them.
 */
export const priorityCheck = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const rawUrl = String(body.url || '').trim();
  if (!rawUrl || rawUrl === 'https://' || rawUrl === 'http://') {
    return res.status(400).json({ ok: false, error: 'url is required' });
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid url' });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ ok: false, error: 'only http/https allowed' });
  }

  const visitId = body.visitId ? parseInt(body.visitId, 10) : null;
  const campaignId = body.campaignId ? parseInt(body.campaignId, 10) : null;
  const msisdn =
    String(body.msisdn || body.phone || '').replace(/\D/g, '') || null;
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
    const axiosRes = await axios.get(rawUrl, {
      timeout: 12000,
      validateStatus: () => true,
      headers: { Accept: 'application/json, text/plain, */*' },
    });
    let json = axiosRes.data;
    if (typeof json === 'string') {
      try {
        json = JSON.parse(json);
      } catch {
        json = null;
      }
    }
    const ok = axiosRes.status >= 200 && axiosRes.status < 300;
    await logPriorityCall({
      responseStatus: axiosRes.status,
      responseBody: json ?? axiosRes.data,
      success: ok,
      errorMessage: ok ? null : `HTTP ${axiosRes.status}`,
      statusLabel: priorityStatusLabel(json, ok),
    });
    return res.json({
      ok,
      status: axiosRes.status,
      body: json,
    });
  } catch (err) {
    console.warn('[Priority Check] proxy fetch failed:', err.message);
    await logPriorityCall({
      responseStatus: 0,
      responseBody: null,
      success: false,
      errorMessage: err.message || 'proxy fetch failed',
      statusLabel: 'FAILED',
    });
    return res.json({
      ok: false,
      status: 0,
      body: null,
      error: err.message || 'proxy fetch failed',
    });
  }
});
