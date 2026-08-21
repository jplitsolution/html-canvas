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
