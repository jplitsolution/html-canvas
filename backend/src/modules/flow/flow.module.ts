import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlowService } from './flow.service';
import { FlowController } from './flow.controller';
import { PartnerApiService } from './partner-api.service';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { VariableResolverService } from '../../common/services/variable-resolver.service';
import { ApiConfig } from '../api-config/entities/api-config.entity';
import { OtpRequest } from '../otp/entities/otp-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiConfig, OtpRequest]),
    CampaignsModule,
    AnalyticsModule,
  ],
  controllers: [FlowController],
  providers: [FlowService, PartnerApiService, VariableResolverService],
})
export class FlowModule {}
