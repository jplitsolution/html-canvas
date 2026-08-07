import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { usersController } from './users.controller.js';

const router = Router();

router.use(authenticate);

router.get('/profile', usersController.profile);
router.get('/admin', usersController.listAdmin);
router.post('/admin', usersController.createAdmin);
router.patch('/admin/:id', usersController.updateAdmin);
router.patch('/admin/:id/status', usersController.updateStatus);
router.patch('/admin/:id/password', usersController.updatePassword);

export default router;
