import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { analyticsService } from './analytics.service.js';

export const analyticsController = {
  campaignAnalytics: asyncHandler(async (req, res) => {
    const data = await analyticsService.getCampaignAnalytics(
      req.params.campaignId,
      req.user.id,
    );
    res.json(data);
  }),

  campaignLogs: asyncHandler(async (req, res) => {
    const data = await analyticsService.getCampaignActivityLogs(
      req.params.campaignId,
      req.user.id,
      req.query || {},
    );
    res.json(data);
  }),

  visitDetail: asyncHandler(async (req, res) => {
    try {
      const data = await analyticsService.getVisitDetail(
        req.params.visitId,
        req.user.id,
      );
      res.json(data);
    } catch (err) {
      const code = err.statusCode || 500;
      res.status(code).json({ message: err.message || 'Error' });
    }
  }),
};
