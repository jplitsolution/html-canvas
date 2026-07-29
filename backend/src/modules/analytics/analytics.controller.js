import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CampaignAnalyticsDto } from './dto/campaign-analytics.dto';
import { ActivityLogsQueryDto } from './dto/activity-logs-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) analyticsService) {
    this.analyticsService = analyticsService;
  }

  @Get('campaign/:campaignId')
  @ApiOperation({
    summary: 'Get analytics metrics for a campaign (owner only)',
  })
  @ApiResponse({ status: 200, type: CampaignAnalyticsDto })
  async getCampaignAnalytics(
    @Param('campaignId', ParseIntPipe) campaignId,
    @CurrentUser() user,
  ) {
    return this.analyticsService.getCampaignAnalytics(campaignId, user.id);
  }

  @Get('campaign/:campaignId/logs')
  @ApiOperation({
    summary: 'Get detailed activity logs for a campaign (owner only)',
  })
  async getCampaignActivityLogs(
    @Param('campaignId', ParseIntPipe) campaignId,
    @Query() query,
    @CurrentUser() user,
  ) {
    return this.analyticsService.getCampaignActivityLogs(
      campaignId,
      user.id,
      query,
    );
  }
}
