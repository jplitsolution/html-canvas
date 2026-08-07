import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { marketsService } from './markets.service.js';
import { campaignsService } from '../campaigns/campaigns.service.js';

export const marketsController = {
  list: asyncHandler(async (req, res) => {
    const data = await marketsService.listMarkets(req.user.id);
    res.json(data);
  }),

  create: asyncHandler(async (req, res) => {
    const data = await marketsService.createMarket(req.body || {}, req.user.id);
    res.status(201).json(data);
  }),

  getOne: asyncHandler(async (req, res) => {
    const { countryCode, operatorCode } = req.params;
    const data = await marketsService.getMarket(
      countryCode,
      operatorCode,
      req.user.id,
    );
    res.json(data);
  }),

  listCampaigns: asyncHandler(async (req, res) => {
    const { countryCode, operatorCode } = req.params;
    const data = await marketsService.listCampaignsForMarket(
      countryCode,
      operatorCode,
      req.user.id,
    );
    res.json(data);
  }),

  createCampaign: asyncHandler(async (req, res) => {
    const { countryCode, operatorCode } = req.params;
    const dto = req.body || {};
    const { country, operator } = await marketsService.findMarketByCodes(
      countryCode,
      operatorCode,
      req.user.id,
    );
    const data = await campaignsService.create(
      {
        name: dto.name,
        country: country.name,
        operator: operator.name,
        countryCode: country.code,
        operatorCode: operator.code,
        operatorId: operator.id,
        copyFromCampaignId: dto.copyFromCampaignId
          ? Number(dto.copyFromCampaignId)
          : undefined,
      },
      req.user.id,
    );
    res.status(201).json(data);
  }),
};
