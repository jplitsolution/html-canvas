/** Partner-successes shown as success to the API-expose client. Default 100 = no hold. */
export const DEFAULT_PAYOUT_PERCENT = 100;

export const HELD_OTP_MESSAGE =
  'OTP mismatch. Please check the code and try again.';

export const parsePayoutPercent = (value) => {
  if (value == null || value === '') return DEFAULT_PAYOUT_PERCENT;
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PAYOUT_PERCENT;
  return Math.min(100, Math.max(0, Math.round(n)));
};

/**
 * Bresenham lattice: after n partner-successes, shown count is floor(n * P / 100).
 * n <= 0 (Redis down) fail-opens to payout.
 */
export const shouldPayoutOtp = (n, payoutPercent) => {
  const p = parsePayoutPercent(payoutPercent);
  if (p >= 100) return true;
  const seq = Number(n);
  if (!Number.isFinite(seq) || seq <= 0) return true;
  if (p <= 0) return false;
  return Math.floor((seq * p) / 100) > Math.floor(((seq - 1) * p) / 100);
};

export const payoutSeqKey = (campaignId) => `otp:payout:n:${campaignId}`;
