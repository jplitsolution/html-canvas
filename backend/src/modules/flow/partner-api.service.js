import axios from 'axios';
import { apiCallLogService } from './api-call-log.service.js';
import { ApiCallType } from '../../database/entities/api-call-log.entity.js';
import {
  evaluateChecksubRules,
  parseChecksubConfig,
} from './helpers/checksub-rules.js';
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

  /**
   * Partner checksub result.
   * - isActive: currentStatus/subscriptionStatus === active (content access)
   * - shouldSkipSubscribe: not a brand-new user — do not send to CONFIRM/CG
   *   (active | parking | grace | pending | …). Only `new` continues funnel.
   * - go/page/url: set when campaign checksubConfigJson rules match (optional)
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

      const ruleConfig = parseChecksubConfig(config.checksubConfigJson);
      if (ruleConfig) {
        const ruled = evaluateChecksubRules(rawData, ruleConfig);
        if (ruled) {
          const statusLabel = (ruled.status || 'UNKNOWN').toUpperCase();
          await logCall({
            callType: ApiCallType.CHECKSUB,
            input,
            requestUrl: url,
            response,
            success: true,
            statusLabel,
          });
          return ruled;
        }
      }

      const data =
        typeof rawData === 'string'
          ? (() => {
              try {
                return JSON.parse(rawData);
              } catch {
                return {};
              }
            })()
          : rawData;
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
        go: null,
        page: null,
        url: null,
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

    const overrideUrl = String(input.subscribeUrl || '').trim();
    const template = overrideUrl || config?.subscribeApi || '';

    if (!template) {
      await logCall({
        callType: ApiCallType.SUBSCRIBE,
        input,
        requestUrl: null,
        requestBody: serializeBody({
          info: 'No subscribeApi configured — soft success (billing via OTP verify / Priority)',
          planId: input.planId || null,
        }),
        response: { status: null, data: { skipped: true, reason: 'no_subscribe_api' } },
        success: true,
        statusLabel: 'SKIPPED_NO_URL',
      });
      return true;
    }

    if (!input.phone) {
      return false;
    }

    try {
      const headers = parseHeaders(config?.headersJson);
      const { url, response } = await sendRequest(
        template,
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
      } else if (data.response != null) {
        success = String(data.response).toUpperCase() === 'SUCCESS';
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
        requestUrl: template,
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
    partnerRequestBody,
    sendRequest,
    resolveMsisdn,
    checkSubscription,
    checkBlocked,
    subscribe,
  };
};

export const partnerApiService = createPartnerApiService();
