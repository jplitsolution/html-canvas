import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Country } from './entities/country.entity';
import { Operator } from './entities/operator.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { MarketsService } from './markets.service';
import { MarketsController } from './markets.controller';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Country, Operator, Campaign]),
    forwardRef(() => CampaignsModule),
  ],
  controllers: [MarketsController],
  providers: [MarketsService],
  exports: [MarketsService],
})
export class MarketsModule {}
