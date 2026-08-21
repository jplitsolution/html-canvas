import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { campaignsService } from './campaigns.service.js';

export const campaignsController = {
  list: asyncHandler(async (req, res) => {
    const data = await campaignsService.findAll(req.user.id);
    res.json(data);
  }),

  create: asyncHandler(async (req, res) => {
    const data = await campaignsService.create(req.body || {}, req.user.id);
    res.status(201).json(data);
  }),

  getOne: asyncHandler(async (req, res) => {
    const id = req.params.id;
    const campaign = await campaignsService.findOne(id, req.user.id);
    const { flowConfig, verificationMode } = await campaignsService.getFlow(
      id,
      req.user.id,
    );
    res.json(
      campaignsService.serializeCampaign(campaign, {
        flowConfig,
        verificationMode,
      }),
    );
  }),

  update: asyncHandler(async (req, res) => {
    const data = await campaignsService.update(
      req.params.id,
      req.body || {},
      req.user.id,
    );
    res.json(data);
  }),

  remove: asyncHandler(async (req, res) => {
    await campaignsService.remove(req.params.id, req.user.id);
    res.json({ message: 'Campaign deleted successfully' });
  }),

  applyDefaults: asyncHandler(async (req, res) => {
    const data = await campaignsService.applyDefaultTemplates(
      req.params.id,
      req.user.id,
      false,
    );
    res.json(data);
  }),

  getPage: asyncHandler(async (req, res) => {
    const data = await campaignsService.getPage(
      req.params.id,
      req.params.pageType,
      req.user.id,
    );
    res.json(data);
  }),

  updatePage: asyncHandler(async (req, res) => {
    const data = await campaignsService.updatePageContent(
      req.params.id,
      req.params.pageType,
      req.body || {},
      req.user.id,
    );
    res.json(data);
  }),

  getFlow: asyncHandler(async (req, res) => {
    const data = await campaignsService.getFlow(req.params.id, req.user.id);
    res.json(data);
  }),

  updateFlow: asyncHandler(async (req, res) => {
    const data = await campaignsService.updateFlow(
      req.params.id,
      req.body || {},
      req.user.id,
    );
    res.json(data);
  }),

  getApiConfig: asyncHandler(async (req, res) => {
    const config = await campaignsService.getApiConfig(
      req.params.id,
      req.user.id,
    );
    res.json(config || {});
  }),

  updateApiConfig: asyncHandler(async (req, res) => {
    const data = await campaignsService.upsertApiConfig(
      req.params.id,
      req.body || {},
      req.user.id,
    );
    res.json(data);
  }),
};
