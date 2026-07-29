import axios from 'axios';

export const twilioProvider = {
  sendOtp: async (phone, otp, config, context) => {
    const accountSid = config?.accountSid || config?.account_sid;
    const authToken = config?.authToken || config?.auth_token;
    const from = config?.from || config?.from_number;
    const template =
      config?.messageTemplate ||
      config?.message_template ||
      'Your OTP code is {{otp}}';

    if (!accountSid || !authToken || !from) {
      const errorMsg =
        'Twilio credentials missing (accountSid, authToken, or from)';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const message = template
      .replace('{{otp}}', otp)
      .replace('{{campaign}}', context.campaignName);

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const params = new URLSearchParams();
      params.append('To', phone.startsWith('+') ? phone : `+${phone}`);
      params.append('From', from);
      params.append('Body', message);

      console.log(`Sending Twilio SMS to ${phone} from ${from}`);
      const response = await axios.post(url, params.toString(), {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 6000,
      });

      const data = response.data;
      return {
        success: true,
        providerRequestId: data.sid,
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`Twilio send failed: ${errorMsg}`);
      return { success: false, error: `Twilio Error: ${errorMsg}` };
    }
  },
};
