import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { adminController } from './admin.controller.js';

const router = Router();

router.use(authenticate);

router.get('/cache/stats', adminController.getStats);
router.post('/cache/clear', adminController.clearCache);
router.get('/cache/keys', adminController.listKeys);
router.delete('/cache/key', adminController.deleteKey);

export default router;
