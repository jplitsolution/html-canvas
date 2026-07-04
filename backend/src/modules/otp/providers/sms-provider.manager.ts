import { Injectable, Logger } from '@nestjs/common';
import { TwilioProvider } from './twilio.provider';
import { Msg91Provider } from './msg91.provider';
import { KaleyraProvider } from './kaleyra.provider';
import { PartnerProvider } from './partner.provider';
import { CustomHttpProvider } from './custom-http.provider';
import { SmsProvider } from './sms-provider.interface';

@Injectable()
export class SmsProviderManager {
  private readonly logger = new Logger(SmsProviderManager.name);

  constructor(
    private readonly twilioProvider: TwilioProvider,
    private readonly msg91Provider: Msg91Provider,
    private readonly kaleyraProvider: KaleyraProvider,
    private readonly partnerProvider: PartnerProvider,
    private readonly customHttpProvider: CustomHttpProvider,
  ) {}

  getProvider(providerName?: string): SmsProvider {
    const normalized = providerName?.trim().toLowerCase();
    this.logger.log(`Resolving SMS provider: "${normalized || 'local/mock'}"`);

    switch (normalized) {
      case 'twilio':
        return this.twilioProvider;
      case 'msg91':
        return this.msg91Provider;
      case 'kaleyra':
        return this.kaleyraProvider;
      case 'partner':
      case 'partner_api':
        return this.partnerProvider;
      case 'custom':
      case 'custom_http':
        return this.customHttpProvider;
      default:
        this.logger.log('Fallback: using Mock Local OTP Provider');
        return {
          sendOtp: async (phone, otp) => {
            if (process.env.NODE_ENV === 'production') {
              this.logger.log(`[MOCK LOCAL SMS SENDER] To: ${phone} | Body: [REDACTED IN PRODUCTION]`);
            } else {
              this.logger.log(`[MOCK LOCAL SMS SENDER] To: ${phone} | Body: Your OTP code is ${otp}`);
            }
            return { success: true, providerRequestId: 'mock-req-id' };
          },
        };
    }
  }
}
