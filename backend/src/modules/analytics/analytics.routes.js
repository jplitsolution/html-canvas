import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { analyticsController } from './analytics.controller.js';

const router = Router();

router.use(authenticate);

router.get('/campaign/:campaignId', analyticsController.campaignAnalytics);
router.get('/campaign/:campaignId/logs', analyticsController.campaignLogs);
router.get('/visits/:visitId', analyticsController.visitDetail);

export default router;
