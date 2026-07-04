import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SmsProvider, SmsProviderSendResult, SmsProviderContext } from './sms-provider.interface';

@Injectable()
export class KaleyraProvider implements SmsProvider {
  private readonly logger = new Logger(KaleyraProvider.name);

  async sendOtp(
    phone: string,
    otp: string,
    config: any,
    context: SmsProviderContext,
  ): Promise<SmsProviderSendResult> {
    const apiKey = config?.apiKey || config?.apikey || config?.api_key;
    const sender = config?.sender || 'KALEYRA';
    const template = config?.messageTemplate || config?.message_template || 'Your OTP code is {{otp}}';
    const region = config?.region || 'global'; // 'global' or 'eu'

    if (!apiKey) {
      const errorMsg = 'Kaleyra credentials missing (apiKey)';
      this.logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const message = template.replace('{{otp}}', otp).replace('{{campaign}}', context.campaignName);

    try {
      this.logger.log(`Sending Kaleyra SMS to ${phone} region=${region}`);
      if (region === 'eu') {
        // EU region GET endpoint
        const url = `https://api.eu-west-1.kaleyra.com/v4/`;
        const response = await axios.get(url, {
          params: {
            api_key: apiKey,
            method: 'sms',
            message: message,
            to: phone,
            sender: sender,
          },
          timeout: 6000,
        });
        const data = response.data;
        if (data?.status === 'OK' || data?.error === undefined) {
          return {
            success: true,
            providerRequestId: data.id || 'kaleyra-eu-req',
          };
        } else {
          return { success: false, error: `Kaleyra EU Error: ${JSON.stringify(data)}` };
        }
      } else {
        // Global region POST JSON endpoint
        const response = await axios.post(
          'https://api.kaleyra.io/v1.0/messages',
          {
            to: phone,
            type: 'sms',
            sender: sender,
            body: message,
          },
          {
            headers: {
              'api-key': apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 6000,
          },
        );
        const data = response.data;
        if (data?.id) {
          return {
            success: true,
            providerRequestId: data.id,
          };
        } else {
          return { success: false, error: `Kaleyra Error: ${JSON.stringify(data)}` };
        }
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`Kaleyra send failed: ${errorMsg}`);
      return { success: false, error: `Kaleyra Error: ${errorMsg}` };
    }
  }
}
