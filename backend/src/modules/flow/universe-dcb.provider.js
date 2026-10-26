import { randomUUID } from 'node:crypto';
import axios from 'axios';
import { getNestedValue } from './helpers/universe-dcb-normalizer.js';

export const UNIVERSE_DCB_ENDPOINTS = Object.freeze({
  publicConfig: '/api/dcb/config/public',
  subscriptions: '/api/dcb/subscriptions',
  pincode: '/api/dcb/pincode',
  confirm: '/api/dcb/confirmation',
});

const configuredEndpoint = (config, name) => {
  let value = config.endpoints?.[name] ?? UNIVERSE_DCB_ENDPOINTS[name];
  if (name === 'confirm') {
    if (typeof value === 'string' && (value === '/api/dcb/confirm' || value === 'api/dcb/confirm')) {
      value = '/api/dcb/confirmation';
    } else if (value && typeof value === 'object' && (value.path === '/api/dcb/confirm' || value.path === 'api/dcb/confirm')) {
      value = { ...value, path: '/api/dcb/confirmation' };
    }
  }
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
  'providerRequestId',
  'data.providerRequestId',
  'providerResponse.PinInfo.ID',
  'providerResponse.PinInfo.Id',
  'data.providerResponse.PinInfo.ID',
  'data.providerResponse.PinInfo.Id',
  'PinInfo.ID',
  'PinInfo.Id',
  'data.PinInfo.ID',
  'data.PinInfo.Id',
  'data.pinInfo.ID',
  'data.pinInfo.id',
  'data.requestId',
  'data.request_id',
  'requestId',
  'request_id',
  'id',
  'ID',
  'data.id',
  'data.ID',
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

const extractProviderErrorMessage = (data) => {
  if (!data) return null;
  if (typeof data === 'string') return data.trim();
  return (
    data.MessageEn ||
    data.message ||
    data.MessageAr ||
    data.error ||
    data.ErrorCode ||
    null
  );
};

const providerError = (err, config) => {
  const providerData = err.response?.data;
  const operatorMsg = extractProviderErrorMessage(providerData);
  const message =
    operatorMsg || err.message || 'Universe DCB provider request failed';

  const wrapped = new Error(message);
  wrapped.statusCode =
    err.response?.status &&
    err.response.status >= 400 &&
    err.response.status < 500
      ? err.response.status
      : (operatorMsg ? 400 : 502);
  wrapped.code = 'DCB_PROVIDER_ERROR';
  wrapped.providerStatus = err.response?.status || null;
  wrapped.providerRequestId = requestIdFrom(providerData, config);
  wrapped.providerData = providerData;
  wrapped.operatorMessage = operatorMsg;
  wrapped.providerErrorCode = providerData?.ErrorCode || null;
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
      if (
        response.data?.success === false ||
        response.data?.Success === false
      ) {
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
    const payload = {};
    if (kind === 'subscriptions' || kind === 'pincode') {
      payload[fields.msisdnField || 'msisdn'] = input.msisdn;
      payload[fields.serviceIdField || 'serviceId'] = input.serviceId;
    }
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
      const rawId =
        input.providerRequestId ??
        input.id ??
        input.pinRequestId ??
        input.requestId;
      const parsedId =
        rawId !== undefined &&
        rawId !== null &&
        String(rawId).trim() !== '' &&
        !isNaN(Number(rawId))
          ? Number(rawId)
          : rawId;
      payload[fields.requestIdField || 'id'] = parsedId;
      payload[fields.pinField || 'pinCode'] = input.pin ?? input.pinCode;
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
    confirm: (config, input) => {
      const endpoint = configuredEndpoint(config, 'confirm');
      const rawMethod = String(
        endpoint.method ||
        config.confirmMethod ||
        config.endpoints?.confirmMethod ||
        'PUT',
      ).toUpperCase();
      const method = ['PUT', 'POST', 'GET'].includes(rawMethod) ? rawMethod : 'PUT';
      return call(config, 'confirm', input, {
        method,
        payload: requestFields(config, input, 'confirm'),
      });
    },
  };
};

export const universeDcbProvider = createUniverseDcbProvider();
