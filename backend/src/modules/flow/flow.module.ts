import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlowService } from './flow.service';
import { FlowController } from './flow.controller';
import { PartnerApiService } from './partner-api.service';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PartnersModule } from '../partners/partners.module';
import { VariableResolverService } from '../../common/services/variable-resolver.service';
import { FlowEngineService } from './flow-engine.service';
import { ApiConfig } from '../api-config/entities/api-config.entity';
import { OtpRequest } from '../otp/entities/otp-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiConfig, OtpRequest]),
    CampaignsModule,
    AnalyticsModule,
    PartnersModule,
  ],
  controllers: [FlowController],
  providers: [
    FlowService,
    PartnerApiService,
    VariableResolverService,
    FlowEngineService,
  ],
})
export class FlowModule {}
