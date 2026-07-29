import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MarketsService } from './markets.service';
import {
  CreateMarketDto,
  CreateMarketCampaignDto,
} from './dto/create-market.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CampaignsService } from '../campaigns/campaigns.service';

@ApiTags('Markets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('markets')
export class MarketsController {
  constructor(
    @Inject(MarketsService) marketsService,
    @Inject(CampaignsService) campaignsService,
  ) {
    this.marketsService = marketsService;
    this.campaignsService = campaignsService;
  }

  @Get()
  @ApiOperation({ summary: 'List country + operator markets' })
  async list(@CurrentUser() user) {
    return this.marketsService.listMarkets(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a country + operator market' })
  async create(@Body() dto, @CurrentUser() user) {
    return this.marketsService.createMarket(dto, user.id);
  }

  @Get(':countryCode/:operatorCode')
  @ApiOperation({ summary: 'Get a single market by codes' })
  async getOne(
    @Param('countryCode') countryCode,
    @Param('operatorCode') operatorCode,
    @CurrentUser() user,
  ) {
    return this.marketsService.getMarket(countryCode, operatorCode, user.id);
  }

  @Get(':countryCode/:operatorCode/campaigns')
  @ApiOperation({ summary: 'List campaigns for a market' })
  async listCampaigns(
    @Param('countryCode') countryCode,
    @Param('operatorCode') operatorCode,
    @CurrentUser() user,
  ) {
    return this.marketsService.listCampaignsForMarket(
      countryCode,
      operatorCode,
      user.id,
    );
  }

  @Post(':countryCode/:operatorCode/campaigns')
  @ApiOperation({ summary: 'Create a campaign under a market' })
  async createCampaign(
    @Param('countryCode') countryCode,
    @Param('operatorCode') operatorCode,
    @Body() dto,
    @CurrentUser() user,
  ) {
    const { country, operator } = await this.marketsService.findMarketByCodes(
      countryCode,
      operatorCode,
      user.id,
    );
    return this.campaignsService.create(
      {
        name: dto.name,
        country: country.name,
        operator: operator.name,
        countryCode: country.code,
        operatorCode: operator.code,
        operatorId: operator.id,
        copyFromCampaignId: dto.copyFromCampaignId
          ? Number(dto.copyFromCampaignId)
          : undefined,
      },
      user.id,
    );
  }
}
