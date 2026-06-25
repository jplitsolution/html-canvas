import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FlowService } from './flow.service';
import { FlowTransitionDto, GetFlowPageQueryDto } from './dto/flow.dto';
import { CampaignPageType } from '../campaigns/entities/campaign-page.entity';

@ApiTags('Public Flow')
@Controller('flow')
export class FlowController {
  constructor(private readonly flowService: FlowService) {}

  @Get('page')
  @ApiOperation({ summary: 'Resolve campaign page by country, operator, and step' })
  async getPage(@Query() query: GetFlowPageQueryDto, @Req() req: any) {
    return this.flowService.getPage({
      country: query.country,
      operator: query.operator,
      pageType: query.page as CampaignPageType,
      phone: query.msisdn,
      visitId: query.visitId ? Number(query.visitId) : undefined,
      pack: query.pack,
      ipAddress:
        (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      landingUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    });
  }

  @Post('transition')
  @ApiOperation({ summary: 'Advance funnel step with partner API checks' })
  async transition(@Body() body: FlowTransitionDto) {
    return this.flowService.transition({
      visitId: body.visitId,
      country: body.country,
      operator: body.operator,
      fromPage: body.fromPage,
      action: body.action,
      phone: body.phone,
      planId: body.planId,
    });
  }
}
