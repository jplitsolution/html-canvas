import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CampaignsService } from '../campaigns/campaigns.service';
import { SearchService } from '../search/search.service';

@ApiTags('Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogsController {
  constructor(
    private readonly searchService: SearchService,
    private readonly campaignsService: CampaignsService,
  ) {}

  private buildParams(campaignId: number, query: Record<string, string>) {
    return {
      campaignId,
      from: query.from,
      to: query.to,
      eventType: query.eventType,
      vendorId: query.vendorId ? Number(query.vendorId) : undefined,
      affiliateId: query.affiliateId ? Number(query.affiliateId) : undefined,
      clickId: query.clickId,
      q: query.q,
      page: query.page ? Number(query.page) : undefined,
      size: query.size ? Number(query.size) : undefined,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Whether the Elasticsearch log backend is enabled' })
  status() {
    return { enabled: this.searchService.isEnabled() };
  }

  @Get('campaign/:campaignId')
  @ApiOperation({ summary: 'Search campaign event logs (owner only)' })
  async search(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Query() query: Record<string, string>,
    @CurrentUser() user: User,
  ) {
    await this.campaignsService.findOne(campaignId, user.id);
    return this.searchService.search(this.buildParams(campaignId, query));
  }

  @Get('campaign/:campaignId/aggregations')
  @ApiOperation({ summary: 'Aggregated log analytics for charts (owner only)' })
  async aggregations(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Query() query: Record<string, string>,
    @CurrentUser() user: User,
  ) {
    await this.campaignsService.findOne(campaignId, user.id);
    return this.searchService.aggregations(this.buildParams(campaignId, query));
  }
}
