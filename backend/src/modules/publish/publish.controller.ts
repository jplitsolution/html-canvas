import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import axios from 'axios';

import { RoutingService } from '../routing/routing.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ApiConfigService } from '../api-config/api-config.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Page, PageType } from '../pages/entities/page.entity';
import { Project } from '../projects/entities/project.entity';
import { VisitStatus } from '../analytics/entities/visit.entity';
import { VisitEventType } from '../analytics/entities/visit-event.entity';
import { SubscriptionStatus } from '../subscriptions/entities/subscription.entity';
import { SubscribeRequestDto } from './dto/subscribe-request.dto';

@ApiTags('Public Publish / Subscribe')
@Controller()
export class PublishController {
  constructor(
    private readonly routingService: RoutingService,
    private readonly analyticsService: AnalyticsService,
    private readonly apiConfigService: ApiConfigService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
  ) {}

  @Get('p/:slug')
  @ApiOperation({ summary: 'Resolve campaign routing and track visit' })
  @ApiResponse({ status: 200, description: 'Page details and query parameters variables' })
  async publish(
    @Param('slug') slug: string,
    @Query('msisdn') msisdn: string,
    @Query('country') country: string,
    @Query('operator') operator: string,
    @Req() req: any,
  ) {
    // 1. Find project by slug
    const project = await this.projectRepository.findOne({ where: { slug } });
    if (!project) {
      throw new NotFoundException(`Project with slug "${slug}" not found`);
    }

    const phone = msisdn || '';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const landingUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    // 2. Create Visit Record
    const visit = await this.analyticsService.createVisit({
      projectId: project.id,
      phone,
      country,
      operator,
      ipAddress,
      userAgent,
      landingUrl,
      visitStatus: VisitStatus.VISIT,
    });

    // 3. Call Routing Service
    const resolved = await this.routingService.resolvePage({
      projectId: project.id,
      phone,
      country,
      operator,
    });

    // 4. Update Visit Status and Log Events based on resolved page
    let finalStatus = VisitStatus.VISIT;
    if (resolved.pageType === PageType.BLOCKED) {
      finalStatus = VisitStatus.BLOCKED;
      await this.analyticsService.logEvent(visit.id, VisitEventType.BLOCKED);
    } else if (resolved.pageType === PageType.THANKYOU) {
      finalStatus = VisitStatus.SUBSCRIBED;
      await this.analyticsService.logEvent(visit.id, VisitEventType.SUBSCRIBE_SUCCESS, { info: 'Already subscribed' });
    } else if (resolved.pageType === PageType.PLAN) {
      finalStatus = VisitStatus.PLAN_SHOWN;
      await this.analyticsService.logEvent(visit.id, VisitEventType.PLAN_VIEW);
    }

    await this.analyticsService.updateVisit(visit.id, finalStatus, resolved.pageType);

    // 5. Return payload
    return {
      projectId: project.id,
      pageType: resolved.pageType,
      pageId: resolved.pageId,
      templateId: resolved.templateId,
      visitId: visit.id,
      variables: {
        phone,
        country,
        operator,
        service_id: project.serviceId || '',
      },
    };
  }

  @Post('public/subscribe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit user subscription request to partner API and record status' })
  @ApiResponse({ status: 200, description: 'Subscription outcome and redirection details' })
  async subscribe(@Body() subscribeDto: SubscribeRequestDto) {
    const { visitId, projectId, phone, planId } = subscribeDto;

    // 1. Create SUBSCRIBE_CLICK event
    await this.analyticsService.logEvent(visitId, VisitEventType.SUBSCRIBE_CLICK, { planId });

    // 2. Fetch project
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // 3. Load API configuration
    const apiConfig = await this.apiConfigService.getInternalConfig(projectId);
    const serviceId = project.serviceId || 'default_service';

    let success = true;

    // Fast-fail rule for testing
    if (phone.startsWith('999') || phone.toLowerCase().includes('fail')) {
      success = false;
    } else if (apiConfig && apiConfig.subscribeApi) {
      try {
        let headers = {};
        if (apiConfig.headersJson) {
          try {
            headers = JSON.parse(apiConfig.headersJson);
          } catch {
            // Ignore parse errors
          }
        }

        const response = await axios.post(
          apiConfig.subscribeApi,
          {
            phone,
            serviceId,
            planId,
            visitId,
          },
          { headers, timeout: 5000 },
        );

        // Assume any 2xx response represents success from partner
        if (response.status < 200 || response.status >= 300) {
          success = false;
        }
      } catch (err) {
        success = false;
      }
    }

    if (success) {
      // 4. Success flow
      await this.analyticsService.updateVisit(visitId, VisitStatus.SUCCESS, PageType.THANKYOU);
      await this.subscriptionsService.createSubscription(phone, serviceId, SubscriptionStatus.ACTIVE);
      await this.analyticsService.logEvent(visitId, VisitEventType.SUBSCRIBE_SUCCESS);

      const thankYouPage = await this.pageRepository.findOne({
        where: { projectId, pageType: PageType.THANKYOU },
      });

      return {
        status: 'SUCCESS',
        pageType: PageType.THANKYOU,
        pageId: thankYouPage ? thankYouPage.id : null,
        templateId: thankYouPage && thankYouPage.templateId ? thankYouPage.templateId : null,
      };
    } else {
      // 5. Failure flow
      await this.analyticsService.updateVisit(visitId, VisitStatus.FAILED, PageType.ERROR);
      await this.analyticsService.logEvent(visitId, VisitEventType.SUBSCRIBE_FAILED);

      const errorPage = await this.pageRepository.findOne({
        where: { projectId, pageType: PageType.ERROR },
      });

      return {
        status: 'FAILED',
        pageType: PageType.ERROR,
        pageId: errorPage ? errorPage.id : null,
        templateId: errorPage && errorPage.templateId ? errorPage.templateId : null,
      };
    }
  }
}
