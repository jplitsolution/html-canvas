import { Router } from 'express';
import { publicRateLimit } from '../../common/guards/public-rate-limit.guard.js';
import { flowController } from './flow.controller.js';

const router = Router();

router.get('/detect-msisdn', flowController.detectMsisdn);
// Browser Safaricom HE completion (msisdn + he_token/he_msisdn log payloads).
router.post('/detect-msisdn', publicRateLimit, flowController.detectMsisdn);
router.get('/entry', flowController.entry);
router.get('/page', flowController.page);
router.post('/transition', publicRateLimit, flowController.transition);
router.post('/priority-check', publicRateLimit, flowController.priorityCheck);
router.get('/dcb/config', publicRateLimit, flowController.dcbConfig);
router.post(
  '/dcb/manual-check',
  publicRateLimit,
  flowController.dcbManualCheck,
);
// Vendor-scoped DCB API expose (config / billing PIN send/confirm) — before generic /dcb/*
router.get(
  '/dcb/:campaignId/:vendorId/config',
  publicRateLimit,
  flowController.dcbExposeConfig,
);
router.post(
  '/dcb/:campaignId/:vendorId/config',
  publicRateLimit,
  flowController.dcbExposeConfig,
);
router.post(
  '/dcb/:campaignId/:vendorId/pincode',
  publicRateLimit,
  flowController.dcbExposePincode,
);
router.get(
  '/dcb/:campaignId/:vendorId/pincode',
  publicRateLimit,
  flowController.dcbExposePincode,
);
router.post(
  '/dcb/:campaignId/:vendorId/confirm',
  publicRateLimit,
  flowController.dcbExposeConfirm,
);
router.get(
  '/dcb/:campaignId/:vendorId/confirm',
  publicRateLimit,
  flowController.dcbExposeConfirm,
);
router.get(
  '/dcb/:campaignId/:vendorId/status',
  publicRateLimit,
  flowController.dcbExposeStatus,
);
router.post(
  '/dcb/:campaignId/:vendorId/status',
  publicRateLimit,
  flowController.dcbExposeStatus,
);
router.get(
  '/dcb/:campaignId/:vendorId/screen',
  publicRateLimit,
  flowController.dcbExposeScreen,
);
router.post('/dcb/pincode', publicRateLimit, flowController.dcbPincode);
router.post('/dcb/confirm', publicRateLimit, flowController.dcbConfirm);
router.get('/dcb/status', publicRateLimit, flowController.dcbStatus);
router.post('/dcb/status', publicRateLimit, flowController.dcbStatus);
router.get('/callback', publicRateLimit, flowController.callback);
router.post('/callback', publicRateLimit, flowController.callback);
router.post(
  '/register-postback',
  publicRateLimit,
  flowController.registerPostback,
);

// Orange Burkina Faso Vendor API Expose Endpoints
router.post('/orange-bf/check', publicRateLimit, flowController.orangeBfCheck);
router.get('/orange-bf/check', publicRateLimit, flowController.orangeBfCheck);
router.post('/orange-bf/otp/send', publicRateLimit, flowController.orangeBfSendOtp);
router.get('/orange-bf/otp/send', publicRateLimit, flowController.orangeBfSendOtp);
router.post('/orange-bf/otp/verify', publicRateLimit, flowController.orangeBfVerifyOtp);
router.get('/orange-bf/otp/verify', publicRateLimit, flowController.orangeBfVerifyOtp);
router.post('/orange-bf/unsub', publicRateLimit, flowController.orangeBfUnsub);
router.get('/orange-bf/unsub', publicRateLimit, flowController.orangeBfUnsub);

export default router;
