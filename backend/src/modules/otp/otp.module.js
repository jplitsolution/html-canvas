import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpController } from './otp.controller';
import { OtpRequest } from './entities/otp-request.entity';
import { OtpService } from './otp.service';
import { ApiConfig } from '../api-config/entities/api-config.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Visit } from '../analytics/entities/visit.entity';
import { SmsProviderManager } from './providers/sms-provider.manager';
import { TwilioProvider } from './providers/twilio.provider';
import { Msg91Provider } from './providers/msg91.provider';
import { KaleyraProvider } from './providers/kaleyra.provider';
import { PartnerProvider } from './providers/partner.provider';
import { CustomHttpProvider } from './providers/custom-http.provider';
import { VisitEvent } from '../analytics/entities/visit-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpRequest, ApiConfig, Campaign, Visit, VisitEvent]),
  ],
  controllers: [OtpController],
  providers: [
    OtpService,
    SmsProviderManager,
    TwilioProvider,
    Msg91Provider,
    KaleyraProvider,
    PartnerProvider,
    CustomHttpProvider,
  ],
  exports: [OtpService],
})
export class OtpModule {}
