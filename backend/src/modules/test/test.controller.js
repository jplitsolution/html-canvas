import { redisService } from '../../common/services/redis.service.js';
import {
  createDummyDcbHandlers,
  createRedisBackedCache,
} from './dummy-dcb.js';

const dummyDcb = createDummyDcbHandlers({
  cache: createRedisBackedCache(redisService),
});

const getOtpFromRedis = async (mobile) => {
  return redisService.get(`otp:${mobile}`);
};

const saveOtpInRedis = async (mobile, otp) => {
  await redisService.set(`otp:${mobile}`, otp, 60 * 5);
  return otp;
};

const readMobile = (req) =>
  String(
    req.query?.msisdn ||
    req.query?.mobile ||
    req.query?.phone ||
    req.body?.msisdn ||
    req.body?.mobile ||
    req.body?.phone ||
    '',
  ).trim();

export const testController = {
  testUrlMethod: (req, res) => {
    const random = Math.random();
    if (random < 0.5) {
      return res.status(200).json({ success: true, message: 'Hello World' });
    } else if (random > 0.5) {
      return res.status(200).json({ success: false, message: 'Hello World' });
    } else {
      throw new Error('Test failed with 50% probability');
    }
  },

  testOtpMethod: async (req, res) => {
    try {
      const mobile = readMobile(req);
      if (!mobile) {
        return res
          .status(400)
          .json({ success: false, message: 'Mobile is required' });
      }
      const otp = Math.floor(100000 + Math.random() * 900000);
      console.log(
        `[Dummy OTP] authorization OTP for ${mobile}: ${otp}  (master OTP 1234 also works)`,
      );
      await saveOtpInRedis(mobile, otp);
      return res.status(200).json({
        success: true,
        responseCode: '0',
        message: 'OTP generated',
        otp: String(otp),
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  testOtpValidateMethod: async (req, res) => {
    try {
      const mobile = readMobile(req);
      const otp = String(req.query?.otp || req.body?.otp || '').trim();
      if (!mobile || !otp) {
        return res
          .status(400)
          .json({ success: false, message: 'Mobile and OTP are required' });
      }
      const savedOtp = await getOtpFromRedis(mobile);
      if (otp === '1234' || (savedOtp && String(otp) === String(savedOtp))) {
        return res
          .status(200)
          .json({ success: true, responseCode: '0', message: 'OTP validated' });
      }
      if (!savedOtp) {
        return res
          .status(400)
          .json({ success: false, responseCode: '1', message: 'OTP not found' });
      }
      return res
        .status(200)
        .json({ success: false, responseCode: '1', message: 'OTP validation failed' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  testChecksubMethod: (req, res) => {
    try {
      const mobile = readMobile(req);
      if (!mobile) {
        return res
          .status(400)
          .json({ success: false, message: 'Mobile is required' });
      }

      return res.status(200).json({
        success: true,
        responseCode: '0',
        msisdn: mobile,
        currentStatus: 'new',
        subscriptionStatus: 'new',
        status: 'new',
        reason: 'serviceNotExists',
        message: 'Dummy checksub',
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  testSubscribeMethod: (req, res) => {
    try {
      const mobile = readMobile(req);
      if (!mobile) {
        return res
          .status(400)
          .json({ success: false, message: 'Mobile is required' });
      }
      return res.status(200).json({
        success: true,
        responseCode: '0',
        response: 'SUCCESS',
        msisdn: mobile,
        currentStatus: 'active',
        subscriptionStatus: 'active',
        message: 'Dummy subscribe',
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  dummyDcbDirectory: dummyDcb.directory,
  dummyDcbPublicConfig: dummyDcb.publicConfig,
  dummyDcbSubscriptions: dummyDcb.subscriptions,
  dummyDcbPincode: dummyDcb.pincode,
  dummyDcbConfirm: dummyDcb.confirm,
};
