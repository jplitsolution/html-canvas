import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignPage } from './entities/campaign-page.entity';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { Template } from '../templates/entities/template.entity';
import { CampaignTracking } from './entities/campaign-tracking.entity';
import { ApiConfig } from '../api-config/entities/api-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, CampaignPage, Template, ApiConfig, CampaignTracking]),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
