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

export const customHttpProvider = {
  sendOtp: async (phone, otp, config, context) => {
    const urlTemplate = config?.url || config?.sendUrl;
    const method = (config?.method || 'POST').toUpperCase();
    const headersRaw =
      config?.headersJson || config?.headers_json || config?.headers || '{}';
    const bodyTemplate =
      config?.bodyJson || config?.body_json || config?.body || '';

    if (!urlTemplate) {
      const errorMsg = 'Custom HTTP provider URL missing (url)';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const templateVariables = {
      phone,
      otp,
      campaign: context.campaignName,
      campaignId: String(context.campaignId),
      visitId: context.visitId ? String(context.visitId) : '',
    };

    const resolvedUrl = resolveTemplate(urlTemplate, templateVariables);
    const headers =
      typeof headersRaw === 'object'
        ? headersRaw
        : parseHeaders(resolveTemplate(headersRaw, templateVariables));
    const resolvedBodyStr =
      typeof bodyTemplate === 'object'
        ? JSON.stringify(bodyTemplate)
        : resolveTemplate(bodyTemplate, templateVariables);

    try {
      if (process.env.NODE_ENV === 'production' && otp) {
        const maskedUrl = resolvedUrl.replace(otp, '[REDACTED]');
        console.log(`Custom HTTP sending OTP via ${method} ${maskedUrl}`);
      } else {
        console.log(`Custom HTTP sending OTP via ${method} ${resolvedUrl}`);
      }
      let response;
      if (method === 'GET') {
        response = await axios.get(resolvedUrl, { headers, timeout: 6000 });
      } else {
        let bodyData = resolvedBodyStr;
        try {
          if (resolvedBodyStr) {
            bodyData = JSON.parse(resolvedBodyStr);
          }
        } catch {
          // Keep as string
        }
        response = await axios.post(resolvedUrl, bodyData, {
          headers,
          timeout: 6000,
        });
      }

      return {
        success: response.status >= 200 && response.status < 300,
        providerRequestId:
          response.data?.id || response.data?.requestId || 'custom-http-req',
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`Custom HTTP send failed: ${errorMsg}`);
      return { success: false, error: `Custom HTTP Error: ${errorMsg}` };
    }
  },
};
