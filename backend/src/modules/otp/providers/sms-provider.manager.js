import { partnerProvider } from './partner.provider.js';

const parseJson = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

/**
 * Partner-API-only OTP manager.
 * Twilio / MSG91 / Kaleyra / local SMS gateways are not used.
 */
export const resolveOtpProviderConfig = (apiConfig) => {
  if (!apiConfig) {
    return { providerName: 'partner', providerConfig: {} };
  }

  let providerConfig = parseJson(apiConfig.otpConfigJson);

  // Legacy failover JSON shape (pre partner-only): pick partner entry if present
  if (providerConfig.failover === true) {
    const providers = providerConfig.providers || {};
    const partnerEntry = Object.entries(providers).find(
      ([name]) => String(name).toLowerCase() === 'partner',
    );
    const sorted = Object.entries(providers).sort(
      (a, b) => (Number(a[1]?.priority) || 99) - (Number(b[1]?.priority) || 99),
    );
    const chosen = partnerEntry || sorted[0];
    providerConfig = chosen?.[1]?.config || {};
  }

  return { providerName: 'partner', providerConfig };
};

export const usesRemoteVerify = () => true;

export const createSmsProviderManager = () => {
  const getProviderByName = () => partnerProvider;

  const getProvider = (apiConfig) => {
    const { providerName, providerConfig } = resolveOtpProviderConfig(apiConfig);
    return {
      providerName,
      providerConfig,
      provider: partnerProvider,
      remoteVerify: true,
    };
  };

  return { getProvider, getProviderByName, resolveOtpProviderConfig, usesRemoteVerify };
};

export const smsProviderManager = createSmsProviderManager();
