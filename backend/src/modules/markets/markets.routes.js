import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { marketsController } from './markets.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', marketsController.list);
router.post('/', marketsController.create);
router.get('/:countryCode/:operatorCode', marketsController.getOne);
router.get(
  '/:countryCode/:operatorCode/campaigns',
  marketsController.listCampaigns,
);
router.post(
  '/:countryCode/:operatorCode/campaigns',
  marketsController.createCampaign,
);

export default router;
