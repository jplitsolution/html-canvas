import axios from 'axios';
import { normalizeOrangeBfResponse } from './helpers/orange-bf-normalizer.js';

export const ORANGE_BF_DEFAULTS = Object.freeze({
  baseUrl: 'http://103.153.58.55',
  serviceId: 'Health Portal Livliness',
  subServiceId: 'Health Portal Livliness pass jour',
  cpId: '100',
  channel: 'ussd',
  country: 'BF',
  operator: 'ORG',
  language: '_E',
  timeoutMs: 10000,
});

export const parseHeaders = (headersRaw) => {
  if (!headersRaw) return {};
  if (typeof headersRaw === 'object') return headersRaw;
  try {
    return JSON.parse(headersRaw);
  } catch {
    return {};
  }
};

export const tryParseJson = (val) => {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
};

export const resolveTemplate = (templateStr, variables = {}) => {
  if (!templateStr || typeof templateStr !== 'string') return templateStr;
  let result = templateStr;
  for (const [key, val] of Object.entries(variables)) {
    if (val !== undefined && val !== null) {
      result = result.split(`{{${key}}}`).join(String(val));
    }
  }
  return result;
};

export const createOrangeBfProvider = ({ httpClient = axios } = {}) => {
  const request = async ({
    method = 'GET',
    url,
    params = {},
    data = null,
    headers = {},
    timeout = 10000,
    config = {},
  }) => {
    const startedAt = Date.now();
    const upperMethod = String(method || 'GET').toUpperCase();
    const resolvedHeaders = parseHeaders(headers);

    const reqOptions = {
      method: upperMethod,
      url,
      timeout,
    };

    if (resolvedHeaders && Object.keys(resolvedHeaders).length > 0) {
      reqOptions.headers = resolvedHeaders;
    }

    if (upperMethod === 'GET' || upperMethod === 'DELETE') {
      if (params && Object.keys(params).length > 0) {
        reqOptions.params = params;
      }
    } else {
      if (data !== undefined && data !== null) {
        reqOptions.data = typeof data === 'string' ? tryParseJson(data) : data;
      }
      if (params && Object.keys(params).length > 0) {
        reqOptions.params = params;
      }
    }

    try {
      const response = await httpClient(reqOptions);
      const latencyMs = Date.now() - startedAt;
      const normalized = normalizeOrangeBfResponse(response.data, config);
      return {
        ...normalized,
        httpStatus: response.status,
        rawResponse: response.data,
        latencyMs,
        requestUrl: url,
        requestParams: reqOptions.params || null,
        requestBody: reqOptions.data || null,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const rawData = error.response?.data;
      const normalized = normalizeOrangeBfResponse(rawData, config);
      return {
        ...normalized,
        success: false,
        httpStatus: error.response?.status || 500,
        error: error.message || 'Network error',
        rawResponse: rawData || null,
        latencyMs,
        requestUrl: url,
        requestParams: reqOptions.params || null,
        requestBody: reqOptions.data || null,
      };
    }
  };

  return {
    generateAuthOtp: async ({
      msisdn,
      language = '_E',
      serviceId,
      subServiceId,
      cpId,
      channel,
      country,
      operator,
      context = {},
      config = {},
    }) => {
      const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
      const timeout = Number(config.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs;
      const method = String(config.sendMethod || config.method || 'GET').toUpperCase();

      const templateVars = {
        msisdn,
        phone: msisdn,
        language: language || config.language || ORANGE_BF_DEFAULTS.language,
        serviceId: serviceId || config.serviceId || ORANGE_BF_DEFAULTS.serviceId,
        subServiceId: subServiceId || config.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
        cpId: cpId || config.cpId || ORANGE_BF_DEFAULTS.cpId,
        channel: channel || config.channel || ORANGE_BF_DEFAULTS.channel,
        country: country || config.country || ORANGE_BF_DEFAULTS.country,
        operator: operator || config.operator || ORANGE_BF_DEFAULTS.operator,
        campaignId: context.campaignId || '',
        visitId: context.visitId || '',
        ...context,
      };

      const customSendUrl = config.sendUrl || null;
      let url;
      let params = {};
      let data = null;

      if (customSendUrl) {
        url = resolveTemplate(customSendUrl, templateVars);
      } else {
        url = `${baseUrl.replace(/\/$/, '')}/subapi/auth/otp/generate`;
        if (method === 'GET') {
          params = { msisdn, language: templateVars.language };
        }
      }

      if (method !== 'GET') {
        const bodyTemplate = config.sendBodyJson || config.bodyJson || config.body || null;
        if (bodyTemplate) {
          const bodyStr = typeof bodyTemplate === 'object' ? JSON.stringify(bodyTemplate) : String(bodyTemplate);
          const resolvedBody = resolveTemplate(bodyStr, templateVars);
          data = tryParseJson(resolvedBody);
        } else if (!customSendUrl) {
          data = { msisdn, language: templateVars.language };
        }
      }

      const headers = config.sendHeadersJson || config.headersJson || config.headers || {};

      return request({
        method,
        url,
        params,
        data,
        headers,
        timeout,
        config,
      });
    },

    validateAuthOtp: async ({
      msisdn,
      otp,
      transactionId = '',
      requestId = '',
      referenceId = '',
      token = '',
      sessionId = '',
      context = {},
      config = {},
    }) => {
      const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
      const timeout = Number(config.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs;
      const method = String(config.verifyMethod || 'GET').toUpperCase();

      const templateVars = {
        msisdn,
        phone: msisdn,
        otp: String(otp || '').trim(),
        transactionId: transactionId || requestId || referenceId || '',
        transaction_id: transactionId || requestId || referenceId || '',
        requestId: requestId || transactionId || '',
        request_id: requestId || transactionId || '',
        referenceId: referenceId || transactionId || '',
        reference_id: referenceId || transactionId || '',
        token: token || '',
        sessionId: sessionId || '',
        session_id: sessionId || '',
        serviceId: config.serviceId || ORANGE_BF_DEFAULTS.serviceId,
        subServiceId: config.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
        cpId: config.cpId || ORANGE_BF_DEFAULTS.cpId,
        channel: config.channel || ORANGE_BF_DEFAULTS.channel,
        country: config.country || ORANGE_BF_DEFAULTS.country,
        operator: config.operator || ORANGE_BF_DEFAULTS.operator,
        campaignId: context.campaignId || '',
        visitId: context.visitId || '',
        ...context,
      };

      const customVerifyUrl = config.verifyUrl || null;
      let url;
      let params = {};
      let data = null;

      if (customVerifyUrl) {
        url = resolveTemplate(customVerifyUrl, templateVars);
      } else {
        url = `${baseUrl.replace(/\/$/, '')}/subapi/auth/otp/validate`;
        if (method === 'GET') {
          params = { msisdn, otp: templateVars.otp };
        }
      }

      if (method !== 'GET') {
        const bodyTemplate = config.verifyBodyJson || config.verifyBody || null;
        if (bodyTemplate) {
          const bodyStr = typeof bodyTemplate === 'object' ? JSON.stringify(bodyTemplate) : String(bodyTemplate);
          const resolvedBody = resolveTemplate(bodyStr, templateVars);
          data = tryParseJson(resolvedBody);
        } else if (!customVerifyUrl) {
          data = {
            msisdn,
            otp: templateVars.otp,
            transactionId: templateVars.transactionId || undefined,
          };
        }
      }

      const headers = config.verifyHeadersJson || config.headersJson || config.headers || {};

      return request({
        method,
        url,
        params,
        data,
        headers,
        timeout,
        config,
      });
    },

    checkSubscription: async ({
      msisdn,
      serviceId,
      subServiceId,
      cpId,
      channel,
      country,
      operator,
      context = {},
      config = {},
    }) => {
      const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
      const timeout = Number(config.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs;
      const svcId = serviceId || config.serviceId || ORANGE_BF_DEFAULTS.serviceId;
      const method = String(config.checksubMethod || 'GET').toUpperCase();

      const templateVars = {
        msisdn,
        phone: msisdn,
        serviceId: svcId,
        subServiceId: subServiceId || config.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
        cpId: cpId || config.cpId || ORANGE_BF_DEFAULTS.cpId,
        channel: channel || config.channel || ORANGE_BF_DEFAULTS.channel,
        country: country || config.country || ORANGE_BF_DEFAULTS.country,
        operator: operator || config.operator || ORANGE_BF_DEFAULTS.operator,
        campaignId: context.campaignId || '',
        visitId: context.visitId || '',
        ...context,
      };

      const customChecksubUrl = config.checksubUrl || config.subscriptionApi || null;
      let url;
      let params = {};
      let data = null;

      if (customChecksubUrl) {
        url = resolveTemplate(customChecksubUrl, templateVars);
      } else {
        url = `${baseUrl.replace(/\/$/, '')}/subapi/checksub`;
        if (method === 'GET') {
          params = { msisdn, serviceId: svcId };
        }
      }

      if (method !== 'GET') {
        const bodyTemplate = config.checksubBodyJson || null;
        if (bodyTemplate) {
          const bodyStr = typeof bodyTemplate === 'object' ? JSON.stringify(bodyTemplate) : String(bodyTemplate);
          const resolvedBody = resolveTemplate(bodyStr, templateVars);
          data = tryParseJson(resolvedBody);
        } else if (!customChecksubUrl) {
          data = { msisdn, serviceId: svcId };
        }
      }

      const headers = config.checksubHeadersJson || config.headersJson || config.headers || {};

      return request({
        method,
        url,
        params,
        data,
        headers,
        timeout,
        config,
      });
    },

    unsubscribe: async ({ msisdn, serviceId, context = {}, config = {} }) => {
      const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
      const timeout = Number(config.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs;
      const svcId = serviceId || config.serviceId || ORANGE_BF_DEFAULTS.serviceId;
      const method = String(config.unsubMethod || 'GET').toUpperCase();

      const templateVars = {
        msisdn,
        phone: msisdn,
        serviceId: svcId,
        campaignId: context.campaignId || '',
        visitId: context.visitId || '',
        ...context,
      };

      const customUnsubUrl = config.unsubUrl || null;
      let url;
      let params = {};
      let data = null;

      if (customUnsubUrl) {
        url = resolveTemplate(customUnsubUrl, templateVars);
      } else {
        url = `${baseUrl.replace(/\/$/, '')}/subapi/unsub`;
        if (method === 'GET') {
          params = { msisdn, serviceId: svcId };
        }
      }

      if (method !== 'GET') {
        const bodyTemplate = config.unsubBodyJson || null;
        if (bodyTemplate) {
          const bodyStr = typeof bodyTemplate === 'object' ? JSON.stringify(bodyTemplate) : String(bodyTemplate);
          const resolvedBody = resolveTemplate(bodyStr, templateVars);
          data = tryParseJson(resolvedBody);
        } else if (!customUnsubUrl) {
          data = { msisdn, serviceId: svcId };
        }
      }

      const headers = config.unsubHeadersJson || config.headersJson || config.headers || {};

      return request({
        method,
        url,
        params,
        data,
        headers,
        timeout,
        config,
      });
    },

    syncSubscription: async ({
      msisdn,
      subServiceId,
      serviceId,
      cpId,
      channel,
      country,
      operator,
      reqType = 1,
      context = {},
      config = {},
    }) => {
      const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
      const timeout = Number(config.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs;
      const method = String(config.syncMethod || 'GET').toUpperCase();

      const templateVars = {
        msisdn,
        phone: msisdn,
        subServiceId: subServiceId || config.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
        serviceId: serviceId || config.serviceId || ORANGE_BF_DEFAULTS.serviceId,
        cpId: cpId || config.cpId || ORANGE_BF_DEFAULTS.cpId,
        channel: channel || config.channel || ORANGE_BF_DEFAULTS.channel,
        country: country || config.country || ORANGE_BF_DEFAULTS.country,
        operator: operator || config.operator || ORANGE_BF_DEFAULTS.operator,
        reqType: reqType || 1,
        campaignId: context.campaignId || '',
        visitId: context.visitId || '',
        ...context,
      };

      const customSyncUrl = config.syncUrl || null;
      let url;
      let params = {};
      let data = null;

      if (customSyncUrl) {
        url = resolveTemplate(customSyncUrl, templateVars);
      } else {
        url = `${baseUrl.replace(/\/$/, '')}/Subs_Engine/subscription/sync`;
        if (method === 'GET') {
          params = {
            msisdn,
            subServiceId: templateVars.subServiceId,
            serviceId: templateVars.serviceId,
            cpId: templateVars.cpId,
            channel: templateVars.channel,
            country: templateVars.country,
            operator: templateVars.operator,
            reqType: templateVars.reqType,
          };
        }
      }

      if (method !== 'GET') {
        const bodyTemplate = config.syncBodyJson || null;
        if (bodyTemplate) {
          const bodyStr = typeof bodyTemplate === 'object' ? JSON.stringify(bodyTemplate) : String(bodyTemplate);
          const resolvedBody = resolveTemplate(bodyStr, templateVars);
          data = tryParseJson(resolvedBody);
        } else if (!customSyncUrl) {
          data = {
            msisdn,
            subServiceId: templateVars.subServiceId,
            serviceId: templateVars.serviceId,
            cpId: templateVars.cpId,
            channel: templateVars.channel,
            country: templateVars.country,
            operator: templateVars.operator,
            reqType: templateVars.reqType,
          };
        }
      }

      const headers = config.syncHeadersJson || config.headersJson || config.headers || {};

      return request({
        method,
        url,
        params,
        data,
        headers,
        timeout,
        config,
      });
    },
  };
};

export const orangeBfProvider = createOrangeBfProvider();
