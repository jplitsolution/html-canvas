import { randomUUID } from 'node:crypto';
import axios from 'axios';
import { getNestedValue } from './helpers/universe-dcb-normalizer.js';

export const UNIVERSE_DCB_ENDPOINTS = Object.freeze({
  publicConfig: '/api/dcb/config/public',
  subscriptions: '/api/dcb/subscriptions',
  pincode: '/api/dcb/pincode',
  confirm: '/api/dcb/confirm',
});

const configuredEndpoint = (config, name) => {
  const value = config.endpoints?.[name] ?? UNIVERSE_DCB_ENDPOINTS[name];
  if (typeof value === 'string') return { path: value };
  return value && typeof value === 'object' ? value : {};
};

const endpointUrl = (baseUrl, endpoint) => {
  const base = String(baseUrl || '').trim();
  const path = String(endpoint || '').trim();
  if (!/^https?:\/\//i.test(base)) {
    const err = new Error('Universe DCB baseUrl is not configured');
    err.statusCode = 503;
    err.code = 'DCB_NOT_CONFIGURED';
    throw err;
  }
  return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
};

const REQUEST_ID_FALLBACK_PATHS = [
  'data.PinInfo.ID',
  'data.PinInfo.Id',
  'data.pinInfo.ID',
  'data.pinInfo.id',
  'data.requestId',
  'data.request_id',
  'requestId',
  'request_id',
];

const requestIdFrom = (data, config) => {
  const configured =
    config.responsePaths?.requestId ||
    config.response?.requestIdPath ||
    config.normalizer?.requestIdPath;
  const paths = [
    ...(configured ? [configured] : []),
    ...REQUEST_ID_FALLBACK_PATHS,
  ];
  const seen = new Set();
  for (const path of paths) {
    if (seen.has(path)) continue;
    seen.add(path);
    const value = getNestedValue(data, path);
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return null;
};

const providerError = (err, config) => {
  const wrapped = new Error('Universe DCB provider request failed');
  wrapped.statusCode = 502;
  wrapped.code = 'DCB_PROVIDER_ERROR';
  wrapped.providerStatus = err.response?.status || null;
  wrapped.providerRequestId = requestIdFrom(err.response?.data, config);
  wrapped.providerData = err.response?.data;
  return wrapped;
};

export const createUniverseDcbProvider = (http = axios) => {
  const call = async (config, endpointName, _context = {}, extra = {}) => {
    const endpoint = configuredEndpoint(config, endpointName);
    const serverRequestId = randomUUID();
    const method = String(
      endpoint.method || extra.method || 'GET',
    ).toUpperCase();
    const timeout = Math.max(1000, Number(config.timeoutMs) || 10000);
    const requestConfig = {
      method,
      url: endpointUrl(config.baseUrl, endpoint.path),
      timeout,
      headers: {
        ...(config.headers || {}),
        ...(endpoint.headers || {}),
        [config.requestIdHeader || 'X-Request-ID']: serverRequestId,
      },
    };
    if (method === 'GET') requestConfig.params = extra.payload;
    else requestConfig.data = extra.payload;
    const startedAt = Date.now();
    const baseLogMeta = {
      endpointName,
      method,
      url: requestConfig.url,
      payload: extra.payload || {},
      serverRequestId,
    };

    try {
      const response = await http.request(requestConfig);
      if (response.data?.success === false) {
        const err = new Error('Universe DCB returned an unsuccessful response');
        err.response = { status: response.status, data: response.data };
        throw err;
      }
      return {
        data: response.data,
        status: response.status,
        providerRequestId: requestIdFrom(response.data, config),
        logMeta: {
          ...baseLogMeta,
          latencyMs: Date.now() - startedAt,
        },
      };
    } catch (err) {
      const wrapped = providerError(err, config);
      wrapped.logMeta = {
        ...baseLogMeta,
        latencyMs: Date.now() - startedAt,
      };
      console.warn(
        `Universe DCB ${endpointName} failed: status=${wrapped.providerStatus || 'unknown'} requestId=${wrapped.providerRequestId || 'missing'}`,
      );
      throw wrapped;
    }
  };

  const requestFields = (config, input, kind = 'subscriptions') => {
    const fields = config.request || {};
    const payload = {
      [fields.msisdnField || 'msisdn']: input.msisdn,
      [fields.serviceIdField || 'serviceId']: input.serviceId,
    };
    if (kind === 'pincode') {
      payload[fields.merchantIdField || 'merchantId'] = config.merchantId;
      payload[fields.operatorField || 'operator'] = config.operatorCode;
      payload[fields.purchaseTypeIdField || 'purchaseTypeId'] =
        input.purchaseTypeId;
      payload[fields.transactionChannelField || 'transactionChannel'] =
        input.transactionChannel;
      payload[fields.subscriptionField || 'subscription'] =
        input.subscription || '';
    }
    if (kind === 'confirm') {
      payload[fields.requestIdField || 'requestId'] = input.providerRequestId;
      payload[fields.pinField || 'pinCode'] = input.pin;
      payload[fields.purchaseTypeIdField || 'purchaseTypeId'] =
        input.purchaseTypeId;
    }
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) =>
          value !== undefined &&
          value !== null &&
          (value !== '' ||
            key === (fields.subscriptionField || 'subscription')),
      ),
    );
  };

  return {
    getPublicConfig: (config, input) =>
      call(config, 'publicConfig', input, {
        method: 'GET',
        payload: {},
      }),
    getSubscriptions: (config, input) =>
      call(config, 'subscriptions', input, {
        method: 'GET',
        payload: {
          ...requestFields(config, input),
          [config.request?.currentField || 'current']: true,
        },
      }),
    requestPincode: (config, input) =>
      call(config, 'pincode', input, {
        method: 'POST',
        payload: requestFields(config, input, 'pincode'),
      }),
    confirm: (config, input) =>
      call(config, 'confirm', input, {
        method: 'POST',
        payload: requestFields(config, input, 'confirm'),
      }),
  };
};

export const universeDcbProvider = createUniverseDcbProvider();
