import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CampaignPageType } from '../campaigns/entities/campaign-page.entity';
import { PartnerApiService } from './partner-api.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { VisitStatus } from '../analytics/entities/visit.entity';
import { VisitEventType } from '../analytics/entities/visit-event.entity';
import { VariableResolverService } from '../../common/services/variable-resolver.service';
import { ApiConfig } from '../api-config/entities/api-config.entity';

import { OtpRequest } from '../otp/entities/otp-request.entity';

@Injectable()
export class FlowService {
  private readonly logger = new Logger(FlowService.name);

  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly partnerApiService: PartnerApiService,
    private readonly analyticsService: AnalyticsService,
    private readonly variableResolver: VariableResolverService,
    @InjectRepository(ApiConfig)
    private readonly apiConfigRepository: Repository<ApiConfig>,
    @InjectRepository(OtpRequest)
    private readonly otpRepository: Repository<OtpRequest>,
  ) {}

  async getPage(input: {
    country: string;
    operator: string;
    pageType: CampaignPageType;
    phone?: string;
    visitId?: number;
    pack?: string;
    ipAddress?: string;
    userAgent?: string;
    landingUrl?: string;
  }) {
    this.logger.log(
      `GET page | country=${input.country} operator=${input.operator} page=${input.pageType} phone=${input.phone || '(empty)'}`,
    );

    const campaign = await this.campaignsService.findByCountryOperator(
      input.country,
      input.operator,
    );
    if (!campaign) {
      this.logger.warn(
        `Campaign not found: ${input.country} / ${input.operator}`,
      );
      throw new NotFoundException(
        `No campaign found for ${input.country} / ${input.operator}`,
      );
    }
    if (!campaign.active) {
      this.logger.warn(
        `Campaign inactive: id=${campaign.id} ${campaign.country}/${campaign.operator}`,
      );
      throw new ForbiddenException('Campaign is not active');
    }

    this.logger.log(`Campaign resolved: id=${campaign.id} active=true`);

    const apiConfig = await this.apiConfigRepository.findOne({
      where: { campaignId: campaign.id },
    });

    const phone = input.phone || '';
    const serviceId = campaign.serviceId || 'default_service';
    const pack = this.normalizePack(input.pack);
    const variables = {
      phone,
      country: campaign.country,
      operator: campaign.operator,
      service_id: serviceId,
      plan: this.formatPlanLabel(pack),
    };

    let visitId = input.visitId;
    let resolvedPageType = input.pageType;

    if (!visitId && input.pageType === CampaignPageType.HOME) {
      const visit = await this.analyticsService.createVisit({
        campaignId: campaign.id,
        phone,
        country: campaign.country,
        operator: campaign.operator,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        landingUrl: input.landingUrl,
        visitStatus: VisitStatus.VISIT,
        pageType: CampaignPageType.HOME,
      });
      visitId = visit.id;
      await this.analyticsService.logEvent(visitId, VisitEventType.HOME_VIEW);

      const subscribed = await this.partnerApiService.checkSubscription(
        apiConfig,
        {
          phone,
          serviceId,
          country: campaign.country,
          operator: campaign.operator,
        },
      );
      if (subscribed) {
        resolvedPageType = CampaignPageType.THANKYOU;
        await this.analyticsService.updateVisit(
          visitId,
          VisitStatus.SUBSCRIBED,
          CampaignPageType.THANKYOU,
        );
        await this.analyticsService.logEvent(
          visitId,
          VisitEventType.SUBSCRIBE_SUCCESS,
          {
            info: 'Already subscribed',
          },
        );
      } else {
        await this.analyticsService.updateVisit(
          visitId,
          VisitStatus.HOME_SHOWN,
          CampaignPageType.HOME,
        );
      }
    }

    const page = campaign.pages.find((p) => p.pageType === resolvedPageType);
    if (!page?.template) {
      throw new NotFoundException(`Page ${resolvedPageType} not configured`);
    }

    const templateData = page.template.data || {};
    const html = this.variableResolver.replaceVariables(
      templateData.html || '',
      variables,
    );

    this.logger.log(
      `GET page ← ${resolvedPageType} visitId=${visitId ?? 'n/a'}`,
    );

    return {
      campaignId: campaign.id,
      visitId,
      pageType: resolvedPageType,
      templateId: page.templateId,
      html,
      css: templateData.css || '',
      variables,
      actions: this.getActions(resolvedPageType),
      pack: this.normalizePack(input.pack),
    };
  }

  async transition(input: {
    visitId: number;
    country: string;
    operator: string;
    fromPage: CampaignPageType;
    action: string;
    phone?: string;
    planId?: string;
  }) {
    this.logger.log(
      `POST transition | visitId=${input.visitId} ${input.country}/${input.operator} ${input.fromPage} → ${input.action} phone=${input.phone || '(empty)'}`,
    );
    const campaign = await this.campaignsService.findByCountryOperator(
      input.country,
      input.operator,
    );
    if (!campaign || !campaign.active) {
      throw new NotFoundException('Campaign not found or inactive');
    }

    const apiConfig = await this.apiConfigRepository.findOne({
      where: { campaignId: campaign.id },
    });

    const phone = input.phone || '';
    const serviceId = campaign.serviceId || 'default_service';

    if (
      input.fromPage === CampaignPageType.HOME &&
      input.action === 'SUBSCRIBE'
    ) {
      await this.analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_CLICK,
      );

      let headerPhoneDetected = false;
      try {
        const visit = await this.analyticsService['visitRepository'].findOne({
          where: { id: input.visitId },
        });
        if (visit && visit.phone && visit.phone.trim() !== '') {
          headerPhoneDetected = true;
        }
      } catch (err) {
        this.logger.error(`Error resolving visit in transition: ${(err as Error).message}`);
      }

      let isOtpEnabled = false;
      if (apiConfig && apiConfig.otpProvider && apiConfig.otpProvider.trim() !== '') {
        isOtpEnabled = true;
      }

      let nextPage: CampaignPageType;
      if (isOtpEnabled) {
        nextPage = headerPhoneDetected ? CampaignPageType.CONFIRM : CampaignPageType.OTP;
      } else {
        nextPage = phone ? CampaignPageType.CONFIRM : CampaignPageType.OTP;
      }

      await this.analyticsService.updateVisit(
        input.visitId,
        nextPage === CampaignPageType.CONFIRM
          ? VisitStatus.CONFIRM_SHOWN
          : VisitStatus.HOME_SHOWN,
        nextPage,
      );
      if (nextPage === CampaignPageType.CONFIRM) {
        await this.analyticsService.logEvent(
          input.visitId,
          VisitEventType.CONFIRM_VIEW,
        );
      }
      const variables = {
        phone,
        country: campaign.country,
        operator: campaign.operator,
        service_id: serviceId,
        plan: '',
      };
      return this.buildPageResponse(
        campaign,
        nextPage,
        variables,
        input.visitId,
      );
    }

    if (
      input.fromPage === CampaignPageType.CONFIRM &&
      input.action === 'CONFIRM'
    ) {
      if (!input.planId) {
        throw new BadRequestException('Please select a subscription pack');
      }
      const selectedPack = this.normalizePack(input.planId);
      const subscriptionUrl = this.buildSubscriptionUrl(campaign, selectedPack);
      const confirmVariables = {
        phone,
        country: campaign.country,
        operator: campaign.operator,
        service_id: serviceId,
        plan: this.formatPlanLabel(selectedPack),
      };
      const blockResult = await this.partnerApiService.checkBlocked(apiConfig, {
        phone,
        country: campaign.country,
        operator: campaign.operator,
      });

      if (blockResult.blocked) {
        await this.analyticsService.updateVisit(
          input.visitId,
          VisitStatus.BLOCKED,
          CampaignPageType.BLOCKED,
        );
        await this.analyticsService.logEvent(
          input.visitId,
          VisitEventType.BLOCKED,
          {
            reason: blockResult.reason,
          },
        );
        return this.buildPageResponse(
          campaign,
          CampaignPageType.BLOCKED,
          confirmVariables,
          input.visitId,
          'BLOCKED',
          selectedPack,
          subscriptionUrl,
        );
      }

      const subscribed = await this.partnerApiService.checkSubscription(
        apiConfig,
        {
          phone,
          serviceId,
          country: campaign.country,
          operator: campaign.operator,
        },
      );
      if (subscribed) {
        await this.analyticsService.updateVisit(
          input.visitId,
          VisitStatus.SUBSCRIBED,
          CampaignPageType.THANKYOU,
        );
        await this.analyticsService.logEvent(
          input.visitId,
          VisitEventType.SUBSCRIBE_SUCCESS,
          {
            info: 'Already subscribed at confirm',
          },
        );
        return this.buildPageResponse(
          campaign,
          CampaignPageType.THANKYOU,
          confirmVariables,
          input.visitId,
          'ALREADY_SUBSCRIBED',
          selectedPack,
          subscriptionUrl,
        );
      }

      const success = await this.partnerApiService.subscribe(apiConfig, {
        phone,
        serviceId,
        country: campaign.country,
        operator: campaign.operator,
        visitId: input.visitId,
        planId: selectedPack,
        subscriptionUrl,
      });

      if (success) {
        this.logger.log(
          `transition result: SUCCESS → THANKYOU visitId=${input.visitId} pack=${selectedPack}`,
        );
        await this.analyticsService.updateVisit(
          input.visitId,
          VisitStatus.SUCCESS,
          CampaignPageType.THANKYOU,
        );
        await this.analyticsService.logEvent(
          input.visitId,
          VisitEventType.SUBSCRIBE_SUCCESS,
          {
            pack: selectedPack,
            subscriptionUrl,
          },
        );
        return this.buildPageResponse(
          campaign,
          CampaignPageType.THANKYOU,
          confirmVariables,
          input.visitId,
          'SUCCESS',
          selectedPack,
          subscriptionUrl,
        );
      }

      this.logger.warn(
        `transition result: FAILED → ERROR visitId=${input.visitId}`,
      );
      await this.analyticsService.updateVisit(
        input.visitId,
        VisitStatus.FAILED,
        CampaignPageType.ERROR,
      );
      await this.analyticsService.logEvent(
        input.visitId,
        VisitEventType.SUBSCRIBE_FAILED,
        {
          pack: selectedPack,
        },
      );
      return this.buildPageResponse(
        campaign,
        CampaignPageType.ERROR,
        confirmVariables,
        input.visitId,
        'FAILED',
        selectedPack,
        subscriptionUrl,
      );
    }

    if (
      input.fromPage === CampaignPageType.OTP &&
      input.action === 'CONTINUE'
    ) {
      if (!phone) {
        throw new BadRequestException('Phone number is required to transition from OTP page');
      }

      const verifiedOtp = await this.otpRepository.findOne({
        where: {
          phone,
          visitId: input.visitId,
          status: 'verified',
        },
      });

      if (!verifiedOtp) {
        throw new ForbiddenException('Phone number has not been verified with OTP');
      }

      this.logger.log(`OTP transition verified for visitId=${input.visitId} phone=${phone}`);

      await this.analyticsService.logEvent(
        input.visitId,
        VisitEventType.CONFIRM_VIEW,
        { info: 'Transition from OTP verified successfully' }
      );

      await this.analyticsService.updateVisit(
        input.visitId,
        VisitStatus.CONFIRM_SHOWN,
        CampaignPageType.CONFIRM,
      );

      const variables = {
        phone,
        country: campaign.country,
        operator: campaign.operator,
        service_id: serviceId,
        plan: '',
      };

      return this.buildPageResponse(
        campaign,
        CampaignPageType.CONFIRM,
        variables,
        input.visitId,
      );
    }

    throw new BadRequestException('Invalid page transition');
  }

  private getActions(pageType: CampaignPageType): string[] {
    if (pageType === CampaignPageType.HOME) return ['SUBSCRIBE'];
    if (pageType === CampaignPageType.OTP) return ['OTP_SEND', 'OTP_VERIFY'];
    if (pageType === CampaignPageType.CONFIRM) return ['CONFIRM'];
    return [];
  }

  private normalizePack(pack?: string): string {
    const value = (pack || 'daily').toLowerCase();
    if (value === 'weekly' || value === 'monthly') return value;
    return 'daily';
  }

  private formatPlanLabel(pack?: string): string {
    const normalized = this.normalizePack(pack);
    if (normalized === 'weekly') return 'Weekly Pack';
    if (normalized === 'monthly') return 'Monthly Pack';
    return 'Daily Pack';
  }

  private buildSubscriptionUrl(
    campaign: { country: string; operator: string },
    pack: string,
  ): string {
    const params = new URLSearchParams({
      country: campaign.country,
      operator: campaign.operator,
      pack,
    });
    return `/subscription?${params.toString()}`;
  }

  private buildPageResponse(
    campaign: Awaited<ReturnType<CampaignsService['findByCountryOperator']>>,
    pageType: CampaignPageType,
    variables: Record<string, string>,
    visitId: number,
    status?: string,
    pack?: string,
    subscriptionUrl?: string,
  ) {
    const page = campaign!.pages.find((p) => p.pageType === pageType);
    if (!page?.template) {
      throw new NotFoundException(`Page ${pageType} not configured`);
    }
    const templateData = page.template.data || {};
    const resolvedPack = pack ? this.normalizePack(pack) : undefined;
    const resolvedSubscriptionUrl =
      subscriptionUrl ||
      (resolvedPack
        ? this.buildSubscriptionUrl(campaign!, resolvedPack)
        : undefined);
    return {
      campaignId: campaign!.id,
      visitId,
      pageType,
      status: status || pageType,
      templateId: page.templateId,
      html: this.variableResolver.replaceVariables(
        templateData.html || '',
        variables,
      ),
      css: templateData.css || '',
      variables,
      actions: this.getActions(pageType),
      pack: resolvedPack,
      subscriptionUrl: resolvedSubscriptionUrl,
    };
  }
}
