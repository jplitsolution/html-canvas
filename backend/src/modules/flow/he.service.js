import axios from 'axios';
import { randomUUID } from 'crypto';

/**
 * Header Enrichment providers (config-driven — no per-campaign redeploy).
 *
 * heProvider:
 *   - header            : trust X-MSISDN / query (default)
 *   - none              : never resolve
 *   - custom_http       : GET/POST resolveMsisdnUrl (or heConfig.url)
 *   - safaricom_masked  : POST token → Bearer GET masked MSISDN (Safaricom Kenya WAP)
 *
 * heConfigJson (Safaricom Kenya):
 *   {
 *     "tokenUrl": "https://evisaf.wellnesss360.com/safcom/hetoken",
 *     "maskedUrl": "https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn",
 *     "failMessage": "Please use Safaricom Mobile Data",
 *     "failRedirectUrl": "https://dsdp-cg.safaricom.com/300002437"
 *   }
 *
 * Token call (partner contract):
 *   POST tokenUrl, headers: { X-Session-ID }, body: {}
 *   → access_token
 *
 * MSISDN call:
 *   GET maskedUrl, headers: {
 *     Authorization: Bearer <token>,
 *     X-App: he-partner,
 *     X-MessageID: <id>,
 *     X-Source-System: he-partner
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

  const pickRedirectUrl = (heConfig, ...keys) => {
    for (const key of keys) {
      const value = String(heConfig?.[key] || '').trim();
      if (value && /^https?:\/\//i.test(value)) return value;
    }
    return '';
  };

  const redirectMeta = (heConfig = {}) => ({
    failRedirectUrl: pickRedirectUrl(
      heConfig,
      'failRedirectUrl',
      'heFailRedirectUrl',
    ),
    successRedirectUrl: pickRedirectUrl(
      heConfig,
      'successRedirectUrl',
      'heSuccessRedirectUrl',
    ),
  });

  const makeSessionId = (hint) => {
    const fromHint = String(hint || '').trim();
    if (fromHint) return fromHint;
    return `sid_${Date.now()}_${randomUUID().slice(0, 8)}`;
  };

  const mergeHeaders = (base, extra) => {
    if (!extra) return { ...base };
    if (typeof extra === 'string') {
      try {
        const parsed = JSON.parse(extra);
        return { ...base, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
      } catch {
        return { ...base };
      }
    }
    if (typeof extra === 'object' && !Array.isArray(extra)) {
      return { ...base, ...extra };
    }
    return { ...base };
  };

  const makeMessageId = (heConfig) => {
    const configured = String(heConfig.messageId || heConfig.xMessageId || '').trim();
    if (configured) return configured;
    return String(Date.now() % 1000000000);
  };

  /**
   * Safaricom Kenya WAP: POST hetoken → GET fetchMaskedMsisdn with partner headers.
   * @param {object} heConfig
   * @param {{ sessionId?: string }} [input]
   */
  const resolveSafaricomMasked = async (heConfig, input = {}) => {
    const tokenUrl = heConfig.tokenUrl || heConfig.heTokenUrl;
    const maskedUrl = heConfig.maskedUrl || heConfig.maskedMsisdnUrl;
    if (!tokenUrl || !maskedUrl) {
      return {
        phone: '',
        error: 'Safaricom HE requires tokenUrl + maskedUrl in heConfigJson',
      };
    }

    const sessionId = makeSessionId(input.sessionId || heConfig.sessionId);
    const tokenMethod = String(heConfig.tokenMethod || 'POST').toUpperCase();
    const tokenHeaders = mergeHeaders(
      { 'X-Session-ID': sessionId },
      heConfig.tokenHeaders,
    );

    const tokenRes =
      tokenMethod === 'GET'
        ? await axios.get(tokenUrl, { timeout: 12000, headers: tokenHeaders })
        : await axios.post(tokenUrl, heConfig.tokenBody || {}, {
            timeout: 12000,
            headers: tokenHeaders,
          });

    const token =
      tokenRes.data?.access_token ||
      tokenRes.data?.token ||
      tokenRes.data?.data?.access_token ||
      tokenRes.data?.data?.token ||
      (typeof tokenRes.data === 'string' ? tokenRes.data : null);

    if (!token) {
      return { phone: '', error: 'HE token missing from tokenUrl response' };
    }

    const maskedHeaders = mergeHeaders(
      {
        Authorization: `Bearer ${token}`,
        'X-App': heConfig.xApp || 'he-partner',
        'X-MessageID': makeMessageId(heConfig),
        'X-Source-System': heConfig.xSourceSystem || 'he-partner',
      },
      heConfig.maskedHeaders,
    );

    const maskedRes = await axios.get(maskedUrl, {
      timeout: 12000,
      headers: maskedHeaders,
    });

    const body = maskedRes.data || {};
    const phone =
      body?.data?.ServiceResponse?.ResponseBody?.Response?.Msisdn ||
      body?.ServiceResponse?.ResponseBody?.Response?.Msisdn ||
      body?.msisdn ||
      body?.MSISDN ||
      body?.data?.msisdn ||
      body?.MaskedMsisdn ||
      body?.maskedMsisdn ||
      '';

    const failMessage =
      body?.header?.customerMessage ||
      heConfig.failMessage ||
      'Please use Safaricom Mobile Data';

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return { phone: '', error: failMessage, sessionId };
    }
    return { phone: normalized, error: null, sessionId };
  };

  const resolveCustomHttp = async (apiConfig, heConfig, input) => {
    const url =
      heConfig.url || heConfig.resolveUrl || apiConfig.resolveMsisdnUrl;
    if (!url) {
      return {
        phone: '',
        error: 'custom_http HE requires url / resolveMsisdnUrl',
      };
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
   * @param {{ phone?: string, country?: string, operator?: string, hint?: string, sessionId?: string }} input
   *   input.phone = already extracted from HTTP headers / query
   */
  const resolve = async (apiConfig, input = {}) => {
    const provider = String(
      apiConfig?.heProvider || (apiConfig?.resolveMsisdnUrl ? 'custom_http' : 'header'),
    )
      .toLowerCase()
      .trim();

    const heConfig = parseJson(apiConfig?.heConfigJson);
    const redirects = redirectMeta(heConfig);
    const headerPhone = normalizePhone(input.phone || input.hint || '');

    if (provider === 'none') {
      return { phone: '', provider, error: null, ...redirects };
    }

    if (provider === 'header' || !provider) {
      return { phone: headerPhone, provider: 'header', error: null, ...redirects };
    }

    // Prefer header if already present (operator gateway injected)
    if (headerPhone) {
      return {
        phone: headerPhone,
        provider,
        error: null,
        source: 'header',
        ...redirects,
      };
    }

    try {
      if (provider === 'safaricom_masked') {
        const result = await resolveSafaricomMasked(heConfig, input);
        return { ...result, provider, ...redirects };
      }
      if (provider === 'custom_http' || provider === 'custom') {
        const result = await resolveCustomHttp(apiConfig, heConfig, input);
        return { ...result, provider, ...redirects };
      }
      return {
        phone: '',
        provider,
        error: `Unknown heProvider: ${provider}`,
        ...redirects,
      };
    } catch (err) {
      console.warn(`HE resolve failed (${provider}): ${err.message}`);
      return {
        phone: '',
        provider,
        error: heConfig.failMessage || err.message,
        ...redirects,
      };
    }
  };

  return {
    resolve,
    parseJson,
    normalizePhone,
    redirectMeta,
    pickRedirectUrl,
    makeSessionId,
  };
};

export const heService = createHeService();
