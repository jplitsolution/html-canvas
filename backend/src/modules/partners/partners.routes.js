import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { partnersController } from './partners.controller.js';

const router = Router();

router.use(authenticate);

router.get('/vendors', partnersController.listVendors);
router.post('/vendors', partnersController.createVendor);
router.get('/vendors/:id', partnersController.getVendor);
router.patch('/vendors/:id', partnersController.updateVendor);
router.delete('/vendors/:id', partnersController.removeVendor);

router.get('/postbacks/summary', partnersController.postbacksSummary);
router.get('/postbacks', partnersController.listPostbacks);
router.get('/postbacks/:id', partnersController.getPostback);

export default router;
