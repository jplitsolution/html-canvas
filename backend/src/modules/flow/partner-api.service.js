import axios from 'axios';
import { apiCallLogService } from './api-call-log.service.js';
import { ApiCallType } from '../../database/entities/api-call-log.entity.js';
import { interpretChecksubResponse } from './helpers/checksub-rules.js';
import {
  fillSubscribeTemplate,
  mapSubServiceId,
  sanitizeSubscribeParam,
} from './helpers/pack-url.js';

export const createPartnerApiService = () => {
  const parseHeaders = (headersJson) => {
    if (!headersJson) return {};
    try {
      return JSON.parse(headersJson);
    } catch {
      return {};
    }
  };

  const resolveTemplate = (template, vars) =>
    fillSubscribeTemplate(template, vars);

  const buildVars = (input) => {
    const phone = input.phone ?? '';
    const planId = input.planId ?? '';
    // Never expose click_id / campid / rcid to third-party partner URLs —
    // those stay on our visit / api_call_logs only.
    return {
      phone,
      msisdn: phone,
      serviceId: sanitizeSubscribeParam(input.serviceId),
      country: input.country ?? '',
      operator: input.operator ?? '',
      planId,
      pack: planId || 'daily',
      subServiceId:
        sanitizeSubscribeParam(input.subServiceId) || mapSubServiceId(planId),
    };
  };

  /** Body sent to partners — strip internal attribution fields. */
  const partnerRequestBody = (input = {}) => {
    const {
      clickId,
      click_id,
      rcid,
      campid,
      trackingCampid,
      tracking_campid,
      visitId,
      campaignId,
      ...rest
    } = input;
    return rest;
  };

  const serializeBody = (data) => {
    if (data == null) return null;
    try {
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch {
      return String(data);
    }
  };

  const subscribeStatusLabel = (data, success, fallback) => {
    const nested = data?.data && typeof data.data === 'object' ? data.data : data;
    const current = String(nested?.currentStatus || '').trim();
    if (current) return current.toUpperCase();
    const sub = String(nested?.subscriptionStatus || '').trim();
    if (sub) return sub.toUpperCase();
    const code = nested?.responseCode ?? data?.responseCode;
    if (code === '0' || code === 0) return 'SUCCESS';
    if (typeof nested?.response === 'string' && nested.response) {
      return String(nested.response).toUpperCase();
    }
    if (fallback) return fallback;
    return success ? 'SUCCESS' : 'FAILED';
  };

  const subscribeRequestMeta = (input, extra = {}) => {
    const vars = buildVars(input);
    return {
      source: extra.source || 'subscribe',
      method: extra.method || null,
      planId: input.planId || vars.planId || null,
      pack: vars.pack,
      serviceId: vars.serviceId || null,
      subServiceId: vars.subServiceId || null,
      country: vars.country || null,
      operator: vars.operator || null,
      ...(extra.reason ? { skipped: true, reason: extra.reason } : {}),
    };
  };

  const resolveSubscribeTemplate = (config, input) => {
    const overrideUrl = String(input.subscribeUrl || '').trim();
    return overrideUrl || String(config?.subscribeApi || '').trim();
  };

  const logCall = async ({
    callType,
    input,
    requestUrl,
    requestBody,
    response,
    success,
    errorMessage,
    statusLabel,
  }) => {
    try {
      await apiCallLogService.record({
        visitId: input.visitId,
        campaignId: input.campaignId,
        msisdn: input.phone,
        rcid: input.rcid,
        clickId: input.clickId,
        callType,
        requestUrl,
        requestBody,
        responseStatus: response?.status ?? null,
        responseBody: serializeBody(response?.data),
        success,
        errorMessage,
        statusLabel,
      });
    } catch (err) {
      console.warn(`api_call_logs write failed: ${err.message}`);
    }
  };

  const sendRequest = async (rawUrl, input, headers, _label, options = {}) => {
    const url = resolveTemplate(rawUrl, buildVars(input));
    const method = String(options.method || '').toUpperCase();
    // Checksub is a status lookup — always GET. Otherwise: query string → GET, else POST.
    const useGet =
      method === 'GET' || (method !== 'POST' && url.includes('?'));
    const body = partnerRequestBody(input);
    return {
      url,
      response: useGet
        ? await axios.get(url, { headers, timeout: 5000 })
        : await axios.post(url, body, { headers, timeout: 5000 }),
    };
  };

  const resolveMsisdn = async (config, input) => {
    if (!config?.resolveMsisdnUrl) {
      return null;
    }
    const payload = {
      phone: input.hint,
      country: input.country,
      operator: input.operator,
      visitId: input.visitId,
      campaignId: input.campaignId,
      clickId: input.clickId,
      rcid: input.rcid,
    };
    try {
      const headers = parseHeaders(config.headersJson);
      const { url, response } = await sendRequest(
        config.resolveMsisdnUrl,
        payload,
        headers,
        'resolveMsisdn',
      );
      const data = response.data ?? {};
      const nested = data.data ?? data;
      const candidate =
        nested.msisdn ??
        nested.phone ??
        data.msisdn ??
        data.phone ??
        '';
      const resolved = String(candidate || '').trim();
      await logCall({
        callType: ApiCallType.RESOLVE_MSISDN,
        input: payload,
        requestUrl: url,
        response,
        success: Boolean(resolved),
      });
      return resolved || null;
    } catch (err) {
      console.warn(`resolveMsisdn failed: ${err.message}`);
      await logCall({
        callType: ApiCallType.RESOLVE_MSISDN,
        input: payload,
        requestUrl: config.resolveMsisdnUrl,
        success: false,
        errorMessage: err.message,
      });
      return null;
    }
  };

  const parseCachedChecksubBody = (raw) => {
    if (raw == null || raw === '') return null;
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  };

  /**
   * Partner checksub result.
   * - isActive: currentStatus/subscriptionStatus === active (content access)
   * - shouldSkipSubscribe: not a brand-new user — do not send to CONFIRM/CG
   *   (active | parking | grace | pending | …). Only `new` continues funnel.
   * - go/page/url: set when campaign checksubConfigJson rules match (optional)
   *
   * One partner HTTP per visit + MSISDN. HE detect or OTP-verify runs it;
   * subscribe / confirm / page guards reuse that result (no second Session Detail row).
   */
  const checkSubscription = async (config, input) => {
    const empty = {
      currentStatus: null,
      subscriptionStatus: null,
      status: 'unknown',
      isActive: false,
      shouldSkipSubscribe: false,
      go: null,
      page: null,
      url: null,
    };

    if (!config?.subscriptionApi || !input.phone) {
      return empty;
    }

    if (input.visitId) {
      const cached = await apiCallLogService
        .findLatestSuccessfulChecksub(input.visitId, input.phone)
        .catch(() => null);
      const cachedBody = parseCachedChecksubBody(cached?.responseBody);
      if (cachedBody != null) {
        return interpretChecksubResponse(
          cachedBody,
          config.checksubConfigJson,
        );
      }
    }

    try {
      const headers = parseHeaders(config.headersJson);
      const { url, response } = await sendRequest(
        config.subscriptionApi,
        input,
        headers,
        'checkSubscription',
        { method: 'GET' },
      );
      const rawData = response.data ?? {};
      const result = interpretChecksubResponse(
        rawData,
        config.checksubConfigJson,
      );
      await logCall({
        callType: ApiCallType.CHECKSUB,
        input,
        requestUrl: url,
        response,
        success: true,
        statusLabel: (result.status || 'UNKNOWN').toUpperCase(),
      });
      return result;
    } catch (err) {
      console.warn(`checkSubscription failed: ${err.message}`);
      await logCall({
        callType: ApiCallType.CHECKSUB,
        input,
        requestUrl: config.subscriptionApi,
        success: false,
        errorMessage: err.message,
        statusLabel: 'FAILED',
      });
      return { ...empty, status: 'failed' };
    }
  };

  const checkBlocked = async (config, input) => {
    if (!config?.blocklistApi || !input.phone) {
      return { blocked: false };
    }

    if (input.phone.startsWith('999')) {
      return { blocked: true, reason: 'Test block pattern' };
    }

    try {
      const headers = parseHeaders(config.headersJson);
      const { url, response } = await sendRequest(
        config.blocklistApi,
        input,
        headers,
        'checkBlocked',
      );
      const data = response.data ?? {};
      const nested = data.data ?? data;
      const blocked = Boolean(
        data.blocked ??
          data.isBlocked ??
          data.dnd ??
          nested.blocked ??
          nested.dnd,
      );
      const reason =
        typeof data.reason === 'string'
          ? data.reason
          : typeof nested.reason === 'string'
            ? nested.reason
            : undefined;
      await logCall({
        callType: ApiCallType.BLOCKLIST,
        input,
        requestUrl: url,
        response,
        success: true,
      });
      return { blocked, reason };
    } catch (err) {
      console.warn(`checkBlocked failed: ${err.message}`);
      await logCall({
        callType: ApiCallType.BLOCKLIST,
        input,
        requestUrl: config.blocklistApi,
        success: false,
        errorMessage: err.message,
      });
      return { blocked: false };
    }
  };

  /**
   * Persist a subscribe-URL row even when we did not HTTP (no phone, already
   * subscribed, missing template). Session Detail still shows the filled URL.
   */
  const recordSubscribeSkip = async (config, input, { reason, statusLabel }) => {
    const template = resolveSubscribeTemplate(config, input);
    const url = template ? resolveTemplate(template, buildVars(input)) : null;
    const meta = subscribeRequestMeta(input, { reason, method: null });
    const failedSkip = reason === 'no_phone' || reason === 'test_fail';
    await logCall({
      callType: ApiCallType.SUBSCRIBE,
      input,
      requestUrl: url,
      requestBody: serializeBody(meta),
      response: {
        status: null,
        data: {
          skipped: true,
          reason,
          statusLabel: statusLabel || String(reason || 'SKIPPED').toUpperCase(),
        },
      },
      success: !failedSkip,
      statusLabel: statusLabel || String(reason || 'SKIPPED').toUpperCase(),
      errorMessage:
        reason === 'no_phone'
          ? 'MSISDN missing — subscribe URL not called'
          : reason === 'test_fail'
            ? 'Test MSISDN fail pattern — subscribe URL not called'
            : null,
    });
    return {
      success: !failedSkip,
      call: {
        url,
        ok: !failedSkip,
        skipped: true,
        reason,
        body: { skipped: true, reason },
      },
    };
  };

  const subscribe = async (config, input) => {
    const phone = String(input.phone || '');
    const template = resolveSubscribeTemplate(config, input);
    const resolvedPreview = template
      ? resolveTemplate(template, buildVars(input))
      : '';

    if (phone.startsWith('999') || phone.toLowerCase().includes('fail')) {
      return recordSubscribeSkip(config, input, {
        reason: 'test_fail',
        statusLabel: 'TEST_FAIL',
      });
    }

    if (!template) {
      return recordSubscribeSkip(config, input, {
        reason: 'no_subscribe_api',
        statusLabel: 'SKIPPED_NO_URL',
      });
    }

    if (!phone) {
      return recordSubscribeSkip(config, input, {
        reason: 'no_phone',
        statusLabel: 'NO_PHONE',
      });
    }

    try {
      const headers = parseHeaders(config?.headersJson);
      const { url, response } = await sendRequest(
        template,
        input,
        headers,
        `subscribe visitId=${input.visitId} planId=${input.planId || 'n/a'}`,
      );
      const useGet = url.includes('?');
      const requestBody = serializeBody(
        subscribeRequestMeta(input, { method: useGet ? 'GET' : 'POST' }),
      );
      if (response.status < 200 || response.status >= 300) {
        await logCall({
          callType: ApiCallType.SUBSCRIBE,
          input,
          requestUrl: url,
          requestBody,
          response,
          success: false,
          errorMessage: `HTTP ${response.status}`,
          statusLabel: 'FAILED',
        });
        return {
          success: false,
          call: {
            url,
            ok: false,
            status: response.status,
            body: response.data ?? null,
          },
        };
      }
      const data = response.data ?? {};
      const code = data.responseCode ?? data.response_code;
      let success;
      if (code !== undefined && code !== null) {
        success = code === '0' || code === 0;
      } else if (typeof data.success === 'boolean') {
        success = data.success;
      } else if (data.response != null) {
        success = String(data.response).toUpperCase() === 'SUCCESS';
      } else {
        success = true;
      }
      await logCall({
        callType: ApiCallType.SUBSCRIBE,
        input,
        requestUrl: url,
        requestBody,
        response,
        success,
        statusLabel: subscribeStatusLabel(data, success),
      });
      return {
        success,
        call: {
          url,
          ok: success,
          status: response.status,
          body: data,
        },
      };
    } catch (err) {
      console.warn(`subscribe failed: ${err.message}`);
      await logCall({
        callType: ApiCallType.SUBSCRIBE,
        input,
        requestUrl: resolvedPreview || template,
        requestBody: serializeBody(
          subscribeRequestMeta(input, {
            method: (resolvedPreview || template).includes('?') ? 'GET' : 'POST',
          }),
        ),
        success: false,
        errorMessage: err.message,
        statusLabel: 'FAILED',
      });
      return {
        success: false,
        call: {
          url: resolvedPreview || template,
          ok: false,
          error: err.message,
        },
      };
    }
  };

  return {
    parseHeaders,
    resolveTemplate,
    mapSubServiceId,
    buildVars,
    partnerRequestBody,
    sendRequest,
    resolveMsisdn,
    checkSubscription,
    checkBlocked,
    subscribe,
    recordSubscribeSkip,
  };
};

export const partnerApiService = createPartnerApiService();
