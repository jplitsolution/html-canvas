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
import { Campaign } from '../campaigns/entities/campaign.entity';
import { PartnerApiService } from './partner-api.service';
import { PartnersService } from '../partners/partners.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { VisitStatus } from '../analytics/entities/visit.entity';
import { VisitEventType } from '../analytics/entities/visit-event.entity';
import { VariableResolverService } from '../../common/services/variable-resolver.service';
import {
  FlowEngineService,
  VerificationMode,
} from './flow-engine.service';
import { ApiConfig } from '../api-config/entities/api-config.entity';
import { OtpRequest } from '../otp/entities/otp-request.entity';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class FlowService {
  private readonly logger = new Logger(FlowService.name);

  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly partnerApiService: PartnerApiService,
    private readonly partnersService: PartnersService,
    private readonly analyticsService: AnalyticsService,
    private readonly variableResolver: VariableResolverService,
    private readonly flowEngine: FlowEngineService,
    private readonly redis: RedisService,
    @InjectRepository(ApiConfig)
    private readonly apiConfigRepository: Repository<ApiConfig>,
    @InjectRepository(OtpRequest)
    private readonly otpRepository: Repository<OtpRequest>,
  ) {}

  /**
   * Resolve the campaign for a public flow request. Prefers the explicit
   * `campid` tracking param, falling back to the legacy country/operator lookup.
   */
  private async resolveCampaign(input: {
    country: string;
    operator: string;
    campid?: string;
  }) {
    const cacheKey = input.campid
      ? `flow:campaign:id:${input.campid}`
      : `flow:campaign:co:${String(input.country).toLowerCase()}:${String(input.operator).toLowerCase()}`;

    const cached = await this.redis.get<Campaign>(cacheKey);
    if (cached) return cached;

    let campaign: Campaign | null = null;
    if (input.campid) {
      campaign = await this.campaignsService.findByIdForFlow(
        Number(input.campid),
      );
    }
    if (!campaign) {
      campaign = await this.campaignsService.findByCountryOperator(
        input.country,
        input.operator,
      );
    }

    if (campaign) {
      await this.redis.set(cacheKey, campaign, 15);
      if (!input.campid) {
        await this.redis.set(`flow:campaign:id:${campaign.id}`, campaign, 15);
      }
    }
    return campaign;
  }

  /**
   * Verification-mode-aware routing for HOME + SUBSCRIBE.
   * - MSISDN_ONLY: resolve number (header or ISP API); resolved -> CONFIRM edge, else -> ERROR.
   * - OTP_ONLY: always route to OTP.
   * - BOTH: resolve to prefill if possible, but always require OTP.
   */
  private async resolveHomeSubscribeNext(
    mode: VerificationMode,
    flowConfig: ReturnType<FlowEngineService['parseFlowConfig']>,
    campaign: { country: string; operator: string },
    apiConfig: ApiConfig | null,
    ctx: { phone: string; headerPhoneDetected: boolean; visitId: number },
  ): Promise<CampaignPageType> {
    const fromGraph = (
      condition: Parameters<FlowEngineService['nextPage']>[2],
      fallback: CampaignPageType,
    ): CampaignPageType =>
      this.flowEngine.nextPage(flowConfig, CampaignPageType.HOME, condition) ||
      fallback;

    if (mode === 'MSISDN_ONLY') {
      let resolved = ctx.headerPhoneDetected || Boolean(ctx.phone);
      if (!resolved) {
        const isp = await this.partnerApiService.resolveMsisdn(apiConfig, {
          country: campaign.country,
          operator: campaign.operator,
          hint: ctx.phone,
        });
        if (isp) {
          resolved = true;
          await this.analyticsService.setVisitPhone(ctx.visitId, isp);
        }
      }
      return resolved
        ? fromGraph('MSISDN_RESOLVED', CampaignPageType.CONFIRM)
        : fromGraph('MSISDN_UNRESOLVED', CampaignPageType.ERROR);
    }

    if (mode === 'BOTH' && !ctx.headerPhoneDetected && !ctx.phone) {
      // Attempt to prefill the number, but OTP is still required.
      const isp = await this.partnerApiService.resolveMsisdn(apiConfig, {
        country: campaign.country,
        operator: campaign.operator,
        hint: ctx.phone,
      });
      if (isp) {
        await this.analyticsService.setVisitPhone(ctx.visitId, isp);
      }
    }

    // OTP_ONLY and BOTH both require OTP.
    return fromGraph('DEFAULT', CampaignPageType.OTP);
  }

  async getPage(input: {
    country: string;
    operator: string;
    pageType: CampaignPageType;
    phone?: string;
    visitId?: number;
    pack?: string;
    campid?: string;
    vid?: string;
    affId?: string;
    clickId?: string;
    ipAddress?: string;
    userAgent?: string;
    landingUrl?: string;
  }) {
    this.logger.log(
      `GET page | country=${input.country} operator=${input.operator} page=${input.pageType} phone=${input.phone || '(empty)'}`,
    );

    const campaign = await this.resolveCampaign(input);
    if (!campaign) {
      this.logger.warn(
        `Campaign not found: campid=${input.campid || 'n/a'} ${input.country} / ${input.operator}`,
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

    const apiConfigCacheKey = `flow:config:${campaign.id}`;
    let apiConfig = await this.redis.get<ApiConfig>(apiConfigCacheKey);
    if (apiConfig === null) {
      apiConfig = await this.apiConfigRepository.findOne({
        where: { campaignId: campaign.id },
      });
      await this.redis.set(apiConfigCacheKey, apiConfig ?? '__NULL__', 15);
    } else if ((apiConfig as any) === '__NULL__') {
      apiConfig = null;
    }

    const flowConfig = this.flowEngine.parseFlowConfig(campaign.flowConfig);
    const entryPage = this.flowEngine.getEntryPage(flowConfig);

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

    // Enforce Route Guards for page access
    const providerConfigured =
      apiConfig && apiConfig.otpProvider && apiConfig.otpProvider.trim() !== '';
    const guardMode = this.flowEngine.normalizeMode(campaign.verificationMode);
    // OTP verification is required for legacy provider setups and for the
    // OTP_ONLY / BOTH verification modes. MSISDN_ONLY never gates on OTP.
    const isOtpEnabled = guardMode
      ? guardMode === 'OTP_ONLY' || guardMode === 'BOTH'
      : providerConfigured;
    if (isOtpEnabled) {
      if (resolvedPageType === CampaignPageType.CONFIRM || resolvedPageType === CampaignPageType.THANKYOU) {
        let isVerified = false;
        if (visitId && phone) {
          const verifiedOtp = await this.otpRepository.findOne({
            where: {
              phone,
              visitId,
              status: 'verified',
            },
          });
          if (verifiedOtp) {
            isVerified = true;
          }
        }

        if (!isVerified) {
          // If already subscribed according to partner API, we can still show THANKYOU
          const subscribed = await this.partnerApiService.checkSubscription(
            apiConfig,
            {
              phone,
              serviceId,
              country: campaign.country,
              operator: campaign.operator,
            },
          ).catch(() => false);

          if (subscribed) {
            resolvedPageType = CampaignPageType.THANKYOU;
          } else {
            resolvedPageType = phone ? CampaignPageType.OTP : entryPage;
            this.logger.warn(`Route Guard: Access to ${input.pageType} blocked for visitId=${visitId || 'n/a'}. Redirecting to ${resolvedPageType}`);
          }
        }
      }
    } else {
      if (resolvedPageType === CampaignPageType.CONFIRM && !phone) {
        resolvedPageType = entryPage;
      }
      if (resolvedPageType === CampaignPageType.THANKYOU) {
        const subscribed = await this.partnerApiService.checkSubscription(
          apiConfig,
          {
            phone,
            serviceId,
            country: campaign.country,
            operator: campaign.operator,
          },
        ).catch(() => false);
        if (!subscribed) {
          resolvedPageType = phone ? CampaignPageType.CONFIRM : entryPage;
        }
      }
    }

    if (!visitId) {
      const attrCacheKey = `flow:attr:${input.vid}:${input.affId}`;
      let attribution = await this.redis.get<any>(attrCacheKey);
      if (!attribution) {
        attribution = await this.partnersService
          .resolveAttribution(input.vid, input.affId)
          .catch(() => ({
            vendorId: undefined,
            affiliateId: undefined,
            mismatch: false,
          }));
        await this.redis.set(attrCacheKey, attribution, 15);
      }
      if (attribution.mismatch) {
        this.logger.warn(
          `Attribution mismatch: aff_id=${input.affId} does not belong to vid=${input.vid}`,
        );
      }
      const visit = await this.analyticsService.createVisit({
        campaignId: campaign.id,
        phone: phone || undefined,
        country: campaign.country,
        operator: campaign.operator,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        landingUrl: input.landingUrl,
        visitStatus: VisitStatus.VISIT,
        pageType: resolvedPageType,
        vendorId: attribution.vendorId,
        affiliateId: attribution.affiliateId,
        clickId: input.clickId,
        vidRaw: input.vid,
        affRaw: input.affId,
      });
      visitId = visit.id;

      let eventType = VisitEventType.HOME_VIEW;
      if (resolvedPageType === CampaignPageType.OTP) {
        eventType = VisitEventType.OTP_VIEW;
      } else if (resolvedPageType === CampaignPageType.CONFIRM) {
        eventType = VisitEventType.CONFIRM_VIEW;
      }
      await this.analyticsService.logEvent(visitId, eventType);

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
          phone,
        );
        await this.analyticsService.logEvent(
          visitId,
          VisitEventType.SUBSCRIBE_SUCCESS,
          {
            info: 'Already subscribed',
          },
        );
      } else {
        let visitStatus = VisitStatus.HOME_SHOWN;
        if (resolvedPageType === CampaignPageType.OTP) {
          visitStatus = VisitStatus.OTP_SHOWN;
        } else if (resolvedPageType === CampaignPageType.CONFIRM) {
          visitStatus = VisitStatus.CONFIRM_SHOWN;
        }
        await this.analyticsService.updateVisit(
          visitId,
          visitStatus,
          resolvedPageType,
          phone,
        );
      }
    } else if (visitId && phone) {
      await this.analyticsService.setVisitPhone(visitId, phone);
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
      entryPage,
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

      const mode = this.flowEngine.normalizeMode(campaign.verificationMode);
      const flowConfig = this.flowEngine.parseFlowConfig(campaign.flowConfig);

      let nextPage: CampaignPageType;
      if (mode) {
        // New engine: verification-mode driven routing (graph-aware).
        nextPage = await this.resolveHomeSubscribeNext(
          mode,
          flowConfig,
          campaign,
          apiConfig,
          { phone, headerPhoneDetected, visitId: input.visitId },
        );
      } else if (isOtpEnabled) {
        nextPage = headerPhoneDetected ? CampaignPageType.CONFIRM : CampaignPageType.OTP;
      } else {
        nextPage = phone ? CampaignPageType.CONFIRM : CampaignPageType.OTP;
      }

      const nextStatus =
        nextPage === CampaignPageType.CONFIRM
          ? VisitStatus.CONFIRM_SHOWN
          : nextPage === CampaignPageType.OTP
            ? VisitStatus.OTP_SHOWN
            : VisitStatus.HOME_SHOWN;

      await this.analyticsService.updateVisit(
        input.visitId,
        nextStatus,
        nextPage,
        phone,
      );
      if (nextPage === CampaignPageType.CONFIRM) {
        await this.analyticsService.logEvent(
          input.visitId,
          VisitEventType.CONFIRM_VIEW,
        );
      } else if (nextPage === CampaignPageType.OTP) {
        await this.analyticsService.logEvent(
          input.visitId,
          VisitEventType.OTP_VIEW,
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

      const flowConfig = this.flowEngine.parseFlowConfig(campaign.flowConfig);

      if (blockResult.blocked) {
        const nextPage = this.flowEngine.nextPage(
          flowConfig,
          CampaignPageType.CONFIRM,
          'BLOCKED',
        ) || CampaignPageType.BLOCKED;

        await this.analyticsService.updateVisit(
          input.visitId,
          VisitStatus.BLOCKED,
          nextPage,
          phone,
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
          nextPage,
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
        const nextPage = this.flowEngine.nextPage(
          flowConfig,
          CampaignPageType.CONFIRM,
          'SUBSCRIBED',
        ) || CampaignPageType.THANKYOU;

        await this.analyticsService.updateVisit(
          input.visitId,
          VisitStatus.SUBSCRIBED,
          nextPage,
          phone,
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
          nextPage,
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
        const nextPage = this.flowEngine.nextPage(
          flowConfig,
          CampaignPageType.CONFIRM,
          'SUBSCRIBED',
        ) || CampaignPageType.THANKYOU;

        this.logger.log(
          `transition result: SUCCESS → ${nextPage} visitId=${input.visitId} pack=${selectedPack}`,
        );
        await this.analyticsService.updateVisit(
          input.visitId,
          VisitStatus.SUCCESS,
          nextPage,
          phone,
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
          nextPage,
          confirmVariables,
          input.visitId,
          'SUCCESS',
          selectedPack,
          subscriptionUrl,
        );
      }

      const nextPage = this.flowEngine.nextPage(
        flowConfig,
        CampaignPageType.CONFIRM,
        'ERROR',
      ) || CampaignPageType.ERROR;

      this.logger.warn(
        `transition result: FAILED → ${nextPage} visitId=${input.visitId}`,
      );
      await this.analyticsService.updateVisit(
        input.visitId,
        VisitStatus.FAILED,
        nextPage,
        phone,
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
        nextPage,
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

      const flowConfig = this.flowEngine.parseFlowConfig(campaign.flowConfig);
      const nextPage = this.flowEngine.nextPage(
        flowConfig,
        CampaignPageType.OTP,
        'OTP_VERIFIED',
      ) || CampaignPageType.CONFIRM;

      this.logger.log(`OTP transition verified for visitId=${input.visitId} phone=${phone} → nextPage=${nextPage}`);

      await this.analyticsService.logEvent(
        input.visitId,
        nextPage === CampaignPageType.CONFIRM ? VisitEventType.CONFIRM_VIEW : VisitEventType.HOME_VIEW,
        { info: 'Transition from OTP verified successfully' }
      );

      const nextStatus =
        nextPage === CampaignPageType.CONFIRM
          ? VisitStatus.CONFIRM_SHOWN
          : nextPage === CampaignPageType.THANKYOU
            ? VisitStatus.SUCCESS
            : VisitStatus.HOME_SHOWN;

      await this.analyticsService.updateVisit(
        input.visitId,
        nextStatus,
        nextPage,
        phone,
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
        nextPage,
        variables,
        input.visitId,
      );
    }

    throw new BadRequestException('Invalid page transition');
  }

  async getFlowEntry(input: {
    country: string;
    operator: string;
    campid?: string;
  }) {
    const campaign = await this.resolveCampaign(input);
    if (!campaign) {
      throw new NotFoundException(
        `No campaign found for ${input.country} / ${input.operator}`,
      );
    }
    const flowConfig = this.flowEngine.parseFlowConfig(campaign.flowConfig);
    return {
      campaignId: campaign.id,
      entryPage: this.flowEngine.getEntryPage(flowConfig),
    };
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
      entryPage: this.flowEngine.getEntryPage(
        this.flowEngine.parseFlowConfig(campaign!.flowConfig),
      ),
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
