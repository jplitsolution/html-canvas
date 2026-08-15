import { Router } from 'express';
import { testController } from './test.controller.js';

const router = Router();

router.get('/', testController.testUrlMethod);
router.post('/', testController.testUrlMethod);
router.get('/otp', testController.testOtpMethod);
router.get('/otp/validate', testController.testOtpValidateMethod);
export default router;
