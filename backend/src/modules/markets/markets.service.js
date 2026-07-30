import { getRepository } from '../../database/index.js';
import { Country } from './entities/country.entity.js';
import { Operator } from './entities/operator.entity.js';
import { Campaign } from '../campaigns/entities/campaign.entity.js';
import { buildTrackingId, normalizeCode } from './tracking-id.util.js';

export const createMarketsService = () => {
  const getCountryRepo = () => getRepository(Country);
  const getOperatorRepo = () => getRepository(Operator);
  const getCampaignRepo = () => getRepository(Campaign);

  const attachTrackingId = (campaign, countryCode, operatorCode) => {
    const cc = countryCode || campaign.marketOperator?.country?.code || '';
    const oc = operatorCode || campaign.marketOperator?.code || '';
    if (cc && oc && campaign.id) {
      campaign.trackingId = buildTrackingId(cc, oc, campaign.id);
    }
    return campaign;
  };

  const listMarkets = async (userId) => {
    const operators = await getOperatorRepo().find({
      where: { userId },
      relations: { country: true },
      order: { updatedAt: 'DESC' },
    });

    const counts = await getCampaignRepo()
      .createQueryBuilder('c')
      .select('c.operatorId', 'operatorId')
      .addSelect('COUNT(*)', 'cnt')
      .where('c.userId = :userId', { userId })
      .andWhere('c.operatorId IS NOT NULL')
      .groupBy('c.operatorId')
      .getRawMany();

    const countMap = new Map(
      counts.map((r) => [Number(r.operatorId), Number(r.cnt)]),
    );

    return operators.map((op) => ({
      countryId: op.country.id,
      countryName: op.country.name,
      countryCode: op.country.code,
      operatorId: op.id,
      operatorName: op.name,
      operatorCode: op.code,
      campaignCount: countMap.get(op.id) || 0,
    }));
  };

  const createMarket = async (dto, userId) => {
    const countryCode = normalizeCode(dto.countryCode);
    const operatorCode = normalizeCode(dto.operatorCode);
    if (!countryCode || !operatorCode) {
      const err = new Error('countryCode and operatorCode are required');
      err.statusCode = 409;
      throw err;
    }

    let country = await getCountryRepo().findOne({
      where: { userId, code: countryCode },
    });
    if (!country) {
      country = await getCountryRepo().save(
        getCountryRepo().create({
          name: dto.countryName.trim(),
          code: countryCode,
          userId,
        }),
      );
    }

    const existingOp = await getOperatorRepo().findOne({
      where: { countryId: country.id, code: operatorCode },
      relations: { country: true },
    });
    if (existingOp) {
      const err = new Error(`Market already exists for ${country.code} / ${operatorCode}`);
      err.statusCode = 409;
      throw err;
    }

    const operator = await getOperatorRepo().save(
      getOperatorRepo().create({
        name: dto.operatorName.trim(),
        code: operatorCode,
        countryId: country.id,
        userId,
      }),
    );

    return {
      countryId: country.id,
      countryName: country.name,
      countryCode: country.code,
      operatorId: operator.id,
      operatorName: operator.name,
      operatorCode: operator.code,
      campaignCount: 0,
    };
  };

  const findMarketByCodes = async (countryCode, operatorCode, userId) => {
    const cc = normalizeCode(countryCode);
    const oc = normalizeCode(operatorCode);

    const country = await getCountryRepo().findOne({
      where: { userId, code: cc },
    });
    if (!country) {
      const err = new Error(`Country ${cc} not found`);
      err.statusCode = 404;
      throw err;
    }

    const operator = await getOperatorRepo().findOne({
      where: { countryId: country.id, code: oc, userId },
      relations: { country: true },
    });
    if (!operator) {
      const err = new Error(`Operator ${oc} not found for ${cc}`);
      err.statusCode = 404;
      throw err;
    }

    return { country, operator };
  };

  const getMarket = async (countryCode, operatorCode, userId) => {
    const { country, operator } = await findMarketByCodes(
      countryCode,
      operatorCode,
      userId,
    );
    const campaignCount = await getCampaignRepo().count({
      where: { operatorId: operator.id, userId },
    });
    return {
      countryId: country.id,
      countryName: country.name,
      countryCode: country.code,
      operatorId: operator.id,
      operatorName: operator.name,
      operatorCode: operator.code,
      campaignCount,
    };
  };

  const listCampaignsForMarket = async (countryCode, operatorCode, userId) => {
    const { country, operator } = await findMarketByCodes(
      countryCode,
      operatorCode,
      userId,
    );

    const campaigns = await getCampaignRepo().find({
      where: { operatorId: operator.id, userId },
      relations: {
        pages: { template: true },
        trackings: { vendor: true, affiliate: true },
        marketOperator: { country: true },
      },
      order: { updatedAt: 'DESC' },
    });

    return campaigns.map((c) => {
      const withId = attachTrackingId(c, country.code, operator.code);
      if (withId.pages) {
        withId.pages = withId.pages.map((page) => {
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
      return withId;
    });
  };

  const resolveOperatorForCreate = async (input) => {
    if (input.operatorId) {
      const operator = await getOperatorRepo().findOne({
        where: { id: parseInt(input.operatorId, 10) },
        relations: { country: true },
      });
      if (!operator) {
        const err = new Error(`Operator ${input.operatorId} not found`);
        err.statusCode = 404;
        throw err;
      }
      if (operator.userId !== input.userId) {
        const err = new Error('You do not have access to this market');
        err.statusCode = 403;
        throw err;
      }
      return { country: operator.country, operator };
    }

    const countryCode = normalizeCode(input.countryCode || '');
    const operatorCode = normalizeCode(input.operatorCode || '');
    if (!countryCode || !operatorCode) {
      const err = new Error('operatorId or countryCode+operatorCode is required');
      err.statusCode = 409;
      throw err;
    }

    let country = await getCountryRepo().findOne({
      where: { userId: input.userId, code: countryCode },
    });
    if (!country) {
      country = await getCountryRepo().save(
        getCountryRepo().create({
          name: (input.countryName || countryCode).trim(),
          code: countryCode,
          userId: input.userId,
        }),
      );
    }

    let operator = await getOperatorRepo().findOne({
      where: {
        countryId: country.id,
        code: operatorCode,
        userId: input.userId,
      },
      relations: { country: true },
    });
    if (!operator) {
      operator = await getOperatorRepo().save(
        getOperatorRepo().create({
          name: (input.operatorName || operatorCode).trim(),
          code: operatorCode,
          countryId: country.id,
          userId: input.userId,
        }),
      );
      operator.country = country;
    }

    return { country, operator };
  };

  return {
    listMarkets,
    createMarket,
    findMarketByCodes,
    getMarket,
    listCampaignsForMarket,
    resolveOperatorForCreate,
    attachTrackingId,
  };
};

export const marketsService = createMarketsService();
