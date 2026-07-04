import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FlowService } from './flow.service';
import { FlowTransitionDto, GetFlowPageQueryDto } from './dto/flow.dto';
import { CampaignPageType } from '../campaigns/entities/campaign-page.entity';
import { PublicRateLimitGuard } from '../../common/guards/public-rate-limit.guard';

@ApiTags('Public Flow')
@Controller('flow')
export class FlowController {
  constructor(private readonly flowService: FlowService) {}

  @Get('page')
  @ApiOperation({
    summary: 'Resolve campaign page by country, operator, and step',
  })
  async getPage(@Query() query: GetFlowPageQueryDto, @Req() req: any) {
    const headerMsisdn =
      (req.headers['x-msisdn'] as string) ||
      (req.headers['x-msisdn-number'] as string) ||
      (req.headers['msisdn'] as string) ||
      '';
    return this.flowService.getPage({
      country: query.country,
      operator: query.operator,
      pageType: query.page,
      // Prefer operator / proxy-injected MSISDN header over query params.
      // Query param is kept only for backward compatibility / local testing.
      phone: headerMsisdn || query.msisdn,
      visitId: query.visitId ? Number(query.visitId) : undefined,
      pack: query.pack,
      ipAddress:
        (req.headers['x-forwarded-for'] as string) ||
        req.socket?.remoteAddress ||
        '',
      userAgent: req.headers['user-agent'] || '',
      landingUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    });
  }

  @Post('transition')
  @UseGuards(PublicRateLimitGuard)
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
