import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [CampaignsModule],
  controllers: [LogsController],
})
export class LogsModule {}
