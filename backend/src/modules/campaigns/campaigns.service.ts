import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
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
import { getDefaultFunnelPageData } from '../../database/seed/default-funnel-pages';
import {
  FlowConfig,
  FlowEngineService,
  VerificationMode,
} from '../flow/flow-engine.service';

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
  ) {}

  private normalize(value: string): string {
    return value.trim();
  }

  async findAll(userId: number): Promise<Campaign[]> {
    const campaigns = await this.campaignRepository.find({
      where: { userId },
      relations: { pages: { template: true } },
      order: { updatedAt: 'DESC' },
    });
    return campaigns.map((c) => this.sanitizeCampaignListItem(c));
  }

  async findOne(id: number, userId: number): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: { pages: { template: true } },
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
    return campaign;
  }

  async findByCountryOperator(
    country: string,
    operator: string,
  ): Promise<Campaign | null> {
    const normalizedCountry = this.normalize(country);
    const normalizedOperator = this.normalize(operator);

    const campaign = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.pages', 'pages')
      .leftJoinAndSelect('pages.template', 'template')
      .where('LOWER(campaign.country) = LOWER(:country)', {
        country: normalizedCountry,
      })
      .andWhere('LOWER(campaign.operator) = LOWER(:operator)', {
        operator: normalizedOperator,
      })
      .getOne();

    if (campaign) {
      await this.ensureCampaignPages(campaign);
    }
    return campaign;
  }

  /**
   * Public (unauthenticated) campaign lookup by id, used by the flow runtime
   * when the tracking URL carries a `campid` param. Returns null if not found.
   */
  async findByIdForFlow(id: number): Promise<Campaign | null> {
    if (!id || Number.isNaN(id)) return null;
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: { pages: { template: true } },
    });
    if (campaign) {
      await this.ensureCampaignPages(campaign);
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
    const country = this.normalize(dto.country);
    const operator = this.normalize(dto.operator);

    const existing = await this.campaignRepository.findOne({
      where: { country, operator },
    });
    if (existing) {
      throw new ConflictException(
        `Campaign already exists for ${country} / ${operator}`,
      );
    }

    let sourcePages: CampaignPage[] = [];
    if (dto.copyFromCampaignId) {
      const source = await this.findOne(dto.copyFromCampaignId, userId);
      sourcePages = source.pages || [];
    }

    const defaultMode: VerificationMode = 'BOTH';
    const campaign = await this.campaignRepository.save(
      this.campaignRepository.create({
        name: dto.name.trim(),
        country,
        operator,
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

    return this.findOne(campaign.id, userId);
  }

  async update(
    id: number,
    dto: UpdateCampaignDto,
    userId: number,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id, userId);

    if (dto.active === true) {
      const missing = REQUIRED_CAMPAIGN_PAGE_TYPES.filter((type) => {
        const page = campaign.pages.find((p) => p.pageType === type);
        return !page?.template?.data?.html;
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
    if (dto.vendorId !== undefined) campaign.vendorId = dto.vendorId ?? undefined;

    await this.campaignRepository.save(campaign);
    return this.findOne(id, userId);
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
      flowConfig = dto.flowConfig as unknown as FlowConfig;
      const { ok, errors } = this.flowEngine.validate(flowConfig, mode);
      if (!ok) {
        throw new BadRequestException(
          `Invalid flow: ${errors.join(' ')}`,
        );
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
    await this.campaignRepository.remove(campaign);
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
