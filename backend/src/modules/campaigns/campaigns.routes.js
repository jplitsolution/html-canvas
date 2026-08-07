import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { campaignsController } from './campaigns.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', campaignsController.list);
router.post('/', campaignsController.create);
router.get('/:id', campaignsController.getOne);
router.patch('/:id', campaignsController.update);
router.delete('/:id', campaignsController.remove);
router.post('/:id/apply-defaults', campaignsController.applyDefaults);
router.get('/:id/pages/:pageType', campaignsController.getPage);
router.patch('/:id/pages/:pageType', campaignsController.updatePage);
router.get('/:id/flow', campaignsController.getFlow);
router.put('/:id/flow', campaignsController.updateFlow);
router.get('/:id/api-config', campaignsController.getApiConfig);
router.patch('/:id/api-config', campaignsController.updateApiConfig);

export default router;
