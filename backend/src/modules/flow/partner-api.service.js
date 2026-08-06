import axios from 'axios';
import { apiCallLogService } from './api-call-log.service.js';
import { ApiCallType } from './entities/api-call-log.entity.js';

export const createPartnerApiService = () => {
  const parseHeaders = (headersJson) => {
    if (!headersJson) return {};
    try {
      return JSON.parse(headersJson);
    } catch {
      return {};
    }
  };

  const resolveTemplate = (template, vars) => {
    let result = template;
    for (const [key, val] of Object.entries(vars)) {
      result = result.split(`{{${key}}}`).join(val ?? '');
    }
    return result;
  };

  const mapSubServiceId = (pack) => {
    const p = (pack || 'daily').toLowerCase();
    if (p === 'weekly') return 'HWeekly';
    if (p === 'monthly') return 'HMonthly';
    return 'HDaily';
  };

  const buildVars = (input) => {
    const phone = input.phone ?? '';
    return {
      phone,
      msisdn: phone,
      serviceId: input.serviceId ?? '',
      country: input.country ?? '',
      operator: input.operator ?? '',
      planId: input.planId ?? '',
      pack: input.planId ?? 'daily',
      subServiceId: mapSubServiceId(input.planId),
      click_id: input.clickId ?? '',
      rcid: input.rcid ?? '',
      visit_id:
        input.visitId != null ? String(input.visitId) : '',
    };
  };

  const serializeBody = (data) => {
    if (data == null) return null;
    try {
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch {
      return String(data);
    }
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

  const sendRequest = async (rawUrl, input, headers, label) => {
    const url = resolveTemplate(rawUrl, buildVars(input));
    const useGet = url.includes('?');
    console.log(`${label} → ${useGet ? 'GET' : 'POST'} ${url}`);
    return {
      url,
      response: useGet
        ? await axios.get(url, { headers, timeout: 5000 })
        : await axios.post(url, input, { headers, timeout: 5000 }),
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

  /**
   * Partner checksub result.
   * - isActive: currentStatus/subscriptionStatus === active (content access)
   * - shouldSkipSubscribe: not a brand-new user — do not send to CONFIRM/CG
   *   (active | parking | grace | pending | …). Only `new` continues funnel.
   */
  const checkSubscription = async (config, input) => {
    const empty = {
      currentStatus: null,
      subscriptionStatus: null,
      status: 'unknown',
      isActive: false,
      shouldSkipSubscribe: false,
    };

    if (!config?.subscriptionApi || !input.phone) {
      return empty;
    }

    try {
      const headers = parseHeaders(config.headersJson);
      const { url, response } = await sendRequest(
        config.subscriptionApi,
        input,
        headers,
        'checkSubscription',
      );
      const data = response.data ?? {};
      const nested = data.data ?? data;
      const currentStatus = String(nested.currentStatus || '')
        .trim()
        .toLowerCase();
      const subscriptionStatus = String(nested.subscriptionStatus || '')
        .trim()
        .toLowerCase();

      let isActive =
        currentStatus === 'active' || subscriptionStatus === 'active';
      if (
        !isActive &&
        !currentStatus &&
        !subscriptionStatus
      ) {
        isActive = Boolean(
          nested.subscribed ??
            nested.isSubscribed ??
            nested.active ??
            data.subscribed ??
            data.isSubscribed ??
            data.active,
        );
      }

      const apiStatus = String(nested.status || data.status || '')
        .trim()
        .toLowerCase();
      const reason = String(nested.reason || data.reason || '')
        .trim()
        .toLowerCase();

      let status =
        currentStatus ||
        subscriptionStatus ||
        (isActive ? 'active' : 'unknown');

      // Partner returns serviceNotExists / empty status when MSISDN has no sub yet.
      if (
        !isActive &&
        !currentStatus &&
        !subscriptionStatus &&
        (reason === 'servicenotexists' || apiStatus === 'new')
      ) {
        status = 'new';
      }

      // Safwap parity: only brand-new MSISDNs enter subscribe/confirm.
      const shouldSkipSubscribe =
        isActive ||
        (Boolean(status) &&
          status !== 'new' &&
          status !== 'unknown');

      const statusLabel = (status || 'UNKNOWN').toUpperCase();
      await logCall({
        callType: ApiCallType.CHECKSUB,
        input,
        requestUrl: url,
        response,
        success: true,
        statusLabel,
      });
      return {
        currentStatus: currentStatus || null,
        subscriptionStatus: subscriptionStatus || null,
        status,
        isActive,
        shouldSkipSubscribe,
      };
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

  const subscribe = async (config, input) => {
    if (
      input.phone.startsWith('999') ||
      input.phone.toLowerCase().includes('fail')
    ) {
      return false;
    }

    if (!config?.subscribeApi) {
      return true;
    }

    if (!input.phone) {
      return false;
    }

    try {
      const headers = parseHeaders(config.headersJson);
      const { url, response } = await sendRequest(
        config.subscribeApi,
        input,
        headers,
        `subscribe visitId=${input.visitId} planId=${input.planId || 'n/a'}`,
      );
      if (response.status < 200 || response.status >= 300) {
        await logCall({
          callType: ApiCallType.SUBSCRIBE,
          input,
          requestUrl: url,
          response,
          success: false,
          errorMessage: `HTTP ${response.status}`,
        });
        return false;
      }
      const data = response.data ?? {};
      const code = data.responseCode ?? data.response_code;
      let success;
      if (code !== undefined && code !== null) {
        success = code === '0' || code === 0;
      } else if (typeof data.success === 'boolean') {
        success = data.success;
      } else {
        success = true;
      }
      await logCall({
        callType: ApiCallType.SUBSCRIBE,
        input,
        requestUrl: url,
        response,
        success,
      });
      return success;
    } catch (err) {
      console.warn(`subscribe failed: ${err.message}`);
      await logCall({
        callType: ApiCallType.SUBSCRIBE,
        input,
        requestUrl: config.subscribeApi,
        success: false,
        errorMessage: err.message,
      });
      return false;
    }
  };

  return {
    parseHeaders,
    resolveTemplate,
    mapSubServiceId,
    buildVars,
    sendRequest,
    resolveMsisdn,
    checkSubscription,
    checkBlocked,
    subscribe,
  };
};

export const partnerApiService = createPartnerApiService();
