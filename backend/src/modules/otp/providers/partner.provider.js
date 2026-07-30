import axios from 'axios';

const parseHeaders = (headersJson) => {
  if (!headersJson) return {};
  try {
    return JSON.parse(headersJson);
  } catch {
    return {};
  }
};

const resolveTemplate = (templateStr, variables) => {
  let result = templateStr;
  for (const [key, val] of Object.entries(variables)) {
    result = result.split(`{{${key}}}`).join(val || '');
  }
  return result;
};

const mapSubServiceId = (pack) => {
  const p = (pack || 'daily').toLowerCase();
  if (p === 'weekly') return 'HWeekly';
  if (p === 'monthly') return 'HMonthly';
  return 'HDaily';
};

/** Tick defaults: responseCode === "0" means success. Overridable via config. */
export const getSuccessRule = (config) => ({
  key: String(config?.successKey || config?.success_key || 'responseCode').trim() || 'responseCode',
  value: String(
    config?.successValue ?? config?.success_value ?? '0',
  ).trim(),
});

const getFieldValue = (data, key) => {
  if (!data || !key) return null;
  if (data[key] !== undefined && data[key] !== null) return data[key];
  const snake = key
    .replace(/([A-Z])/g, '_$1')
    .replace(/__/g, '_')
    .toLowerCase()
    .replace(/^_/, '');
  if (snake !== key && data[snake] !== undefined && data[snake] !== null) {
    return data[snake];
  }
  return null;
};

const getBusinessCode = (data, config) => {
  const { key } = getSuccessRule(config);
  const raw = getFieldValue(data, key);
  if (raw === undefined || raw === null) return null;
  return String(raw);
};

/** Tick / SubOTP business codes (HTTP may still be 200). */
const PARTNER_RESPONSE_MESSAGES = {
  0: 'Success',
  1001: 'OTP expired or not found. Please request a new code.',
  1002: 'OTP mismatch. Please check the code and try again.',
  400: 'Missing or invalid request parameter.',
  500: 'Partner internal server error. Please try again.',
};

const isBusinessSuccess = (data, config) => {
  if (!data || typeof data !== 'object') return null;
  const { key, value } = getSuccessRule(config);
  const actual = getFieldValue(data, key);
  if (actual === undefined || actual === null) {
    // No configured key present — unknown
    return null;
  }
  return String(actual) === value;
};

const formatPartnerError = (data, config, fallback) => {
  const code = getBusinessCode(data, config);
  const { key, value } = getSuccessRule(config);
  const mapped = code ? PARTNER_RESPONSE_MESSAGES[code] : null;
  const apiMsg = data?.responseMessage || data?.response_message;
  if (mapped && code !== value) {
    return mapped;
  }
  if (apiMsg) return apiMsg;
  if (code != null) {
    return `Partner error: ${key}=${code} (success when ${key}=${value})`;
  }
  return fallback;
};

export const partnerProvider = {
  sendOtp: async (phone, otp, config, context) => {
    const sendUrl = config?.sendUrl || config?.send_url || config?.url;
    const method = (config?.method || 'GET').toUpperCase();
    const headers = parseHeaders(
      config?.headersJson || config?.headers_json || config?.headers,
    );
    const bodyTemplate =
      config?.bodyJson || config?.body_json || config?.body || '';
    const successRule = getSuccessRule(config);

    if (!sendUrl) {
      const errorMsg = 'Partner Send OTP URL missing (sendUrl)';
      console.error(errorMsg);
      return { success: false, error: errorMsg, successRule };
    }

    const pack = (context?.pack || 'daily').toLowerCase();
    const templateVariables = {
      phone,
      msisdn: phone,
      otp: otp || '',
      pack,
      subServiceId: mapSubServiceId(pack),
      campaign: context?.campaignName || '',
      campaignId: context?.campaignId != null ? String(context.campaignId) : '',
      visitId: context?.visitId ? String(context.visitId) : '',
    };

    const resolvedUrl = resolveTemplate(sendUrl, templateVariables);
    const resolvedBodyStr =
      typeof bodyTemplate === 'object'
        ? JSON.stringify(bodyTemplate)
        : resolveTemplate(bodyTemplate, templateVariables);

    try {
      console.log(`Partner sending OTP via ${method} ${resolvedUrl}`);
      let response;
      if (method === 'GET') {
        response = await axios.get(resolvedUrl, { headers, timeout: 10000 });
      } else {
        const bodyObj = resolvedBodyStr ? JSON.parse(resolvedBodyStr) : {};
        response = await axios({
          method,
          url: resolvedUrl,
          data: bodyObj,
          headers,
          timeout: 10000,
        });
      }

      const data = response.data;
      const codeSuccess = isBusinessSuccess(data, config);
      const businessCode = getBusinessCode(data, config);

      if (codeSuccess === false) {
        const msg = formatPartnerError(data, config, 'OTP send failed');
        console.warn(`Partner send rejected: ${msg}`);
        return {
          success: false,
          error: msg,
          responseCode: businessCode,
          successRule,
          rawResponse: data,
          httpStatus: response.status,
        };
      }

      if (codeSuccess === null) {
        // Configured success key missing from body — do not treat bare HTTP 200 as OTP success
        return {
          success: false,
          error: `Partner response missing "${successRule.key}". Expected ${successRule.key}=${successRule.value} for success.`,
          responseCode: businessCode,
          successRule,
          rawResponse: data,
          httpStatus: response.status,
        };
      }

      const providerRequestId = String(
        data?.transactionId ??
          data?.transaction_id ??
          data?.referenceId ??
          data?.reference_id ??
          data?.requestId ??
          data?.request_id ??
          data?.txnId ??
          data?.txn_id ??
          data?.otpId ??
          data?.otp_id ??
          data?.id ??
          'partner-txn-id',
      );

      return {
        success: true,
        providerRequestId,
        responseCode: businessCode,
        successRule,
        rawResponse: data,
        httpStatus: response.status,
        message:
          data?.responseMessage ||
          data?.response_message ||
          `OTP send OK (${successRule.key}=${successRule.value})`,
      };
    } catch (error) {
      const data = error.response?.data;
      const errorMsg = formatPartnerError(
        data,
        config,
        data?.message || error.message || 'OTP send failed',
      );
      console.error(`Partner send failed: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        responseCode: getBusinessCode(data, config),
        successRule,
        rawResponse: data || null,
        httpStatus: error.response?.status,
      };
    }
  },

  verifyOtp: async (phone, otp, providerRequestId, config) => {
    const verifyUrl = config?.verifyUrl || config?.verify_url;
    const method = (
      config?.verifyMethod ||
      config?.verify_method ||
      'GET'
    ).toUpperCase();
    const headers = parseHeaders(
      config?.headersJson || config?.headers_json || config?.headers,
    );
    const bodyTemplate =
      config?.verifyBodyJson ||
      config?.verify_body_json ||
      config?.verifyBody ||
      '';
    const successRule = getSuccessRule(config);

    if (!verifyUrl) {
      const errorMsg = 'Partner Verify OTP URL missing (verifyUrl)';
      console.error(errorMsg);
      return { success: false, error: errorMsg, successRule };
    }

    const templateVariables = {
      phone,
      msisdn: phone,
      otp,
      providerRequestId,
      referenceId: providerRequestId,
      transactionId: providerRequestId,
    };

    const resolvedUrl = resolveTemplate(verifyUrl, templateVariables);
    const resolvedBodyStr =
      typeof bodyTemplate === 'object'
        ? JSON.stringify(bodyTemplate)
        : resolveTemplate(bodyTemplate, templateVariables);

    try {
      if (process.env.NODE_ENV === 'production' && otp) {
        const maskedUrl = resolvedUrl.replace(otp, '[REDACTED]');
        console.log(`Partner verifying OTP via ${method} ${maskedUrl}`);
      } else {
        console.log(`Partner verifying OTP via ${method} ${resolvedUrl}`);
      }
      let response;
      if (method === 'GET') {
        response = await axios.get(resolvedUrl, { headers, timeout: 10000 });
      } else {
        const bodyObj = resolvedBodyStr ? JSON.parse(resolvedBodyStr) : {};
        response = await axios({
          method,
          url: resolvedUrl,
          data: bodyObj,
          headers,
          timeout: 10000,
        });
      }

      const data = response.data;
      const codeSuccess = isBusinessSuccess(data, config);
      const businessCode = getBusinessCode(data, config);

      if (codeSuccess === true) {
        return {
          success: true,
          responseCode: businessCode,
          successRule,
          rawResponse: data,
          httpStatus: response.status,
          message:
            data?.responseMessage ||
            data?.response_message ||
            `OTP verify OK (${successRule.key}=${successRule.value})`,
        };
      }

      if (codeSuccess === false) {
        const msg = formatPartnerError(data, config, 'OTP verification failed');
        return {
          success: false,
          error: msg,
          responseCode: businessCode,
          successRule,
          rawResponse: data,
          httpStatus: response.status,
        };
      }

      return {
        success: false,
        error: `Partner response missing "${successRule.key}". Expected ${successRule.key}=${successRule.value} for success.`,
        responseCode: businessCode,
        successRule,
        rawResponse: data,
        httpStatus: response.status,
      };
    } catch (error) {
      const data = error.response?.data;
      const errorMsg = formatPartnerError(
        data,
        config,
        data?.message || error.message || 'OTP verification failed',
      );
      console.error(`Partner verification failed with error: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        responseCode: getBusinessCode(data, config),
        successRule,
        rawResponse: data || null,
        httpStatus: error.response?.status,
      };
    }
  },
};
