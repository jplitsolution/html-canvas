import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SmsProvider, SmsProviderSendResult, SmsProviderContext } from './sms-provider.interface';

@Injectable()
export class CustomHttpProvider implements SmsProvider {
  private readonly logger = new Logger(CustomHttpProvider.name);

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
    otp: string,
    config: any,
    context: SmsProviderContext,
  ): Promise<SmsProviderSendResult> {
    const urlTemplate = config?.url || config?.sendUrl;
    const method = (config?.method || 'POST').toUpperCase();
    const headersRaw = config?.headersJson || config?.headers_json || config?.headers || '{}';
    const bodyTemplate = config?.bodyJson || config?.body_json || config?.body || '';

    if (!urlTemplate) {
      const errorMsg = 'Custom HTTP provider URL missing (url)';
      this.logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const templateVariables = {
      phone,
      otp,
      campaign: context.campaignName,
      campaignId: String(context.campaignId),
      visitId: context.visitId ? String(context.visitId) : '',
    };

    const resolvedUrl = this.resolveTemplate(urlTemplate, templateVariables);
    const headers = typeof headersRaw === 'object' 
      ? headersRaw 
      : this.parseHeaders(this.resolveTemplate(headersRaw, templateVariables));
    const resolvedBodyStr = typeof bodyTemplate === 'object'
      ? JSON.stringify(bodyTemplate)
      : this.resolveTemplate(bodyTemplate, templateVariables);

    try {
      if (process.env.NODE_ENV === 'production' && otp) {
        const maskedUrl = resolvedUrl.replace(otp, '[REDACTED]');
        this.logger.log(`Custom HTTP sending OTP via ${method} ${maskedUrl}`);
      } else {
        this.logger.log(`Custom HTTP sending OTP via ${method} ${resolvedUrl}`);
      }
      let response;
      if (method === 'GET') {
        response = await axios.get(resolvedUrl, { headers, timeout: 6000 });
      } else {
        let bodyData: any = resolvedBodyStr;
        try {
          if (resolvedBodyStr) {
            bodyData = JSON.parse(resolvedBodyStr);
          }
        } catch {
          // Keep as string if it isn't valid JSON (e.g. form-urlencoded)
        }
        response = await axios.post(resolvedUrl, bodyData, { headers, timeout: 6000 });
      }

      return {
        success: response.status >= 200 && response.status < 300,
        providerRequestId: response.data?.id || response.data?.requestId || 'custom-http-req',
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Custom HTTP send failed: ${errorMsg}`);
      return { success: false, error: `Custom HTTP Error: ${errorMsg}` };
    }
  }
}
