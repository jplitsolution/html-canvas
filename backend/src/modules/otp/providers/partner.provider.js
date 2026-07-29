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

const isResponseCodeSuccess = (data) => {
  const code = data?.responseCode ?? data?.response_code ?? data?.resultCode;
  if (code === undefined || code === null) return null;
  return String(code) === '0';
};

export const partnerProvider = {
  sendOtp: async (phone, otp, config, context) => {
    const sendUrl = config?.sendUrl || config?.send_url;
    const method = (config?.method || 'POST').toUpperCase();
    const headers = parseHeaders(
      config?.headersJson || config?.headers_json || config?.headers,
    );
    const bodyTemplate =
      config?.bodyJson || config?.body_json || config?.body || '';

    if (!sendUrl) {
      const errorMsg = 'Partner Send OTP URL missing (sendUrl)';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const pack = (context.pack || 'daily').toLowerCase();
    const templateVariables = {
      phone,
      msisdn: phone,
      pack,
      subServiceId: mapSubServiceId(pack),
      campaign: context.campaignName,
      campaignId: String(context.campaignId),
      visitId: context.visitId ? String(context.visitId) : '',
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
        response = await axios.get(resolvedUrl, { headers, timeout: 6000 });
      } else {
        const bodyObj = resolvedBodyStr ? JSON.parse(resolvedBodyStr) : {};
        response = await axios.post(resolvedUrl, bodyObj, {
          headers,
          timeout: 6000,
        });
      }

      const data = response.data;

      const codeSuccess = isResponseCodeSuccess(data);
      if (codeSuccess === false) {
        const msg =
          data?.responseMessage ||
          data?.response_message ||
          `responseCode=${data?.responseCode ?? data?.response_code}`;
        console.warn(`Partner send rejected: ${msg}`);
        return { success: false, error: `Partner API Error: ${msg}` };
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
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`Partner send failed: ${errorMsg}`);
      return { success: false, error: `Partner API Error: ${errorMsg}` };
    }
  },

  verifyOtp: async (phone, otp, providerRequestId, config) => {
    const verifyUrl = config?.verifyUrl || config?.verify_url;
    const method = (
      config?.verifyMethod ||
      config?.verify_method ||
      'POST'
    ).toUpperCase();
    const headers = parseHeaders(
      config?.headersJson || config?.headers_json || config?.headers,
    );
    const bodyTemplate =
      config?.verifyBodyJson ||
      config?.verify_body_json ||
      config?.verifyBody ||
      '';

    if (!verifyUrl) {
      const errorMsg = 'Partner Verify OTP URL missing (verifyUrl)';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
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
        response = await axios.get(resolvedUrl, { headers, timeout: 6000 });
      } else {
        const bodyObj = resolvedBodyStr ? JSON.parse(resolvedBodyStr) : {};
        response = await axios.post(resolvedUrl, bodyObj, {
          headers,
          timeout: 6000,
        });
      }

      const data = response.data;
      const codeSuccess = isResponseCodeSuccess(data);
      const isSuccess =
        codeSuccess !== null
          ? codeSuccess
          : data?.success === true ||
            data?.valid === true ||
            data?.status === 'success' ||
            data?.status === 'OK' ||
            response.status === 200;

      if (isSuccess) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `Partner verification failed: ${JSON.stringify(data)}`,
        };
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`Partner verification failed with error: ${errorMsg}`);
      return { success: false, error: `Partner Verify Error: ${errorMsg}` };
    }
  },
};
