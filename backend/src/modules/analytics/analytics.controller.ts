import { Controller, Get, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { ProjectAnalyticsDto } from './dto/project-analytics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get analytics metrics for a project (owner only)' })
  @ApiResponse({ status: 200, type: ProjectAnalyticsDto, description: 'Project analytics metrics' })
  async getProjectAnalytics(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: User,
  ): Promise<ProjectAnalyticsDto> {
    return this.analyticsService.getProjectAnalytics(projectId, user.id);
  }
}
