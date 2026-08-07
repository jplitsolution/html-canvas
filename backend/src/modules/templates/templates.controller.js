import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { decodeToken } from '../../common/middleware/auth.middleware.js';
import { templatesService } from './templates.service.js';

export const templatesController = {
  listPrebuilt: asyncHandler(async (_req, res) => {
    const data = await templatesService.findAllPrebuilt();
    res.json(data);
  }),

  listUser: asyncHandler(async (req, res) => {
    const data = await templatesService.findUserTemplates(req.user.id);
    res.json(data);
  }),

  getOne: asyncHandler(async (req, res) => {
    const { id } = req.params;
    let userId;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = decodeToken(token);
      if (payload && payload.sub != null) {
        userId = Number(payload.sub);
      }
    }
    const data = await templatesService.findOne(id, userId);
    res.json(data);
  }),

  create: asyncHandler(async (req, res) => {
    const data = await templatesService.create(req.body || {}, req.user.id);
    res.status(201).json(data);
  }),

  remove: asyncHandler(async (req, res) => {
    const { id } = req.params;
    await templatesService.remove(id, req.user.id);
    res.json({ message: 'Template deleted successfully' });
  }),
};
