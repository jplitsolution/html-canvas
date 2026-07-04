import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SmsProvider, SmsProviderSendResult, SmsProviderContext } from './sms-provider.interface';

@Injectable()
export class Msg91Provider implements SmsProvider {
  private readonly logger = new Logger(Msg91Provider.name);

  async sendOtp(
    phone: string,
    otp: string,
    config: any,
    context: SmsProviderContext,
  ): Promise<SmsProviderSendResult> {
    const authKey = config?.authKey || config?.authkey || config?.auth_key;
    const templateId = config?.templateId || config?.template_id;
    const sender = config?.sender || 'MSG91';

    if (!authKey || !templateId) {
      const errorMsg = 'MSG91 credentials missing (authKey or templateId)';
      this.logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      this.logger.log(`Sending MSG91 OTP to ${phone}`);
      const response = await axios.post(
        'https://control.msg91.com/api/v5/otp',
        {
          template_id: templateId,
          mobile: phone,
          otp: otp,
          sender: sender,
        },
        {
          headers: {
            'authkey': authKey,
            'Content-Type': 'application/json',
          },
          timeout: 6000,
        },
      );

      const data = response.data;
      if (data?.type === 'success') {
        return {
          success: true,
          providerRequestId: data.request_id || 'msg91-req',
        };
      } else {
        const errMsg = data?.message || JSON.stringify(data);
        this.logger.error(`MSG91 API error: ${errMsg}`);
        return { success: false, error: `MSG91 Error: ${errMsg}` };
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(`MSG91 send failed: ${errorMsg}`);
      return { success: false, error: `MSG91 Error: ${errorMsg}` };
    }
  }
}
