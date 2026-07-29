import axios from 'axios';

/**
 * Header Enrichment providers (config-driven — no per-campaign redeploy).
 *
 * heProvider:
 *   - header            : trust X-MSISDN / query (default)
 *   - none              : never resolve
 *   - custom_http       : GET/POST resolveMsisdnUrl (or heConfig.url)
 *   - safaricom_masked  : token URL → Bearer → masked MSISDN API (SAFWAP prod)
 *
 * heConfigJson examples:
 *   safaricom_masked: {
 *     "tokenUrl": "https://evisaf.../safcom/hetoken",
 *     "maskedUrl": "https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn",
 *     "failMessage": "Please use Safaricom Mobile Data"
 *   }
 */
export const createHeService = () => {
  const parseJson = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

  const resolveSafaricomMasked = async (heConfig) => {
    const tokenUrl = heConfig.tokenUrl || heConfig.heTokenUrl;
    const maskedUrl = heConfig.maskedUrl || heConfig.maskedMsisdnUrl;
    if (!tokenUrl || !maskedUrl) {
      return {
        phone: '',
        error: 'Safaricom HE requires tokenUrl + maskedUrl in heConfigJson',
      };
    }

    const tokenRes = await axios.get(tokenUrl, { timeout: 10000 });
    const token =
      tokenRes.data?.token ||
      tokenRes.data?.access_token ||
      tokenRes.data?.data?.token ||
      (typeof tokenRes.data === 'string' ? tokenRes.data : null);

    if (!token) {
      return { phone: '', error: 'HE token missing from tokenUrl response' };
    }

    const maskedRes = await axios.get(maskedUrl, {
      timeout: 10000,
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = maskedRes.data || {};
    const phone =
      body?.data?.ServiceResponse?.ResponseBody?.Response?.Msisdn ||
      body?.ServiceResponse?.ResponseBody?.Response?.Msisdn ||
      body?.msisdn ||
      body?.MSISDN ||
      body?.data?.msisdn ||
      '';

    const failMessage =
      body?.header?.customerMessage ||
      heConfig.failMessage ||
      'Please use operator mobile data';

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return { phone: '', error: failMessage };
    }
    return { phone: normalized, error: null };
  };

  const resolveCustomHttp = async (apiConfig, heConfig, input) => {
    const url =
      heConfig.url ||
      heConfig.resolveUrl ||
      apiConfig.resolveMsisdnUrl;
    if (!url) {
      return { phone: '', error: 'custom_http HE requires url / resolveMsisdnUrl' };
    }

    const method = String(heConfig.method || 'GET').toUpperCase();
    const response =
      method === 'POST'
        ? await axios.post(
            url,
            { country: input.country, operator: input.operator, hint: input.hint },
            { timeout: 10000 },
          )
        : await axios.get(url, {
            timeout: 10000,
            params: {
              country: input.country,
              operator: input.operator,
              msisdn: input.hint || undefined,
            },
          });

    const data = response.data ?? {};
    const nested = data.data ?? data;
    const phone = normalizePhone(
      nested.msisdn || nested.phone || data.msisdn || data.phone || '',
    );
    return phone
      ? { phone, error: null }
      : { phone: '', error: heConfig.failMessage || 'MSISDN not found' };
  };

  /**
   * @param {object} apiConfig
   * @param {{ phone?: string, country?: string, operator?: string, hint?: string }} input
   *   input.phone = already extracted from HTTP headers / query
   */
  const resolve = async (apiConfig, input = {}) => {
    const provider = String(
      apiConfig?.heProvider || (apiConfig?.resolveMsisdnUrl ? 'custom_http' : 'header'),
    )
      .toLowerCase()
      .trim();

    const heConfig = parseJson(apiConfig?.heConfigJson);
    const headerPhone = normalizePhone(input.phone || input.hint || '');

    if (provider === 'none') {
      return { phone: '', provider, error: null };
    }

    if (provider === 'header' || !provider) {
      return { phone: headerPhone, provider: 'header', error: null };
    }

    // Prefer header if already present (operator gateway injected)
    if (headerPhone) {
      return { phone: headerPhone, provider, error: null, source: 'header' };
    }

    try {
      if (provider === 'safaricom_masked') {
        const result = await resolveSafaricomMasked(heConfig);
        return { ...result, provider };
      }
      if (provider === 'custom_http' || provider === 'custom') {
        const result = await resolveCustomHttp(apiConfig, heConfig, input);
        return { ...result, provider };
      }
      return {
        phone: '',
        provider,
        error: `Unknown heProvider: ${provider}`,
      };
    } catch (err) {
      console.warn(`HE resolve failed (${provider}): ${err.message}`);
      return {
        phone: '',
        provider,
        error: heConfig.failMessage || err.message,
      };
    }
  };

  return { resolve, parseJson, normalizePhone };
};

export const heService = createHeService();
