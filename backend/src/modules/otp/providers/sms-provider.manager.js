import { twilioProvider } from './twilio.provider.js';
import { msg91Provider } from './msg91.provider.js';
import { kaleyraProvider } from './kaleyra.provider.js';
import { partnerProvider } from './partner.provider.js';
import { customHttpProvider } from './custom-http.provider.js';

export const createSmsProviderManager = () => {
  const getProvider = (config) => {
    if (!config) {
      return twilioProvider;
    }
    const providerName = (config.smsProvider || 'twilio').toLowerCase();
    switch (providerName) {
      case 'msg91':
        return msg91Provider;
      case 'kaleyra':
        return kaleyraProvider;
      case 'partner':
        return partnerProvider;
      case 'custom':
        return customHttpProvider;
      case 'twilio':
      default:
        return twilioProvider;
    }
  };

  return { getProvider };
};

export const smsProviderManager = createSmsProviderManager();
