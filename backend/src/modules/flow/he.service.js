import axios from 'axios';
import { randomUUID } from 'crypto';
import getConfig from '../../config/configuration.js';
import { apiCallLogService } from './api-call-log.service.js';
import { ApiCallType } from '../../database/entities/api-call-log.entity.js';

/**
 * Header Enrichment providers (config-driven — no per-campaign redeploy).
 *
 * heProvider:
 *   - header            : trust X-MSISDN / query (default)
 *   - none              : never resolve
 *   - custom_http       : GET/POST resolveMsisdnUrl (or heConfig.url)
 *   - safaricom_masked  : hybrid HE — server token + browser masked MSISDN
 *                         (evisaf CORS-safe; Safaricom needs handset IP).
 *                         Detect returns needsClientHe + accessToken; SPA
 *                         calls fetchMaskedMsisdn; POSTs MSISDN back.
 *                         Optional heSource=server keeps full Node proxy.
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
 *     X-MessageID: 1234,
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

  /**
   * TEMP: when safaricom_masked cannot resolve MSISDN, adopt HE_DUMMY_MSISDN so
   * checksub / blocklist / postback / Session Detail run like a real HE hit.
   * Unset HE_DUMMY_MSISDN to disable. Never applies while needsClientHe (browser
   * still fetching masked MSISDN).
   */
  const applySafaricomDummyFallback = (result) => {
    if (!result || result.needsClientHe) return result;
    if (normalizePhone(result.phone)) return result;
    const dummy = normalizePhone(getConfig().heDummyMsisdn || '');
    if (!dummy) return result;
    console.warn(
      `[HE] safaricom_masked MSISDN failed — using HE_DUMMY_MSISDN=${dummy} (unset env to disable)`,
    );
    return {
      ...result,
      phone: dummy,
      error: null,
      source: 'he_dummy_msisdn',
      heDummyFallback: true,
    };
  };

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
        return {
          ...base,
          ...(parsed && typeof parsed === 'object' ? parsed : {}),
        };
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
    const configured = String(
      heConfig.messageId || heConfig.xMessageId || '',
    ).trim();
    // Safaricom Kenya sample uses fixed "1234" when not overridden in heConfigJson.
    if (configured) return configured;
    return '1234';
  };

  const serializeBody = (data) => {
    if (data == null) return null;
    try {
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch {
      return String(data);
    }
  };

  /** Pass-through for session logs — keep full HE token / response for debugging. */
  const redactSecrets = (data) => data;

  const safeHeadersForLog = (headers = {}) => {
    // Log Authorization as-is so Session Detail can show the full bearer token.
    return { ...headers };
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
        msisdn: input.phone || input.hint || null,
        rcid: input.rcid,
        clickId: input.clickId,
        callType,
        requestUrl,
        requestBody: serializeBody(requestBody),
        responseStatus: response?.status ?? null,
        responseBody: serializeBody(redactSecrets(response?.data)),
        success,
        errorMessage,
        statusLabel,
      });
    } catch (err) {
      console.warn(`api_call_logs HE write failed: ${err.message}`);
    }
  };

  /**
   * Public browser config for Safaricom HE (parity with safwap SPA).
   * fetchMaskedMsisdn must run on the handset / mobile-data path — not our server IP.
   */
  const buildSafaricomClientConfig = (heConfig = {}) => {
    const tokenUrl = heConfig.tokenUrl || heConfig.heTokenUrl || '';
    const maskedUrl = heConfig.maskedUrl || heConfig.maskedMsisdnUrl || '';
    return {
      tokenUrl,
      maskedUrl,
      tokenMethod: String(heConfig.tokenMethod || 'POST').toUpperCase(),
      tokenBody: heConfig.tokenBody || {},
      xApp: heConfig.xApp || 'he-partner',
      xMessageId: makeMessageId(heConfig),
      xSourceSystem: heConfig.xSourceSystem || 'he-partner',
      failMessage:
        heConfig.failMessage || 'Please use Safaricom Mobile Data',
    };
  };

  const extractMaskedPhone = (body = {}) =>
    body?.data?.ServiceResponse?.ResponseBody?.Response?.Msisdn ||
    body?.ServiceResponse?.ResponseBody?.Response?.Msisdn ||
    body?.msisdn ||
    body?.MSISDN ||
    body?.data?.msisdn ||
    body?.MaskedMsisdn ||
    body?.maskedMsisdn ||
    '';

  /** Persist browser HE token/msisdn rounds into api_call_logs (Session Detail). */
  const recordClientSafaricomLogs = async (input = {}, heClientLogs = {}) => {
    const tokenLog = heClientLogs?.token;
    if (tokenLog && typeof tokenLog === 'object') {
      await logCall({
        callType: ApiCallType.HE_TOKEN,
        input,
        requestUrl: tokenLog.requestUrl || null,
        requestBody: tokenLog.requestBody ?? {
          method: tokenLog.method || 'POST',
          headers: safeHeadersForLog(tokenLog.headers || {}),
          body: tokenLog.body ?? {},
          source: 'browser',
        },
        response: {
          status: tokenLog.responseStatus ?? null,
          data: tokenLog.responseBody ?? null,
        },
        success: Boolean(tokenLog.success),
        errorMessage: tokenLog.errorMessage || null,
        statusLabel: tokenLog.success ? 'SUCCESS' : 'FAILED',
      });
    }

    const msisdnLog = heClientLogs?.msisdn;
    if (msisdnLog && typeof msisdnLog === 'object') {
      await logCall({
        callType: ApiCallType.HE_MSISDN,
        input,
        requestUrl: msisdnLog.requestUrl || null,
        requestBody: msisdnLog.requestBody ?? {
          method: msisdnLog.method || 'GET',
          headers: safeHeadersForLog(msisdnLog.headers || {}),
          source: 'browser',
        },
        response: {
          status: msisdnLog.responseStatus ?? null,
          data: msisdnLog.responseBody ?? null,
        },
        success: Boolean(msisdnLog.success),
        errorMessage: msisdnLog.errorMessage || null,
        statusLabel: msisdnLog.success ? 'SUCCESS' : 'FAILED',
      });
    }
  };

  /**
   * Apply MSISDN resolved in the browser (safwap parity).
   * Server-side calls to identity.safaricom.com get 403 from datacenter IPs.
   */
  const resolveSafaricomFromBrowser = async (heConfig, input = {}) => {
    const clientConfig = buildSafaricomClientConfig(heConfig);
    if (!clientConfig.tokenUrl || !clientConfig.maskedUrl) {
      return {
        phone: '',
        error: 'Safaricom HE requires tokenUrl + maskedUrl in heConfigJson',
      };
    }

    await recordClientSafaricomLogs(input, input.heClientLogs || {});

    const fromHint = normalizePhone(input.phone || input.hint || '');
    let fromLog = '';
    const msisdnBody = input.heClientLogs?.msisdn?.responseBody;
    if (msisdnBody && typeof msisdnBody === 'object') {
      fromLog = normalizePhone(extractMaskedPhone(msisdnBody));
    }
    const normalized = fromHint || fromLog;
    const failMessage =
      input.heClientError ||
      heConfig.failMessage ||
      'Please use Safaricom Mobile Data';

    if (!normalized) {
      return {
        phone: '',
        error: failMessage,
        sessionId: input.sessionId || null,
        source: 'browser',
      };
    }
    return {
      phone: normalized,
      error: null,
      sessionId: input.sessionId || null,
      source: 'browser',
    };
  };

  /**
   * Fetch HE token from Node (evisaf allows server; browser often CORS-blocks wap→evisaf).
   * Returns { token, sessionId } or { error }.
   */
  const fetchSafaricomToken = async (heConfig, input = {}) => {
    const tokenUrl = heConfig.tokenUrl || heConfig.heTokenUrl;
    if (!tokenUrl) {
      return { token: null, error: 'Safaricom HE requires tokenUrl' };
    }

    const sessionId = makeSessionId(input.sessionId || heConfig.sessionId);
    const tokenMethod = String(heConfig.tokenMethod || 'POST').toUpperCase();
    const tokenHeaders = mergeHeaders(
      {
        'X-Session-ID': sessionId,
        'Content-Type': 'application/json',
      },
      heConfig.tokenHeaders,
    );
    const tokenBody = heConfig.tokenBody || {};

    let tokenRes;
    try {
      tokenRes =
        tokenMethod === 'GET'
          ? await axios.get(tokenUrl, { timeout: 12000, headers: tokenHeaders })
          : await axios.post(tokenUrl, tokenBody, {
              timeout: 12000,
              headers: tokenHeaders,
            });
    } catch (err) {
      await logCall({
        callType: ApiCallType.HE_TOKEN,
        input,
        requestUrl: tokenUrl,
        requestBody: {
          method: tokenMethod,
          headers: safeHeadersForLog(tokenHeaders),
          body: tokenBody,
          source: 'server',
        },
        response: err.response,
        success: false,
        errorMessage: err.message,
      });
      return { token: null, sessionId, error: err.message };
    }

    const token =
      tokenRes.data?.access_token ||
      tokenRes.data?.token ||
      tokenRes.data?.data?.access_token ||
      tokenRes.data?.data?.token ||
      (typeof tokenRes.data === 'string' ? tokenRes.data : null);

    await logCall({
      callType: ApiCallType.HE_TOKEN,
      input,
      requestUrl: tokenUrl,
      requestBody: {
        method: tokenMethod,
        headers: safeHeadersForLog(tokenHeaders),
        body: tokenBody,
        source: 'server',
      },
      response: tokenRes,
      success: Boolean(token),
      errorMessage: token ? null : 'HE token missing from tokenUrl response',
    });

    if (!token) {
      return {
        token: null,
        sessionId,
        error: 'HE token missing from tokenUrl response',
      };
    }
    return { token, sessionId, error: null };
  };

  /**
   * Safaricom Kenya WAP HE.
   * Hybrid (default):
   *   1) Server fetches token (works from datacenter; avoids browser CORS on evisaf)
   *   2) Browser calls fetchMaskedMsisdn (needs Safaricom mobile-data path)
   * heSource=browser: accept client MSISDN + logs (token already logged server-side).
   * heSource=server: full proxy in Node (MSISDN usually 403 off-net).
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

    const heSource = String(input.heSource || '')
      .toLowerCase()
      .trim();

    // Client finished browser MSISDN step — accept phone + optional logs.
    if (heSource === 'browser') {
      return resolveSafaricomFromBrowser(heConfig, input);
    }

    // Default hybrid bootstrap: server token → hand accessToken to browser for MSISDN.
    if (heSource !== 'server') {
      const sessionId = makeSessionId(input.sessionId || heConfig.sessionId);
      const tokenResult = await fetchSafaricomToken(heConfig, {
        ...input,
        sessionId,
      });
      if (!tokenResult.token) {
        return {
          phone: '',
          error:
            tokenResult.error ||
            heConfig.failMessage ||
            'HE token missing from tokenUrl response',
          sessionId: tokenResult.sessionId || sessionId,
        };
      }
      return {
        phone: '',
        error: null,
        needsClientHe: true,
        clientConfig: {
          ...buildSafaricomClientConfig(heConfig),
          // Browser skips evisaf; only hits identity.safaricom.com.
          accessToken: tokenResult.token,
          skipBrowserToken: true,
        },
        sessionId: tokenResult.sessionId || sessionId,
      };
    }

    const sessionId = makeSessionId(input.sessionId || heConfig.sessionId);
    const tokenResult = await fetchSafaricomToken(heConfig, {
      ...input,
      sessionId,
    });
    if (!tokenResult.token) {
      return {
        phone: '',
        error: tokenResult.error || 'HE token missing from tokenUrl response',
        sessionId: tokenResult.sessionId || sessionId,
      };
    }
    const token = tokenResult.token;

    const maskedHeaders = mergeHeaders(
      {
        // Exact Safaricom Kenya partner headers (fetchMaskedMsisdn sample).
        Authorization: `Bearer ${token}`,
        'X-App': heConfig.xApp || 'he-partner',
        'X-MessageID': makeMessageId(heConfig),
        'X-Source-System': heConfig.xSourceSystem || 'he-partner',
      },
      heConfig.maskedHeaders,
    );

    let maskedRes;
    try {
      maskedRes = await axios.get(maskedUrl, {
        timeout: 12000,
        headers: maskedHeaders,
      });
    } catch (err) {
      await logCall({
        callType: ApiCallType.HE_MSISDN,
        input,
        requestUrl: maskedUrl,
        requestBody: {
          method: 'GET',
          headers: safeHeadersForLog(maskedHeaders),
          source: 'server',
        },
        response: err.response,
        success: false,
        errorMessage: err.message,
      });
      throw err;
    }

    const body = maskedRes.data || {};
    const phone = extractMaskedPhone(body);

    const failMessage =
      body?.header?.customerMessage ||
      heConfig.failMessage ||
      'Please use Safaricom Mobile Data';

    const normalized = normalizePhone(phone);
    await logCall({
      callType: ApiCallType.HE_MSISDN,
      input: { ...input, phone: normalized || input.phone },
      requestUrl: maskedUrl,
      requestBody: {
        method: 'GET',
        headers: safeHeadersForLog(maskedHeaders),
        source: 'server',
      },
      response: maskedRes,
      success: Boolean(normalized),
      errorMessage: normalized ? null : failMessage,
    });

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
    const requestPayload = {
      country: input.country,
      operator: input.operator,
      hint: input.hint,
    };

    try {
      const response =
        method === 'POST'
          ? await axios.post(url, requestPayload, { timeout: 10000 })
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
      const failMessage = heConfig.failMessage || 'MSISDN not found';

      await logCall({
        callType: ApiCallType.HE_RESOLVE,
        input: { ...input, phone: phone || input.phone },
        requestUrl: url,
        requestBody: {
          method,
          ...(method === 'POST'
            ? { body: requestPayload }
            : { params: requestPayload }),
        },
        response,
        success: Boolean(phone),
        errorMessage: phone ? null : failMessage,
      });

      return phone ? { phone, error: null } : { phone: '', error: failMessage };
    } catch (err) {
      await logCall({
        callType: ApiCallType.HE_RESOLVE,
        input,
        requestUrl: url,
        requestBody: {
          method,
          ...(method === 'POST'
            ? { body: requestPayload }
            : { params: requestPayload }),
        },
        response: err.response,
        success: false,
        errorMessage: err.message,
      });
      throw err;
    }
  };

  /**
   * @param {object} apiConfig
   * @param {{ phone?: string, country?: string, operator?: string, hint?: string, sessionId?: string, visitId?: number, campaignId?: number, clickId?: string, rcid?: string, heSource?: string, heClientLogs?: object, heClientError?: string }} input
   *   input.phone = already extracted from HTTP headers / query
   *   input.heSource = browser | server | (omit = bootstrap client HE for safaricom)
   */
  const resolve = async (apiConfig, input = {}) => {
    const provider = String(
      apiConfig?.heProvider ||
        (apiConfig?.resolveMsisdnUrl ? 'custom_http' : 'header'),
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
      return {
        phone: headerPhone,
        provider: 'header',
        error: null,
        ...redirects,
      };
    }

    // Prefer gateway header for non-API providers only.
    // safaricom_masked / custom_http must always hit partner APIs (token → MSISDN)
    // so Session Detail gets he_token / he_msisdn logs — even when HE_DUMMY or a
    // query msisdn is present for local testing.
    const apiHe =
      provider === 'safaricom_masked' ||
      provider === 'custom_http' ||
      provider === 'custom';

    if (headerPhone && !apiHe) {
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
        return applySafaricomDummyFallback({
          ...result,
          provider,
          ...redirects,
        });
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
      const failed = {
        phone: '',
        provider,
        error: heConfig.failMessage || err.message,
        ...redirects,
      };
      return provider === 'safaricom_masked'
        ? applySafaricomDummyFallback(failed)
        : failed;
    }
  };

  return {
    resolve,
    parseJson,
    normalizePhone,
    redirectMeta,
    pickRedirectUrl,
    makeSessionId,
    buildSafaricomClientConfig,
    extractMaskedPhone,
    recordClientSafaricomLogs,
  };
};

export const heService = createHeService();
