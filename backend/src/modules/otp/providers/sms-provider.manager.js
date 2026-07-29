import { Injectable, Logger, Inject } from '@nestjs/common';
import { TwilioProvider } from './twilio.provider';
import { Msg91Provider } from './msg91.provider';
import { KaleyraProvider } from './kaleyra.provider';
import { PartnerProvider } from './partner.provider';
import { CustomHttpProvider } from './custom-http.provider';

@Injectable()
export class SmsProviderManager {
  logger = new Logger(SmsProviderManager.name);

  constructor(
    @Inject(TwilioProvider) twilioProvider,
    @Inject(Msg91Provider) msg91Provider,
    @Inject(KaleyraProvider) kaleyraProvider,
    @Inject(PartnerProvider) partnerProvider,
    @Inject(CustomHttpProvider) customHttpProvider,
  ) {
    this.twilioProvider = twilioProvider;
    this.msg91Provider = msg91Provider;
    this.kaleyraProvider = kaleyraProvider;
    this.partnerProvider = partnerProvider;
    this.customHttpProvider = customHttpProvider;
  }

  getProvider(providerName) {
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
