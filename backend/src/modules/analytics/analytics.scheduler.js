import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsScheduler {
  logger = new Logger(AnalyticsScheduler.name);

  constructor(@Inject(AnalyticsService) analyticsService) {
    this.analyticsService = analyticsService;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyStatsAggregation() {
    this.logger.debug('Running hourly stats aggregation (simulated)');
  }

  @Cron('5 0 * * *', { timeZone: 'Asia/Kolkata' })
  async handleMidnightStatsAggregation() {
    this.logger.debug('Running midnight IST stats aggregation (simulated)');
  }

  async handleDatabaseArchiving() {
    this.logger.debug('Running daily database archiving job');
    try {
      await this.analyticsService.archiveOldData();
    } catch (err) {
      this.logger.error(`Database archiving failed: ${err.message}`);
    }
  }
}
