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
router.get('/callback', publicRateLimit, flowController.callback);
router.post('/callback', publicRateLimit, flowController.callback);
router.post(
  '/register-postback',
  publicRateLimit,
  flowController.registerPostback,
);

export default router;
