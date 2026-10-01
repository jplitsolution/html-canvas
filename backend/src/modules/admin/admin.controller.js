import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { assertAdmin } from '../../common/admin.js';
import { adminService } from './admin.service.js';

export const adminController = {
  getStats: asyncHandler(async (req, res) => {
    assertAdmin(req);
    const stats = await adminService.getCacheStats();
    res.json(stats);
  }),

  clearCache: asyncHandler(async (req, res) => {
    assertAdmin(req);
    const { scope, pattern } = req.body || {};
    const result = await adminService.clearCache({ scope, pattern });
    res.json(result);
  }),

  listKeys: asyncHandler(async (req, res) => {
    assertAdmin(req);
    const { pattern, limit } = req.query || {};
    const result = await adminService.listKeys({ pattern, limit });
    res.json(result);
  }),

  deleteKey: asyncHandler(async (req, res) => {
    assertAdmin(req);
    const { key } = req.body || {};
    const result = await adminService.deleteSingleKey(key);
    res.json(result);
  }),
};
