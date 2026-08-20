import { Router } from 'express';
import { testController } from './test.controller.js';

const router = Router();

router.get('/', testController.testUrlMethod);
router.post('/', testController.testUrlMethod);
router.get('/otp', testController.testOtpMethod);
router.get('/otp/validate', testController.testOtpValidateMethod);
router.get('/checksub', testController.testChecksubMethod);
router.get('/subscribe', testController.testSubscribeMethod);
router.get('/dcb', testController.dummyDcbDirectory);
router.get('/dcb/config/public', testController.dummyDcbPublicConfig);
router.get('/dcb/subscriptions', testController.dummyDcbSubscriptions);
router.post('/dcb/pincode', testController.dummyDcbPincode);
router.post('/dcb/confirm', testController.dummyDcbConfirm);
export default router;
