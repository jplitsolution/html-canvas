const round1 = (n) => Math.round(Number(n) * 10) / 10;

const pct = (num, den) => {
  if (!den || den <= 0) return 0;
  return round1((Number(num) / Number(den)) * 100);
};

/**
 * OTP requested vs verified, plus hold split.
 * live = partner verify success; vendor = what the API caller actually saw.
 */
export const otpConversionStats = ({
  requested = 0,
  liveVerified = 0,
  held = 0,
} = {}) => {
  const otpRequested = Math.max(0, Number(requested) || 0);
  const otpVerifiedLive = Math.max(0, Number(liveVerified) || 0);
  const otpHeld = Math.max(0, Math.min(otpVerifiedLive, Number(held) || 0));
  const otpVerifiedVendor = Math.max(0, otpVerifiedLive - otpHeld);

  return {
    requested: otpRequested,
    verifiedLive: otpVerifiedLive,
    verifiedVendor: otpVerifiedVendor,
    held: otpHeld,
    liveConvPercent: pct(otpVerifiedLive, otpRequested),
    vendorConvPercent: pct(otpVerifiedVendor, otpRequested),
    holdPercent: pct(otpHeld, otpVerifiedLive),
  };
};

/**
 * One vendor row for campaign detail: WAP uses subscribe/clicks;
 * API expose uses verified/requested and publisher (after-hold) %.
 */
export const campaignVendorPerf = ({
  clicks = 0,
  subscribeSuccess = 0,
  requested = 0,
  liveVerified = 0,
  held = 0,
  failedApi = 0,
  apiExpose = false,
} = {}) => {
  const totalClicks = Math.max(0, Number(clicks) || 0);
  const conversionsWap = Math.max(0, Number(subscribeSuccess) || 0);
  const otp = otpConversionStats({ requested, liveVerified, held });
  return {
    totalClicks,
    conversions: apiExpose ? otp.verifiedLive : conversionsWap,
    convPercent: apiExpose ? otp.liveConvPercent : pct(conversionsWap, totalClicks),
    requestedApi: otp.requested,
    verifiedApi: otp.verifiedLive,
    failedApi: Math.max(0, Number(failedApi) || 0),
    pubConvPercent: otp.vendorConvPercent,
  };
};
