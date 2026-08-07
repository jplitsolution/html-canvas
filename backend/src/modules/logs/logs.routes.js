import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { logsController } from './logs.controller.js';

const router = Router();

router.use(authenticate);

router.get('/status', logsController.status);
router.get('/campaign/:campaignId', logsController.campaignSearch);
router.get(
  '/campaign/:campaignId/aggregations',
  logsController.campaignAggregations,
);
router.get('/all', logsController.allSearch);
router.get('/all/aggregations', logsController.allAggregations);

export default router;
