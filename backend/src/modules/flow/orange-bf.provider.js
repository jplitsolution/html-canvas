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

export const createOrangeBfProvider = ({ httpClient = axios } = {}) => {
  const request = async ({ method = 'GET', url, params = {}, timeout = 10000, config = {} }) => {
    const startedAt = Date.now();
    try {
      const response = await httpClient({
        method,
        url,
        params,
        timeout,
      });
      const latencyMs = Date.now() - startedAt;
      const normalized = normalizeOrangeBfResponse(response.data, config);
      return {
        ...normalized,
        httpStatus: response.status,
        rawResponse: response.data,
        latencyMs,
        requestUrl: url,
        requestParams: params,
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
        requestParams: params,
      };
    }
  };

  return {
    generateAuthOtp: async ({ msisdn, language = '_E', config = {} }) => {
      const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
      const url = `${baseUrl.replace(/\/$/, '')}/subapi/auth/otp/generate`;
      return request({
        method: 'GET',
        url,
        params: { msisdn, language: language || config.language || '_E' },
        timeout: config.timeoutMs || ORANGE_BF_DEFAULTS.timeoutMs,
      });
    },

    validateAuthOtp: async ({ msisdn, otp, config = {} }) => {
      const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
      const url = `${baseUrl.replace(/\/$/, '')}/subapi/auth/otp/validate`;
      return request({
        method: 'GET',
        url,
        params: { msisdn, otp },
        timeout: config.timeoutMs || ORANGE_BF_DEFAULTS.timeoutMs,
      });
    },

    checkSubscription: async ({ msisdn, serviceId, config = {} }) => {
      const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
      const svcId = serviceId || config.serviceId || ORANGE_BF_DEFAULTS.serviceId;
      const url = `${baseUrl.replace(/\/$/, '')}/subapi/checksub`;
      return request({
        method: 'GET',
        url,
        params: { msisdn, serviceId: svcId },
        timeout: config.timeoutMs || ORANGE_BF_DEFAULTS.timeoutMs,
      });
    },

    unsubscribe: async ({ msisdn, serviceId, config = {} }) => {
      const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
      const svcId = serviceId || config.serviceId || ORANGE_BF_DEFAULTS.serviceId;
      const url = `${baseUrl.replace(/\/$/, '')}/subapi/unsub`;
      return request({
        method: 'GET',
        url,
        params: { msisdn, serviceId: svcId },
        timeout: config.timeoutMs || ORANGE_BF_DEFAULTS.timeoutMs,
      });
    },

    syncSubscription: async ({ msisdn, subServiceId, serviceId, cpId, channel, country, operator, reqType = 1, config = {} }) => {
      const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
      const url = `${baseUrl.replace(/\/$/, '')}/Subs_Engine/subscription/sync`;
      return request({
        method: 'GET',
        url,
        params: {
          msisdn,
          subServiceId: subServiceId || config.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
          serviceId: serviceId || config.serviceId || ORANGE_BF_DEFAULTS.serviceId,
          cpId: cpId || config.cpId || ORANGE_BF_DEFAULTS.cpId,
          channel: channel || config.channel || ORANGE_BF_DEFAULTS.channel,
          country: country || config.country || ORANGE_BF_DEFAULTS.country,
          operator: operator || config.operator || ORANGE_BF_DEFAULTS.operator,
          reqType: reqType || 1,
        },
        timeout: config.timeoutMs || ORANGE_BF_DEFAULTS.timeoutMs,
      });
    },
  };
};

export const orangeBfProvider = createOrangeBfProvider();
