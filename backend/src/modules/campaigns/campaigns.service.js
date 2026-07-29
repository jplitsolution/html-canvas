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
  REQUIRED_CAMPAIGN_PAGE_TYPES,
} from './entities/campaign-page.entity';
import { Template } from '../templates/entities/template.entity';
import { ApiConfig } from '../api-config/entities/api-config.entity';
import { CampaignTracking } from './entities/campaign-tracking.entity';
import { getDefaultFunnelPageData } from '../../database/seed/default-funnel-pages';
import {
  FlowEngineService,
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
  logger = new Logger(CampaignsService.name);
  flowEngine = new FlowEngineService();

  constructor(
    @InjectRepository(Campaign)
    campaignRepository,
    @InjectRepository(CampaignPage)
    campaignPageRepository,
    @InjectRepository(Template)
    templateRepository,
    @InjectRepository(ApiConfig)
    apiConfigRepository,
    @InjectRepository(CampaignTracking)
    trackingRepository,
    @Inject(forwardRef(() => MarketsService))
    marketsService,
    @Inject(RedisService)
    redis,
  ) {
    this.campaignRepository = campaignRepository;
    this.campaignPageRepository = campaignPageRepository;
    this.templateRepository = templateRepository;
    this.apiConfigRepository = apiConfigRepository;
    this.trackingRepository = trackingRepository;
    this.marketsService = marketsService;
    this.redis = redis;
  }

  async invalidateFlowCampaignCache(campaign) {
    const keys = [
      `flow:campaign:id:${campaign.id}`,
      campaign.trackingId ? `flow:campaign:id:${campaign.trackingId}` : null,
      `flow:campaign:co:${String(campaign.country).toLowerCase()}:${String(campaign.operator).toLowerCase()}`,
    ].filter(Boolean);
    await Promise.all(keys.map((k) => this.redis.del(k)));
  }

  normalize(value) {
    return value.trim();
  }

  withTrackingId(campaign) {
    const cc = campaign.marketOperator?.country?.code;
    const oc = campaign.marketOperator?.code;
    if (cc && oc) {
      campaign.trackingId = buildTrackingId(cc, oc, campaign.id);
    }
    return campaign;
  }

  async findAll(userId) {
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

  async findOne(id, userId) {
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

  async findByCountryOperator(
    country,
    operator,
  ) {
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

    let campaign = null;
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

  async findByIdForFlow(id) {
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

  async findByTrackingId(
    countryCode,
    operatorCode,
    campaignId,
  ) {
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

  async ensureCampaignPages(campaign) {
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

  async create(dto, userId) {
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

    let sourcePages = [];
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

    const defaultMode = 'BOTH';
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
      let template;

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
    id,
    dto,
    userId,
  ) {
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

    delete campaign.trackings;
    await this.campaignRepository.save(campaign);
    const refreshed = this.sanitizeCampaignListItem(
      await this.findOne(id, userId),
    );
    await this.invalidateFlowCampaignCache(refreshed);
    return refreshed;
  }

  async getFlow(
    id,
    userId,
  ) {
    const campaign = await this.findOne(id, userId);
    const mode =
      this.flowEngine.normalizeMode(campaign.verificationMode) || 'BOTH';
    const flowConfig =
      this.flowEngine.parseFlowConfig(campaign.flowConfig) ||
      this.flowEngine.getDefaultFlowConfig(mode);
    return { verificationMode: mode, flowConfig };
  }

  async updateFlow(
    id,
    dto,
    userId,
  ) {
    const campaign = await this.findOne(id, userId);

    const mode =
      this.flowEngine.normalizeMode(dto.verificationMode) ||
      this.flowEngine.normalizeMode(campaign.verificationMode) ||
      'BOTH';

    let flowConfig;
    if (dto.flowConfig) {
      flowConfig = this.flowEngine.stripUnreachableNodes(
        dto.flowConfig,
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
    if (flowConfig.nodes.some((n) => n.pageType === 'HOME')) {
      flowConfig.entryPage = 'HOME';
    }
    campaign.flowConfig = JSON.stringify(flowConfig);
    await this.campaignRepository.save(campaign);
    return { verificationMode: mode, flowConfig };
  }

  async remove(id, userId) {
    const campaign = await this.findOne(id, userId);
    campaign.active = false;
    await this.campaignRepository.save(campaign);
  }

  async applyDefaultTemplates(
    id,
    userId,
    onlyEmpty = true,
  ) {
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
    campaignId,
    pageType,
    userId,
  ) {
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
    campaignId,
    pageType,
    dto,
    userId,
  ) {
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
    campaignId,
    userId,
  ) {
    await this.findOne(campaignId, userId);
    return this.apiConfigRepository.findOne({ where: { campaignId } });
  }

  async upsertApiConfig(
    campaignId,
    payload,
    userId,
  ) {
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

  pageHasContent(page) {
    const html = page.template?.data?.html;
    return typeof html === 'string' && html.trim().length > 0;
  }

  sanitizeCampaignListItem(campaign) {
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
