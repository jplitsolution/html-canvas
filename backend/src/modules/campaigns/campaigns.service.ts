import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import {
  ALL_CAMPAIGN_PAGE_TYPES,
  CampaignPage,
  CampaignPageType,
  REQUIRED_CAMPAIGN_PAGE_TYPES,
} from './entities/campaign-page.entity';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  UpdateFlowDto,
} from './dto/create-campaign.dto';
import { UpdateCampaignPageDto } from './dto/update-campaign-page.dto';
import { Template } from '../templates/entities/template.entity';
import { ApiConfig } from '../api-config/entities/api-config.entity';
import { CampaignTracking } from './entities/campaign-tracking.entity';
import { getDefaultFunnelPageData } from '../../database/seed/default-funnel-pages';
import {
  FlowConfig,
  FlowEngineService,
  VerificationMode,
} from '../flow/flow-engine.service';
import { MarketsService } from '../markets/markets.service';
import {
  buildTrackingId,
  deriveCountryCode,
  deriveOperatorCode,
} from '../markets/tracking-id.util';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private readonly flowEngine = new FlowEngineService();

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignPage)
    private readonly campaignPageRepository: Repository<CampaignPage>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(ApiConfig)
    private readonly apiConfigRepository: Repository<ApiConfig>,
    @InjectRepository(CampaignTracking)
    private readonly trackingRepository: Repository<CampaignTracking>,
    @Inject(forwardRef(() => MarketsService))
    private readonly marketsService: MarketsService,
    private readonly redis: RedisService,
  ) {}

  private async invalidateFlowCampaignCache(campaign: Campaign): Promise<void> {
    const keys = [
      `flow:campaign:id:${campaign.id}`,
      campaign.trackingId ? `flow:campaign:id:${campaign.trackingId}` : null,
      `flow:campaign:co:${String(campaign.country).toLowerCase()}:${String(campaign.operator).toLowerCase()}`,
    ].filter(Boolean) as string[];
    await Promise.all(keys.map((k) => this.redis.del(k)));
  }

  private normalize(value: string): string {
    return value.trim();
  }

  private withTrackingId(campaign: Campaign): Campaign {
    const cc = campaign.marketOperator?.country?.code;
    const oc = campaign.marketOperator?.code;
    if (cc && oc) {
      campaign.trackingId = buildTrackingId(cc, oc, campaign.id);
    }
    return campaign;
  }

  async findAll(userId: number): Promise<Campaign[]> {
    const campaigns = await this.campaignRepository.find({
      where: { userId },
      relations: {
        pages: { template: true },
        trackings: { vendor: true, affiliate: true },
        marketOperator: { country: true },
      },
      order: { updatedAt: 'DESC' },
    });
    return campaigns.map((c) =>
      this.sanitizeCampaignListItem(this.withTrackingId(c)),
    );
  }

  async findOne(id: number, userId: number): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: {
        pages: { template: true },
        trackings: { vendor: true, affiliate: true },
        marketOperator: { country: true },
      },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }
    if (campaign.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this campaign',
      );
    }
    await this.ensureCampaignPages(campaign);
    return this.sanitizeCampaignListItem(this.withTrackingId(campaign));
  }

  /**
   * Legacy country/operator lookup. If multiple campaigns match, prefer the
   * single active one; otherwise return null so callers require campid.
   */
  async findByCountryOperator(
    country: string,
    operator: string,
  ): Promise<Campaign | null> {
    const normalizedCountry = this.normalize(country);
    const normalizedOperator = this.normalize(operator);

    const campaigns = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.pages', 'pages')
      .leftJoinAndSelect('pages.template', 'template')
      .leftJoinAndSelect('campaign.trackings', 'trackings')
      .leftJoinAndSelect('trackings.vendor', 'vendor')
      .leftJoinAndSelect('trackings.affiliate', 'affiliate')
      .leftJoinAndSelect('campaign.marketOperator', 'marketOperator')
      .leftJoinAndSelect('marketOperator.country', 'marketCountry')
      .where('LOWER(campaign.country) = LOWER(:country)', {
        country: normalizedCountry,
      })
      .andWhere('LOWER(campaign.operator) = LOWER(:operator)', {
        operator: normalizedOperator,
      })
      .getMany();

    if (campaigns.length === 0) return null;

    let campaign: Campaign | null = null;
    if (campaigns.length === 1) {
      campaign = campaigns[0];
    } else {
      const actives = campaigns.filter((c) => c.active);
      if (actives.length === 1) {
        campaign = actives[0];
      } else {
        this.logger.warn(
          `Ambiguous country/operator lookup for ${normalizedCountry}/${normalizedOperator}: ${campaigns.length} campaigns — require campid`,
        );
        return null;
      }
    }

    if (campaign) {
      await this.ensureCampaignPages(campaign);
      return this.withTrackingId(campaign);
    }
    return null;
  }

  /**
   * Public (unauthenticated) campaign lookup by id, used by the flow runtime
   * when the tracking URL carries a `campid` param. Returns null if not found.
   */
  async findByIdForFlow(id: number): Promise<Campaign | null> {
    if (!id || Number.isNaN(id)) return null;
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: {
        pages: { template: true },
        trackings: { vendor: true, affiliate: true },
        marketOperator: { country: true },
      },
    });
    if (campaign) {
      await this.ensureCampaignPages(campaign);
      return this.withTrackingId(campaign);
    }
    return null;
  }

  /**
   * Resolve by composite tracking id (IN-AIRTEL-12). Verifies codes match.
   */
  async findByTrackingId(
    countryCode: string,
    operatorCode: string,
    campaignId: number,
  ): Promise<Campaign | null> {
    const campaign = await this.findByIdForFlow(campaignId);
    if (!campaign) return null;
    const cc = campaign.marketOperator?.country?.code?.toUpperCase();
    const oc = campaign.marketOperator?.code?.toUpperCase();
    if (cc && oc) {
      if (
        cc !== countryCode.toUpperCase() ||
        oc !== operatorCode.toUpperCase()
      ) {
        this.logger.warn(
          `Tracking id mismatch: expected ${cc}-${oc}-${campaignId}, got ${countryCode}-${operatorCode}-${campaignId}`,
        );
        return null;
      }
    }
    return campaign;
  }

  private async ensureCampaignPages(campaign: Campaign): Promise<void> {
    const existingPageTypes = new Set(
      (campaign.pages || []).map((p) => p.pageType),
    );

    for (const pageType of ALL_CAMPAIGN_PAGE_TYPES) {
      if (!existingPageTypes.has(pageType)) {
        try {
          const template = await this.templateRepository.save(
            this.templateRepository.create({
              name: `${campaign.name} - ${pageType}`,
              data: getDefaultFunnelPageData(pageType),
              userId: campaign.userId,
              isPrebuilt: false,
            }),
          );

          const newPage = await this.campaignPageRepository.save(
            this.campaignPageRepository.create({
              campaignId: campaign.id,
              pageType,
              templateId: template.id,
            }),
          );

          newPage.template = template;
          if (!campaign.pages) {
            campaign.pages = [];
          }
          campaign.pages.push(newPage);
          this.logger.log(
            `Auto-created missing page type ${pageType} for campaign ${campaign.id}`,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to auto-create page type ${pageType} for campaign ${campaign.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          const dbPage = await this.campaignPageRepository.findOne({
            where: { campaignId: campaign.id, pageType },
            relations: { template: true },
          });
          if (dbPage) {
            if (!campaign.pages) {
              campaign.pages = [];
            }
            campaign.pages.push(dbPage);
          }
        }
      }
    }
  }

  async create(dto: CreateCampaignDto, userId: number): Promise<Campaign> {
    const { country, operator } =
      await this.marketsService.resolveOperatorForCreate({
        userId,
        operatorId: dto.operatorId,
        countryCode:
          dto.countryCode ||
          (dto.country ? deriveCountryCode(dto.country) : undefined),
        operatorCode:
          dto.operatorCode ||
          (dto.operator ? deriveOperatorCode(dto.operator) : undefined),
        countryName: dto.country,
        operatorName: dto.operator,
      });

    const countryName = this.normalize(dto.country || country.name);
    const operatorName = this.normalize(dto.operator || operator.name);

    const nameConflict = await this.campaignRepository.findOne({
      where: { operatorId: operator.id, name: dto.name.trim() },
    });
    if (nameConflict) {
      throw new ConflictException(
        `Campaign "${dto.name.trim()}" already exists for ${country.code} / ${operator.code}`,
      );
    }

    let sourcePages: CampaignPage[] = [];
    if (dto.copyFromCampaignId) {
      const source = await this.campaignRepository.findOne({
        where: { id: dto.copyFromCampaignId, userId },
        relations: { pages: { template: true } },
      });
      if (!source) {
        throw new NotFoundException(
          `Source campaign ${dto.copyFromCampaignId} not found`,
        );
      }
      sourcePages = source.pages || [];
    }

    const defaultMode: VerificationMode = 'BOTH';
    const campaign = await this.campaignRepository.save(
      this.campaignRepository.create({
        name: dto.name.trim(),
        country: countryName,
        operator: operatorName,
        operatorId: operator.id,
        serviceId: dto.serviceId,
        userId,
        active: false,
        verificationMode: defaultMode,
        flowConfig: JSON.stringify(
          this.flowEngine.getDefaultFlowConfig(defaultMode),
        ),
      }),
    );

    for (const pageType of ALL_CAMPAIGN_PAGE_TYPES) {
      const sourcePage = sourcePages.find((p) => p.pageType === pageType);
      let template: Template;

      if (sourcePage?.template) {
        template = await this.templateRepository.save(
          this.templateRepository.create({
            name: `${campaign.name} - ${pageType}`,
            data: { ...sourcePage.template.data },
            userId,
            isPrebuilt: false,
          }),
        );
      } else {
        template = await this.templateRepository.save(
          this.templateRepository.create({
            name: `${campaign.name} - ${pageType}`,
            data: getDefaultFunnelPageData(pageType),
            userId,
            isPrebuilt: false,
          }),
        );
      }

      await this.campaignPageRepository.save(
        this.campaignPageRepository.create({
          campaignId: campaign.id,
          pageType,
          templateId: template.id,
        }),
      );
    }

    return this.sanitizeCampaignListItem(
      await this.findOne(campaign.id, userId),
    );
  }

  async update(
    id: number,
    dto: UpdateCampaignDto,
    userId: number,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id, userId);

    if (dto.active === true) {
      const flowConfig = this.flowEngine.parseFlowConfig(campaign.flowConfig);
      const requiredTypes =
        flowConfig && flowConfig.nodes
          ? flowConfig.nodes.map((n) => n.pageType)
          : REQUIRED_CAMPAIGN_PAGE_TYPES;

      const missing = requiredTypes.filter((type) => {
        const page = campaign.pages.find((p) => p.pageType === type);
        return !page || !this.pageHasContent(page);
      });
      if (missing.length > 0) {
        throw new BadRequestException(
          `Cannot activate campaign. Missing content for: ${missing.join(', ')}`,
        );
      }
    }

    if (dto.name !== undefined) campaign.name = dto.name.trim();
    if (dto.serviceId !== undefined) campaign.serviceId = dto.serviceId;
    if (dto.active !== undefined) campaign.active = dto.active;
    if (dto.trackings !== undefined) {
      await this.trackingRepository.delete({ campaignId: campaign.id });
      if (dto.trackings && dto.trackings.length > 0) {
        await this.trackingRepository.insert(
          dto.trackings.map((t) => ({
            campaignId: campaign.id,
            vendorId: Number(t.vendorId),
            affiliateId:
              t.affiliateId == null || Number.isNaN(Number(t.affiliateId))
                ? null
                : Number(t.affiliateId),
            active:
              t.active === undefined || t.active === null ? true : !!t.active,
          })),
        );
      }
    } else if (dto.vendorIds !== undefined) {
      await this.trackingRepository.delete({ campaignId: campaign.id });
      if (dto.vendorIds && dto.vendorIds.length > 0) {
        await this.trackingRepository.insert(
          dto.vendorIds.map((vid) => ({
            campaignId: campaign.id,
            vendorId: Number(vid),
            affiliateId: null,
            active: true,
          })),
        );
      }
    }

    delete (campaign as any).trackings;
    await this.campaignRepository.save(campaign);
    const refreshed = this.sanitizeCampaignListItem(
      await this.findOne(id, userId),
    );
    await this.invalidateFlowCampaignCache(refreshed);
    return refreshed;
  }

  async getFlow(
    id: number,
    userId: number,
  ): Promise<{ verificationMode: VerificationMode; flowConfig: FlowConfig }> {
    const campaign = await this.findOne(id, userId);
    const mode =
      this.flowEngine.normalizeMode(campaign.verificationMode) || 'BOTH';
    const flowConfig =
      this.flowEngine.parseFlowConfig(campaign.flowConfig) ||
      this.flowEngine.getDefaultFlowConfig(mode);
    return { verificationMode: mode, flowConfig };
  }

  async updateFlow(
    id: number,
    dto: UpdateFlowDto,
    userId: number,
  ): Promise<{ verificationMode: VerificationMode; flowConfig: FlowConfig }> {
    const campaign = await this.findOne(id, userId);

    const mode =
      this.flowEngine.normalizeMode(dto.verificationMode) ||
      this.flowEngine.normalizeMode(campaign.verificationMode) ||
      'BOTH';

    let flowConfig: FlowConfig;
    if (dto.flowConfig) {
      flowConfig = this.flowEngine.stripUnreachableNodes(
        dto.flowConfig as unknown as FlowConfig,
        mode,
      );
      const { ok, errors } = this.flowEngine.validate(flowConfig, mode);
      if (!ok) {
        throw new BadRequestException(`Invalid flow: ${errors.join(' ')}`);
      }
    } else {
      flowConfig =
        this.flowEngine.parseFlowConfig(campaign.flowConfig) ||
        this.flowEngine.getDefaultFlowConfig(mode);
    }

    campaign.verificationMode = mode;
    campaign.flowConfig = JSON.stringify(flowConfig);
    await this.campaignRepository.save(campaign);
    return { verificationMode: mode, flowConfig };
  }

  async remove(id: number, userId: number): Promise<void> {
    const campaign = await this.findOne(id, userId);
    campaign.active = false;
    await this.campaignRepository.save(campaign);
  }

  async applyDefaultTemplates(
    id: number,
    userId: number,
    onlyEmpty = true,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id, userId);

    for (const page of campaign.pages) {
      const hasContent = this.pageHasContent(page);
      if (onlyEmpty && hasContent) continue;
      if (!page.templateId) continue;

      const template = await this.templateRepository.findOne({
        where: { id: page.templateId },
      });
      if (!template) continue;

      template.data = getDefaultFunnelPageData(page.pageType);
      await this.templateRepository.save(template);
    }

    return this.findOne(id, userId);
  }

  async getPage(
    campaignId: number,
    pageType: CampaignPageType,
    userId: number,
  ): Promise<CampaignPage> {
    const campaign = await this.findOne(campaignId, userId);
    const page = campaign.pages.find((p) => p.pageType === pageType);
    if (!page) {
      throw new NotFoundException(
        `Page type ${pageType} not found for campaign`,
      );
    }
    return page;
  }

  async updatePageContent(
    campaignId: number,
    pageType: CampaignPageType,
    dto: UpdateCampaignPageDto,
    userId: number,
  ): Promise<CampaignPage> {
    const page = await this.getPage(campaignId, pageType, userId);
    if (!page.templateId) {
      throw new NotFoundException('Template not linked to this page');
    }

    const template = await this.templateRepository.findOne({
      where: { id: page.templateId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const data = { ...(template.data || {}) };
    if (dto.projectData !== undefined) data.projectData = dto.projectData;
    if (dto.html !== undefined) data.html = dto.html;
    if (dto.css !== undefined) data.css = dto.css;
    data.editor = 'grapesjs';

    template.data = data;
    await this.templateRepository.save(template);

    return this.getPage(campaignId, pageType, userId);
  }

  async getApiConfig(
    campaignId: number,
    userId: number,
  ): Promise<ApiConfig | null> {
    await this.findOne(campaignId, userId);
    return this.apiConfigRepository.findOne({ where: { campaignId } });
  }

  async upsertApiConfig(
    campaignId: number,
    payload: Partial<ApiConfig>,
    userId: number,
  ): Promise<ApiConfig> {
    await this.findOne(campaignId, userId);

    let config = await this.apiConfigRepository.findOne({
      where: { campaignId },
    });
    if (!config) {
      config = this.apiConfigRepository.create({ campaignId, ...payload });
    } else {
      Object.assign(config, payload);
    }
    return this.apiConfigRepository.save(config);
  }

  pageHasContent(page: CampaignPage): boolean {
    const html = page.template?.data?.html;
    return typeof html === 'string' && html.trim().length > 0;
  }

  private sanitizeCampaignListItem(campaign: Campaign): Campaign {
    if (campaign.pages) {
      campaign.pages = campaign.pages.map((page) => {
        if (page.template?.data) {
          page.template.data = {
            ...page.template.data,
            projectData: undefined,
            html: page.template.data.html ? '[saved]' : '',
            css: page.template.data.css ? '[saved]' : '',
          };
        }
        return page;
      });
    }
    return campaign;
  }
}
