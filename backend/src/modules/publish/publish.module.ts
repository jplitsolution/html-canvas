import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublishController } from './publish.controller';
import { RoutingModule } from '../routing/routing.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ApiConfigModule } from '../api-config/api-config.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Project } from '../projects/entities/project.entity';
import { Page } from '../pages/entities/page.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Page]),
    RoutingModule,
    AnalyticsModule,
    ApiConfigModule,
    SubscriptionsModule,
  ],
  controllers: [PublishController],
})
export class PublishModule {}
