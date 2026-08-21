import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { publicRateLimit } from '../../common/guards/public-rate-limit.guard.js';
import { otpController } from './otp.controller.js';

const router = Router();

// WAP funnel (body: phone, visitId, campaignId)
router.post('/send', publicRateLimit, otpController.send);
router.post('/verify', publicRateLimit, otpController.verify);

// Admin test / health (static paths before :campaignId)
router.post('/test-send', authenticate, otpController.testSend);
router.post('/test-verify', authenticate, otpController.testVerify);
router.post('/health-check', authenticate, otpController.healthCheck);

// Vendor-scoped API-expose — GET/POST /api/otp/{campaignId}/{vendorId}/send|verify
router.get('/:campaignId/:vendorId/send', publicRateLimit, otpController.exposeSend);
router.post('/:campaignId/:vendorId/send', publicRateLimit, otpController.exposeSend);
router.get('/:campaignId/:vendorId/verify', publicRateLimit, otpController.exposeVerify);
router.post('/:campaignId/:vendorId/verify', publicRateLimit, otpController.exposeVerify);

// Legacy campaign-only paths still accept vendorId/vid in query or body
router.get('/:campaignId/send', publicRateLimit, otpController.exposeSend);
router.post('/:campaignId/send', publicRateLimit, otpController.exposeSend);
router.get('/:campaignId/verify', publicRateLimit, otpController.exposeVerify);
router.post('/:campaignId/verify', publicRateLimit, otpController.exposeVerify);

export default router;
