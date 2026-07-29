import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PartnerProvider {
  logger = new Logger(PartnerProvider.name);

  parseHeaders(headersJson) {
    if (!headersJson) return {};
    try {
      return JSON.parse(headersJson);
    } catch {
      return {};
    }
  }

  resolveTemplate(templateStr, variables) {
    let result = templateStr;
    for (const [key, val] of Object.entries(variables)) {
      result = result.split(`{{${key}}}`).join(val || '');
    }
    return result;
  }

  mapSubServiceId(pack) {
    const p = (pack || 'daily').toLowerCase();
    if (p === 'weekly') return 'HWeekly';
    if (p === 'monthly') return 'HMonthly';
    return 'HDaily';
  }

  isResponseCodeSuccess(data) {
    const code = data?.responseCode ?? data?.response_code ?? data?.resultCode;
    if (code === undefined || code === null) return null;
    return String(code) === '0';
  }

  async sendOtp(
    phone,
    otp,
    config,
    context,
  ) {
    const sendUrl = config?.sendUrl || config?.send_url;
    const method = (config?.method || 'POST').toUpperCase();
    const headers = this.parseHeaders(config?.headersJson || config?.headers_json || config?.headers);
    const bodyTemplate = config?.bodyJson || config?.body_json || config?.body || '';

    if (!sendUrl) {
      const errorMsg = 'Partner Send OTP URL missing (sendUrl)';
      this.logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const pack = (context.pack || 'daily').toLowerCase();
    const templateVariables = {
      phone,
      msisdn: phone,
      pack,
      subServiceId: this.mapSubServiceId(pack),
      campaign: context.campaignName,
      campaignId: String(context.campaignId),
      visitId: context.visitId ? String(context.visitId) : '',
    };

    const resolvedUrl = this.resolveTemplate(sendUrl, templateVariables);
    const resolvedBodyStr = typeof bodyTemplate === 'object' 
      ? JSON.stringify(bodyTemplate) 
      : this.resolveTemplate(bodyTemplate, templateVariables);

    try {
      this.logger.log(`Partner sending OTP via ${method} ${resolvedUrl}`);
      let response;
      if (method === 'GET') {
        response = await axios.get(resolvedUrl, { headers, timeout: 6000 });
      } else {
        const bodyObj = resolvedBodyStr ? JSON.parse(resolvedBodyStr) : {};
        response = await axios.post(resolvedUrl, bodyObj, { headers, timeout: 6000 });
      }

      const data = response.data;

      const codeSuccess = this.isResponseCodeSuccess(data);
      if (codeSuccess === false) {
        const msg =
          data?.responseMessage ||
          data?.response_message ||
          `responseCode=${data?.responseCode ?? data?.response_code}`;
        this.logger.warn(`Partner send rejected: ${msg}`);
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
        'partner-txn-id'
      );

      return {
        success: true,
        providerRequestId,
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Partner send failed: ${errorMsg}`);
      return { success: false, error: `Partner API Error: ${errorMsg}` };
    }
  }

  async verifyOtp(
    phone,
    otp,
    providerRequestId,
    config,
  ) {
    const verifyUrl = config?.verifyUrl || config?.verify_url;
    const method = (config?.verifyMethod || config?.verify_method || 'POST').toUpperCase();
    const headers = this.parseHeaders(config?.headersJson || config?.headers_json || config?.headers);
    const bodyTemplate = config?.verifyBodyJson || config?.verify_body_json || config?.verifyBody || '';

    if (!verifyUrl) {
      const errorMsg = 'Partner Verify OTP URL missing (verifyUrl)';
      this.logger.error(errorMsg);
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

    const resolvedUrl = this.resolveTemplate(verifyUrl, templateVariables);
    const resolvedBodyStr = typeof bodyTemplate === 'object'
      ? JSON.stringify(bodyTemplate)
      : this.resolveTemplate(bodyTemplate, templateVariables);

    try {
      if (process.env.NODE_ENV === 'production' && otp) {
        const maskedUrl = resolvedUrl.replace(otp, '[REDACTED]');
        this.logger.log(`Partner verifying OTP via ${method} ${maskedUrl}`);
      } else {
        this.logger.log(`Partner verifying OTP via ${method} ${resolvedUrl}`);
      }
      let response;
      if (method === 'GET') {
        response = await axios.get(resolvedUrl, { headers, timeout: 6000 });
      } else {
        const bodyObj = resolvedBodyStr ? JSON.parse(resolvedBodyStr) : {};
        response = await axios.post(resolvedUrl, bodyObj, { headers, timeout: 6000 });
      }

      const data = response.data;
      const codeSuccess = this.isResponseCodeSuccess(data);
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
        return { success: false, error: `Partner verification failed: ${JSON.stringify(data)}` };
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Partner verification failed with error: ${errorMsg}`);
      return { success: false, error: `Partner Verify Error: ${errorMsg}` };
    }
  }
}
