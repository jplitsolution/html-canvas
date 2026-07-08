import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
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
import { User } from '../users/entities/user.entity';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('campaign/:campaignId')
  @ApiOperation({
    summary: 'Get analytics metrics for a campaign (owner only)',
  })
  @ApiResponse({ status: 200, type: CampaignAnalyticsDto })
  async getCampaignAnalytics(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @CurrentUser() user: User,
  ): Promise<CampaignAnalyticsDto> {
    return this.analyticsService.getCampaignAnalytics(campaignId, user.id);
  }

  @Get('campaign/:campaignId/logs')
  @ApiOperation({
    summary: 'Get detailed activity logs for a campaign (owner only)',
  })
  async getCampaignActivityLogs(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Query() query: ActivityLogsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.analyticsService.getCampaignActivityLogs(
      campaignId,
      user.id,
      query,
    );
  }
}
