import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visit } from './entities/visit.entity';
import { VisitEvent } from './entities/visit-event.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsProcessor } from './analytics.processor';
import { AnalyticsScheduler } from './analytics.scheduler';
import { AnalyticsController } from './analytics.controller';
import { BullModule } from '@nestjs/bullmq';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Visit, VisitEvent]),
    BullModule.registerQueue({
      name: 'analytics-events',
    }),
    CampaignsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsProcessor, AnalyticsScheduler],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
