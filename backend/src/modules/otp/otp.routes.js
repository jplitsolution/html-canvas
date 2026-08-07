import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { publicRateLimit } from '../../common/guards/public-rate-limit.guard.js';
import { otpController } from './otp.controller.js';

const router = Router();

router.post('/send', publicRateLimit, otpController.send);
router.post('/verify', publicRateLimit, otpController.verify);
router.post('/test-send', authenticate, otpController.testSend);
router.post('/test-verify', authenticate, otpController.testVerify);
router.post('/health-check', authenticate, otpController.healthCheck);

export default router;
