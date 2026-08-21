import { getRepository } from '../../database/index.js';
import { Campaign } from '../../database/entities/campaign.entity.js';
import {
  ALL_CAMPAIGN_PAGE_TYPES,
  CampaignPage,
  REQUIRED_CAMPAIGN_PAGE_TYPES,
} from '../../database/entities/campaign-page.entity.js';
import { Template } from '../../database/entities/template.entity.js';
import { ApiConfig } from '../../database/entities/api-config.entity.js';
import { CampaignTracking } from '../../database/entities/campaign-tracking.entity.js';
import {
  getDefaultFunnelPageData,
  isClassicDefaultFunnelHtml,
} from '../../database/seed/default-funnel-pages.js';
import { flowEngineService } from '../flow/flow-engine.service.js';
import { marketsService } from '../markets/markets.service.js';
import {
  buildTrackingId,
  deriveCountryCode,
  deriveOperatorCode,
} from '../markets/helpers/tracking-id.util.js';
import { redisService } from '../../common/services/redis.service.js';
import { parsePayoutPercent } from '../otp/helpers/payout.js';

export const createCampaignsService = () => {
  const getCampaignRepo = () => getRepository(Campaign);
  const getCampaignPageRepo = () => getRepository(CampaignPage);
  const getTemplateRepo = () => getRepository(Template);
  const getApiConfigRepo = () => getRepository(ApiConfig);
  const getTrackingRepo = () => getRepository(CampaignTracking);

  const normalize = (value) => value.trim();

  const withTrackingId = (campaign) => {
    const cc = campaign.marketOperator?.country?.code;
    const oc = campaign.marketOperator?.code;
    if (cc && oc) {
      campaign.trackingId = buildTrackingId(cc, oc, campaign.id);
    }
    return campaign;
  };

  const pageHasContent = (page) => {
    const html = page.template?.data?.html;
    return typeof html === 'string' && html.trim().length > 0;
  };

  const sanitizeCampaignListItem = (campaign) => {
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
  };

  const invalidateFlowCampaignCache = async (campaignOrPartial) => {
    if (!campaignOrPartial) return;

    let campaign = campaignOrPartial;
    if (
      typeof campaignOrPartial === 'number' ||
      typeof campaignOrPartial === 'string'
    ) {
      const id = parseInt(campaignOrPartial, 10);
      if (!id || Number.isNaN(id)) return;
      campaign = await getCampaignRepo().findOne({
        where: { id },
        relations: { marketOperator: { country: true } },
      });
      if (!campaign) return;
      withTrackingId(campaign);
    } else if (campaign?.id && !campaign.trackingId) {
      withTrackingId(campaign);
    }

    if (!campaign?.id) return;

    const keys = [
      `flow:campaign:id:${campaign.id}`,
      campaign.trackingId ? `flow:campaign:id:${campaign.trackingId}` : null,
      campaign.country && campaign.operator
        ? `flow:campaign:co:${String(campaign.country).toLowerCase()}:${String(campaign.operator).toLowerCase()}`
        : null,
      `flow:config:${campaign.id}`,
    ].filter(Boolean);
    await Promise.all(keys.map((k) => redisService.del(k)));
  };

  const defaultPageData = (pageType, campaign) =>
    getDefaultFunnelPageData(pageType, {
      verificationMode: campaign?.verificationMode,
    });

  const ensureUniverseDcbPages = async (campaign) => {
    const mode = String(campaign?.verificationMode || '').toUpperCase();
    if (mode !== 'UNIVERSE_DCB') return false;

    let changed = false;
    for (const page of campaign.pages || []) {
      if (page.pageType !== 'HOME' && page.pageType !== 'OTP') continue;
      if (!page.templateId) continue;

      const template = await getTemplateRepo().findOne({
        where: { id: page.templateId },
      });
      if (!template) continue;

      const html = template.data?.html || '';
      if (!isClassicDefaultFunnelHtml(page.pageType, html)) continue;

      template.data = defaultPageData(page.pageType, campaign);
      await getTemplateRepo().save(template);
      page.template = template;
      changed = true;
    }

    if (changed) await invalidateFlowCampaignCache(campaign);
    return changed;
  };

  const ensureCampaignPages = async (campaign) => {
    const existingPageTypes = new Set(
      (campaign.pages || []).map((p) => p.pageType),
    );

    for (const pageType of ALL_CAMPAIGN_PAGE_TYPES) {
      if (!existingPageTypes.has(pageType)) {
        try {
          const template = await getTemplateRepo().save(
            getTemplateRepo().create({
              name: `${campaign.name} - ${pageType}`,
              data: defaultPageData(pageType, campaign),
              userId: campaign.userId,
              isPrebuilt: false,
            }),
          );

          const newPage = await getCampaignPageRepo().save(
            getCampaignPageRepo().create({
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
        } catch (err) {
          const dbPage = await getCampaignPageRepo().findOne({
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

    await ensureUniverseDcbPages(campaign);
  };

  const findAll = async (userId) => {
    const campaigns = await getCampaignRepo().find({
      where: { userId },
      relations: {
        pages: { template: true },
        trackings: { vendor: true },
        marketOperator: { country: true },
      },
      order: { updatedAt: 'DESC' },
    });
    return campaigns.map((c) => sanitizeCampaignListItem(withTrackingId(c)));
  };

  const findOne = async (id, userId) => {
    const campaign = await getCampaignRepo().findOne({
      where: { id: parseInt(id, 10) },
      relations: {
        pages: { template: true },
        trackings: { vendor: true },
        marketOperator: { country: true },
      },
    });
    if (!campaign) {
      const err = new Error(`Campaign with ID ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    if (campaign.userId !== userId) {
      const err = new Error(
        'You do not have permission to access this campaign',
      );
      err.statusCode = 403;
      throw err;
    }
    await ensureCampaignPages(campaign);
    return sanitizeCampaignListItem(withTrackingId(campaign));
  };

  const findByCountryOperator = async (country, operator) => {
    const normalizedCountry = normalize(country);
    const normalizedOperator = normalize(operator);

    const campaigns = await getCampaignRepo()
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.pages', 'pages')
      .leftJoinAndSelect('pages.template', 'template')
      .leftJoinAndSelect('campaign.trackings', 'trackings')
      .leftJoinAndSelect('trackings.vendor', 'vendor')
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
      } else if (actives.length > 1) {
        // Multiple active campaigns in same market — prefer most recently updated.
        // Callers with campid still resolve uniquely via findByTrackingId.
        campaign = [...actives].sort(
          (a, b) =>
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime(),
        )[0];
      } else {
        campaign = [...campaigns].sort(
          (a, b) =>
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime(),
        )[0];
      }
    }

    if (campaign) {
      await ensureCampaignPages(campaign);
      return withTrackingId(campaign);
    }
    return null;
  };

  const findByIdForFlow = async (id) => {
    if (!id || Number.isNaN(Number(id))) return null;
    const campaign = await getCampaignRepo().findOne({
      where: { id: parseInt(id, 10) },
      relations: {
        pages: { template: true },
        trackings: { vendor: true },
        marketOperator: { country: true },
      },
    });
    if (campaign) {
      await ensureCampaignPages(campaign);
      return withTrackingId(campaign);
    }
    return null;
  };

  const findByTrackingId = async (countryCode, operatorCode, campaignId) => {
    const campaign = await findByIdForFlow(campaignId);
    if (!campaign) return null;
    const cc = campaign.marketOperator?.country?.code?.toUpperCase();
    const oc = campaign.marketOperator?.code?.toUpperCase();
    if (cc && oc) {
      if (
        cc !== countryCode.toUpperCase() ||
        oc !== operatorCode.toUpperCase()
      ) {
        return null;
      }
    }
    return campaign;
  };

  const create = async (dto, userId) => {
    const { country, operator } = await marketsService.resolveOperatorForCreate(
      {
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
      },
    );

    const countryName = normalize(dto.country || country.name);
    const operatorName = normalize(dto.operator || operator.name);

    const nameConflict = await getCampaignRepo().findOne({
      where: { operatorId: operator.id, name: dto.name.trim() },
    });
    if (nameConflict) {
      const err = new Error(
        `Campaign "${dto.name.trim()}" already exists for ${country.code} / ${operator.code}`,
      );
      err.statusCode = 409;
      throw err;
    }

    let sourcePages = [];
    if (dto.copyFromCampaignId) {
      const source = await getCampaignRepo().findOne({
        where: { id: parseInt(dto.copyFromCampaignId, 10), userId },
        relations: { pages: { template: true } },
      });
      if (!source) {
        const err = new Error(
          `Source campaign ${dto.copyFromCampaignId} not found`,
        );
        err.statusCode = 404;
        throw err;
      }
      sourcePages = source.pages || [];
    }

    const defaultMode = 'BOTH';
    const campaign = await getCampaignRepo().save(
      getCampaignRepo().create({
        name: dto.name.trim(),
        country: countryName,
        operator: operatorName,
        operatorId: operator.id,
        serviceId: dto.serviceId,
        userId,
        active: false,
        verificationMode: defaultMode,
        flowConfig: JSON.stringify(
          flowEngineService.getDefaultFlowConfig(defaultMode),
        ),
      }),
    );

    for (const pageType of ALL_CAMPAIGN_PAGE_TYPES) {
      const sourcePage = sourcePages.find((p) => p.pageType === pageType);
      let template;

      if (sourcePage?.template) {
        template = await getTemplateRepo().save(
          getTemplateRepo().create({
            name: `${campaign.name} - ${pageType}`,
            data: { ...sourcePage.template.data },
            userId,
            isPrebuilt: false,
          }),
        );
      } else {
        template = await getTemplateRepo().save(
          getTemplateRepo().create({
            name: `${campaign.name} - ${pageType}`,
            data: defaultPageData(pageType, campaign),
            userId,
            isPrebuilt: false,
          }),
        );
      }

      await getCampaignPageRepo().save(
        getCampaignPageRepo().create({
          campaignId: campaign.id,
          pageType,
          templateId: template.id,
        }),
      );
    }

    return sanitizeCampaignListItem(await findOne(campaign.id, userId));
  };

  const update = async (id, dto, userId) => {
    const campaign = await findOne(id, userId);

    if (dto.active === true) {
      const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
      const requiredTypes =
        flowConfig && flowConfig.nodes
          ? flowConfig.nodes.map((n) => n.pageType)
          : REQUIRED_CAMPAIGN_PAGE_TYPES;

      const missing = requiredTypes.filter((type) => {
        const page = campaign.pages.find((p) => p.pageType === type);
        return !page || !pageHasContent(page);
      });
      if (missing.length > 0) {
        const err = new Error(
          `Cannot activate campaign. Missing content for: ${missing.join(', ')}`,
        );
        err.statusCode = 400;
        throw err;
      }
    }

    if (dto.name !== undefined) campaign.name = dto.name.trim();
    if (dto.serviceId !== undefined) campaign.serviceId = dto.serviceId;
    if (dto.cgRedirectUrl !== undefined) {
      campaign.cgRedirectUrl = dto.cgRedirectUrl?.trim() || null;
    }
    if (dto.successRedirectUrl !== undefined) {
      campaign.successRedirectUrl = dto.successRedirectUrl?.trim() || null;
    }
    if (dto.successRedirectMode !== undefined) {
      const mode = String(dto.successRedirectMode || '')
        .trim()
        .toLowerCase();
      campaign.successRedirectMode =
        mode === 'immediate' ? 'immediate' : 'thankyou';
    }
    if (dto.postbackRegisterAt !== undefined) {
      const mode = String(dto.postbackRegisterAt || '')
        .trim()
        .toLowerCase();
      campaign.postbackRegisterAt =
        mode === 'otp' || mode === 'both' ? mode : 'confirm';
    }
    if (dto.funnelLayout !== undefined) {
      const layout = String(dto.funnelLayout || '')
        .trim()
        .toLowerCase();
      const nextLayout =
        layout === 'packs_on_home' ? 'packs_on_home' : 'classic';
      campaign.funnelLayout = nextLayout;
      // Default: pack-click pending only. Classic "otp only" would skip pack CTAs
      // as the primary register — reset so Advanced can opt back into OTP.
      if (
        nextLayout === 'packs_on_home' &&
        campaign.postbackRegisterAt === 'otp'
      ) {
        campaign.postbackRegisterAt = 'confirm';
      }
      const parsed = flowEngineService.parseFlowConfig(campaign.flowConfig);
      if (parsed) {
        campaign.flowConfig = JSON.stringify(
          flowEngineService.applyFunnelLayoutToFlowConfig(
            parsed,
            nextLayout,
            campaign.verificationMode,
          ),
        );
      }
    }
    if (dto.active !== undefined) campaign.active = dto.active;
    if (dto.trackings !== undefined) {
      await getTrackingRepo().delete({ campaignId: campaign.id });
      if (dto.trackings && dto.trackings.length > 0) {
        await getTrackingRepo().insert(
          dto.trackings.map((t) => ({
            campaignId: campaign.id,
            vendorId: Number(t.vendorId),
            affiliateId: null,
            active:
              t.active === undefined || t.active === null ? true : !!t.active,
            payoutPercent: parsePayoutPercent(t.payoutPercent),
          })),
        );
      }
    } else if (dto.vendorIds !== undefined) {
      await getTrackingRepo().delete({ campaignId: campaign.id });
      if (dto.vendorIds && dto.vendorIds.length > 0) {
        await getTrackingRepo().insert(
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
    await getCampaignRepo().save(campaign);
    const refreshed = sanitizeCampaignListItem(await findOne(id, userId));
    await invalidateFlowCampaignCache(refreshed);
    return refreshed;
  };

  const getFlow = async (id, userId) => {
    const campaign = await findOne(id, userId);
    const mode =
      flowEngineService.normalizeMode(campaign.verificationMode) || 'BOTH';
    const flowConfig =
      flowEngineService.parseFlowConfig(campaign.flowConfig) ||
      flowEngineService.getDefaultFlowConfig(mode, {
        funnelLayout: campaign.funnelLayout,
      });
    return { verificationMode: mode, flowConfig };
  };

  const updateFlow = async (id, dto, userId) => {
    const campaign = await findOne(id, userId);

    const mode =
      flowEngineService.normalizeMode(dto.verificationMode) ||
      flowEngineService.normalizeMode(campaign.verificationMode) ||
      'BOTH';

    let flowConfig;
    if (dto.flowConfig) {
      flowConfig = flowEngineService.stripUnreachableNodes(
        dto.flowConfig,
        mode,
      );
      const { ok, errors } = flowEngineService.validate(flowConfig, mode);
      if (!ok) {
        const err = new Error(`Invalid flow: ${errors.join(' ')}`);
        err.statusCode = 400;
        throw err;
      }
    } else {
      flowConfig =
        flowEngineService.parseFlowConfig(campaign.flowConfig) ||
        flowEngineService.getDefaultFlowConfig(mode, {
          funnelLayout: campaign.funnelLayout,
        });
    }

    campaign.verificationMode = mode;
    // Honor flowConfig.entryPage (e.g. OTP-first). Do not force HOME.
    flowConfig.entryPage = flowEngineService.getEntryPage(flowConfig);
    campaign.flowConfig = JSON.stringify(flowConfig);
    await getCampaignRepo().save(campaign);
    await ensureUniverseDcbPages(campaign);
    await invalidateFlowCampaignCache(campaign);
    return { verificationMode: mode, flowConfig };
  };

  const remove = async (id, userId) => {
    const campaign = await findOne(id, userId);
    campaign.active = false;
    await getCampaignRepo().save(campaign);
    await invalidateFlowCampaignCache(campaign);
  };

  const applyDefaultTemplates = async (id, userId, onlyEmpty = true) => {
    const campaign = await findOne(id, userId);

    for (const page of campaign.pages) {
      const hasContent = pageHasContent(page);
      if (onlyEmpty && hasContent) continue;
      if (!page.templateId) continue;

      const template = await getTemplateRepo().findOne({
        where: { id: page.templateId },
      });
      if (!template) continue;

      template.data = defaultPageData(page.pageType, campaign);
      await getTemplateRepo().save(template);
    }

    await invalidateFlowCampaignCache(campaign);
    return findOne(id, userId);
  };

  const getPage = async (campaignId, pageType, userId) => {
    // Use unsanitized campaign so editor gets real html/css/projectData
    // (findOne strips content to "[saved]" for list payloads).
    const campaign = await getCampaignRepo().findOne({
      where: { id: parseInt(campaignId, 10) },
      relations: {
        pages: { template: true },
        marketOperator: { country: true },
      },
    });
    if (!campaign) {
      const err = new Error(`Campaign with ID ${campaignId} not found`);
      err.statusCode = 404;
      throw err;
    }
    if (campaign.userId !== userId) {
      const err = new Error(
        'You do not have permission to access this campaign',
      );
      err.statusCode = 403;
      throw err;
    }

    await ensureCampaignPages(campaign);

    const normalizedType = String(pageType || '')
      .trim()
      .toUpperCase();
    if (!ALL_CAMPAIGN_PAGE_TYPES.includes(normalizedType)) {
      const err = new Error(`Invalid page type "${pageType}"`);
      err.statusCode = 400;
      throw err;
    }

    const page = (campaign.pages || []).find(
      (p) => p.pageType === normalizedType,
    );
    if (!page) {
      const err = new Error(`Page type ${pageType} not found for campaign`);
      err.statusCode = 404;
      throw err;
    }

    // Always reload template fresh in case ensureCampaignPages just created it
    if (page.templateId) {
      const template = await getTemplateRepo().findOne({
        where: { id: page.templateId },
      });
      if (template) page.template = template;
    }

    return page;
  };

  const updatePageContent = async (campaignId, pageType, dto, userId) => {
    const normalizedType = String(pageType || '')
      .trim()
      .toUpperCase();
    if (!ALL_CAMPAIGN_PAGE_TYPES.includes(normalizedType)) {
      const err = new Error(`Invalid page type "${pageType}"`);
      err.statusCode = 400;
      throw err;
    }
    const page = await getPage(campaignId, normalizedType, userId);
    if (!page.templateId) {
      const err = new Error('Template not linked to this page');
      err.statusCode = 404;
      throw err;
    }

    const template = await getTemplateRepo().findOne({
      where: { id: page.templateId },
    });
    if (!template) {
      const err = new Error('Template not found');
      err.statusCode = 404;
      throw err;
    }

    const data = { ...(template.data || {}) };
    if (dto.projectData !== undefined) data.projectData = dto.projectData;
    if (dto.html !== undefined) data.html = dto.html;
    if (dto.css !== undefined) data.css = dto.css;
    data.editor = 'grapesjs';

    template.data = data;
    await getTemplateRepo().save(template);

    await invalidateFlowCampaignCache(campaignId);
    return getPage(campaignId, normalizedType, userId);
  };

  const getApiConfig = async (campaignId, userId) => {
    await findOne(campaignId, userId);
    return getApiConfigRepo().findOne({
      where: { campaignId: parseInt(campaignId, 10) },
    });
  };

  const upsertApiConfig = async (campaignId, payload, userId) => {
    await findOne(campaignId, userId);

    const allowed = {
      blocklistApi: payload.blocklistApi,
      subscriptionApi: payload.subscriptionApi,
      subscribeApi: payload.subscribeApi,
      headersJson: payload.headersJson,
      otpConfigJson: payload.otpConfigJson,
      resolveMsisdnUrl: payload.resolveMsisdnUrl,
      heProvider: payload.heProvider,
      heConfigJson: payload.heConfigJson,
      checksubConfigJson: payload.checksubConfigJson,
      dcbConfigJson: payload.dcbConfigJson,
    };
    // Strip undefined so we don't wipe fields the client omitted
    Object.keys(allowed).forEach((k) => {
      if (allowed[k] === undefined) delete allowed[k];
    });
    // Empty string → null (clear subscribe URL)
    if (Object.prototype.hasOwnProperty.call(allowed, 'subscribeApi')) {
      const raw = allowed.subscribeApi;
      allowed.subscribeApi =
        raw == null || String(raw).trim() === '' ? null : String(raw).trim();
    }
    if (Object.prototype.hasOwnProperty.call(allowed, 'checksubConfigJson')) {
      const raw = allowed.checksubConfigJson;
      allowed.checksubConfigJson =
        raw == null || String(raw).trim() === '' ? null : String(raw).trim();
    }
    if (Object.prototype.hasOwnProperty.call(allowed, 'dcbConfigJson')) {
      const raw = allowed.dcbConfigJson;
      allowed.dcbConfigJson =
        raw == null || String(raw).trim() === '' ? null : String(raw).trim();
    }

    let config = await getApiConfigRepo().findOne({
      where: { campaignId: parseInt(campaignId, 10) },
    });
    if (!config) {
      config = getApiConfigRepo().create({
        campaignId: parseInt(campaignId, 10),
        ...allowed,
      });
    } else {
      Object.assign(config, allowed);
    }
    const saved = await getApiConfigRepo().save(config);
    await invalidateFlowCampaignCache(campaignId);
    return saved;
  };

  return {
    findAll,
    findOne,
    findByCountryOperator,
    findByIdForFlow,
    findByTrackingId,
    ensureCampaignPages,
    create,
    update,
    getFlow,
    updateFlow,
    remove,
    applyDefaultTemplates,
    getPage,
    updatePageContent,
    getApiConfig,
    upsertApiConfig,
    pageHasContent,
    sanitizeCampaignListItem,
    withTrackingId,
    invalidateFlowCampaignCache,
  };
};

export const campaignsService = createCampaignsService();
