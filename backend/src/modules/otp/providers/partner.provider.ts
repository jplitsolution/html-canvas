import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SmsProvider, SmsProviderSendResult, SmsProviderVerifyResult, SmsProviderContext } from './sms-provider.interface';

@Injectable()
export class PartnerProvider implements SmsProvider {
  private readonly logger = new Logger(PartnerProvider.name);

  private parseHeaders(headersJson?: string): Record<string, string> {
    if (!headersJson) return {};
    try {
      return JSON.parse(headersJson) as Record<string, string>;
    } catch {
      return {};
    }
  }

  private resolveTemplate(templateStr: string, variables: Record<string, string | undefined>): string {
    let result = templateStr;
    for (const [key, val] of Object.entries(variables)) {
      result = result.split(`{{${key}}}`).join(val || '');
    }
    return result;
  }

  async sendOtp(
    phone: string,
    otp: string, // Ignored in partner-generated mode
    config: any,
    context: SmsProviderContext,
  ): Promise<SmsProviderSendResult> {
    const sendUrl = config?.sendUrl || config?.send_url;
    const method = (config?.method || 'POST').toUpperCase();
    const headers = this.parseHeaders(config?.headersJson || config?.headers_json || config?.headers);
    const bodyTemplate = config?.bodyJson || config?.body_json || config?.body || '';

    if (!sendUrl) {
      const errorMsg = 'Partner Send OTP URL missing (sendUrl)';
      this.logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const templateVariables = {
      phone,
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

      const data = response.data as Record<string, any>;
      // Look for common request ID fields in responses
      const providerRequestId = String(
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
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Partner send failed: ${errorMsg}`);
      return { success: false, error: `Partner API Error: ${errorMsg}` };
    }
  }

  async verifyOtp(
    phone: string,
    otp: string,
    providerRequestId: string,
    config: any,
  ): Promise<SmsProviderVerifyResult> {
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
      otp,
      providerRequestId,
      referenceId: providerRequestId,
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
      // Success check: if partner returns success = true, or valid = true, or status = success, or simply HTTP 200
      const isSuccess = data?.success === true || 
                        data?.valid === true || 
                        data?.status === 'success' ||
                        data?.status === 'OK' ||
                        response.status === 200;

      if (isSuccess) {
        return { success: true };
      } else {
        return { success: false, error: `Partner verification failed: ${JSON.stringify(data)}` };
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Partner verification failed with error: ${errorMsg}`);
      return { success: false, error: `Partner Verify Error: ${errorMsg}` };
    }
  }
}
