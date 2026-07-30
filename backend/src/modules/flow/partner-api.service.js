import axios from 'axios';

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
    };
  };

  const sendRequest = async (rawUrl, input, headers, label) => {
    const url = resolveTemplate(rawUrl, buildVars(input));
    const useGet = url.includes('?');
    console.log(`${label} → ${useGet ? 'GET' : 'POST'} ${url}`);
    return useGet
      ? axios.get(url, { headers, timeout: 5000 })
      : axios.post(url, input, { headers, timeout: 5000 });
  };

  const resolveMsisdn = async (config, input) => {
    if (!config?.resolveMsisdnUrl) {
      return null;
    }
    try {
      const headers = parseHeaders(config.headersJson);
      const response = await sendRequest(
        config.resolveMsisdnUrl,
        { phone: input.hint, country: input.country, operator: input.operator },
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
      return resolved || null;
    } catch (err) {
      console.warn(`resolveMsisdn failed: ${err.message}`);
      return null;
    }
  };

  const checkSubscription = async (config, input) => {
    if (!config?.subscriptionApi || !input.phone) {
      return false;
    }

    try {
      const headers = parseHeaders(config.headersJson);
      const response = await sendRequest(
        config.subscriptionApi,
        input,
        headers,
        'checkSubscription',
      );
      const data = response.data ?? {};
      const nested = data.data ?? data;
      const status = nested.subscriptionStatus;
      let subscribed;
      if (typeof status === 'string') {
        subscribed = status.toLowerCase() === 'active';
      } else {
        subscribed = Boolean(
          data.subscribed ?? data.isSubscribed ?? data.active,
        );
      }
      return subscribed;
    } catch (err) {
      console.warn(`checkSubscription failed: ${err.message}`);
      return false;
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
      const response = await sendRequest(
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
      return { blocked, reason };
    } catch (err) {
      console.warn(`checkBlocked failed: ${err.message}`);
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
      const response = await sendRequest(
        config.subscribeApi,
        input,
        headers,
        `subscribe visitId=${input.visitId} planId=${input.planId || 'n/a'}`,
      );
      if (response.status < 200 || response.status >= 300) {
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
      return success;
    } catch (err) {
      console.warn(`subscribe failed: ${err.message}`);
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
