import axios from 'axios';

export const msg91Provider = {
  sendOtp: async (phone, otp, config, context) => {
    const authKey = config?.authKey || config?.authkey || config?.auth_key;
    const templateId = config?.templateId || config?.template_id;
    const sender = config?.sender || 'MSG91';

    if (!authKey || !templateId) {
      const errorMsg = 'MSG91 credentials missing (authKey or templateId)';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      console.log(`Sending MSG91 OTP to ${phone}`);
      const response = await axios.post(
        'https://control.msg91.com/api/v5/otp',
        {
          template_id: templateId,
          mobile: phone,
          otp: otp,
          sender: sender,
        },
        {
          headers: {
            authkey: authKey,
            'Content-Type': 'application/json',
          },
          timeout: 6000,
        },
      );

      const data = response.data;
      if (data?.type === 'success') {
        return {
          success: true,
          providerRequestId: data.request_id || 'msg91-req',
        };
      } else {
        const errMsg = data?.message || JSON.stringify(data);
        console.error(`MSG91 API error: ${errMsg}`);
        return { success: false, error: `MSG91 Error: ${errMsg}` };
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`MSG91 send failed: ${errorMsg}`);
      return { success: false, error: `MSG91 Error: ${errorMsg}` };
    }
  },
};
