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

const clampInt = (value) => Math.max(0, Math.trunc(Number(value) || 0));

/**
 * API expose funnel counts the way advertisers report them: PIN send leg,
 * PIN validate leg, and how many of those we actually forward to the vendor.
 * "Unique" is distinct MSISDN. No money columns — the payout cut is a count
 * hold on our side, we never hold the amount itself.
 */
export const apiExposePinStats = ({
  pinRequest = 0,
  pinSendSuccess = 0,
  uniquePinSend = 0,
  pinValRequest = 0,
  uniquePinValRequest = 0,
  pinValSuccess = 0,
  uniquePinVal = 0,
  held = 0,
} = {}) => {
  const sendSuccess = clampInt(pinSendSuccess);
  const sendRequest = Math.max(clampInt(pinRequest), sendSuccess);
  const valSuccess = clampInt(pinValSuccess);
  const valRequest = Math.max(clampInt(pinValRequest), valSuccess);
  const valHeld = Math.min(valSuccess, clampInt(held));
  const sendConversion = valSuccess - valHeld;

  return {
    pinRequest: sendRequest,
    pinSendSuccess: sendSuccess,
    uniquePinSend: Math.min(sendSuccess, clampInt(uniquePinSend)),
    pinValRequest: valRequest,
    uniquePinValRequest: Math.min(valRequest, clampInt(uniquePinValRequest)),
    pinValSuccess: valSuccess,
    uniquePinVal: Math.min(valSuccess, clampInt(uniquePinVal)),
    held: valHeld,
    sendConversion,
    advCrPercent: pct(valSuccess, sendRequest),
    pubCrPercent: pct(sendConversion, sendRequest),
  };
};

/**
 * One vendor row for campaign detail.
 * API expose: verified/requested (+ pub after hold) plus the PIN leg breakdown.
 * WAP / CG: conversions = operator callbacks (received+sent) or subscribe success.
 * Pub conv % = vendor postbacks actually sent.
 */
export const campaignVendorPerf = ({
  clicks = 0,
  subscribeSuccess = 0,
  postbacksMatched = 0,
  postbacksSent = 0,
  requested = 0,
  liveVerified = 0,
  held = 0,
  failedApi = 0,
  apiExpose = false,
  pinRequest = 0,
  uniquePinSend = 0,
  pinValRequest = 0,
  uniquePinValRequest = 0,
  uniquePinVal = 0,
} = {}) => {
  const totalClicks = Math.max(0, Number(clicks) || 0);
  const matched = Math.max(0, Number(postbacksMatched) || 0);
  const sent = Math.max(0, Number(postbacksSent) || 0);
  const conversionsWap = Math.max(matched, Math.max(0, Number(subscribeSuccess) || 0));
  const otp = otpConversionStats({ requested, liveVerified, held });
  const pin = apiExposePinStats({
    pinRequest,
    pinSendSuccess: otp.requested,
    uniquePinSend,
    pinValRequest,
    uniquePinValRequest,
    pinValSuccess: otp.verifiedLive,
    uniquePinVal,
    held: otp.held,
  });
  return {
    totalClicks,
    conversions: apiExpose ? otp.verifiedLive : conversionsWap,
    convPercent: apiExpose ? otp.liveConvPercent : pct(conversionsWap, totalClicks),
    requestedApi: otp.requested,
    verifiedApi: otp.verifiedLive,
    failedApi: Math.max(0, Number(failedApi) || 0),
    pubConvPercent: apiExpose ? otp.vendorConvPercent : pct(sent, totalClicks),
    ...pin,
  };
};
