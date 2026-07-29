import { Controller, Get, Post, Body, Query, Req, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FlowService } from './flow.service';
import { CampaignPageType } from '../campaigns/entities/campaign-page.entity';
import { PublicRateLimitGuard } from '../../common/guards/public-rate-limit.guard';

function extractHeaderMsisdn(headers) {
  if (!headers) return '';
  const candidate =
    headers['x-msisdn'] ||
    headers['x-msisdn-number'] ||
    headers['msisdn'] ||
    headers['x-up-calling-line-id'] ||
    headers['x-fh-msisdn'] ||
    headers['user-identity-forward-msisdn'] ||
    headers['http-msisdn'] ||
    headers['x-network-info'] ||
    headers['x-operator-msisdn'] ||
    '';
  return Array.isArray(candidate) ? candidate[0] : String(candidate || '');
}

@ApiTags('Public Flow')
@Controller('flow')
export class FlowController {
  constructor(@Inject(FlowService) flowService) {
    this.flowService = flowService;
  }

  @Get('detect-msisdn')
  @ApiOperation({ summary: 'Detect MSISDN from incoming ISP headers and check subscription status' })
  async detectMsisdn(@Query() query, @Req() req) {
    const headerPhone = extractHeaderMsisdn(req.headers);
    return this.flowService.detectMsisdn({
      country: query.country,
      operator: query.operator,
      campid: query.campid,
      phone: headerPhone || query.msisdn || query.phone,
      ipAddress:
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        '',
      userAgent: req.headers['user-agent'] || '',
    });
  }

  @Get('page')
  @ApiOperation({
    summary: 'Resolve campaign page by country, operator, and step',
  })
  async getPage(@Query() query, @Req() req) {
    const headerMsisdn = extractHeaderMsisdn(req.headers);
    return this.flowService.getPage({
      country: query.country,
      operator: query.operator,
      pageType: query.page || CampaignPageType.HOME,
      phone: headerMsisdn || query.msisdn,
      visitId: query.visitId ? Number(query.visitId) : undefined,
      pack: query.pack,
      campid: query.campid,
      vid: query.vid,
      affId: query.aff_id,
      clickId: query.click_id,
      ipAddress:
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        '',
      userAgent: req.headers['user-agent'] || '',
      landingUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    });
  }

  @Get('entry')
  @ApiOperation({ summary: 'Resolve the configured start page for a campaign flow' })
  async getEntry(@Query() query) {
    return this.flowService.getFlowEntry({
      country: query.country,
      operator: query.operator,
      campid: query.campid,
    });
  }

  @Post('transition')
  @UseGuards(PublicRateLimitGuard)
  @ApiOperation({ summary: 'Advance funnel step with partner API checks' })
  async transition(@Body() body) {
    return this.flowService.transition({
      visitId: body.visitId,
      country: body.country,
      operator: body.operator,
      fromPage: body.fromPage,
      action: body.action,
      phone: body.phone,
      planId: body.planId,
      campid: body.campid,
    });
  }
}
