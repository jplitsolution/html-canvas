import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { authController } from './auth.controller.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, authController.changePassword);

export default router;
