/**
 * How a campaign counts a conversion. One rule per flow so CG callbacks,
 * OTP-payout fires, and classic subscribe hops do not overwrite each other.
 *
 * Dashboard totals = sum of each campaign's own rule.
 */
export const ConversionRule = Object.freeze({
  /** CG / landing CG: operator /callback received. */
  OPERATOR_CALLBACK: 'operator_callback',
  /** Orange BF: vendor CPA fired after OTP success + payout %. */
  OTP_PAYOUT: 'otp_payout',
  /** OTP/DCB API expose: partner PIN/OTP verify (advertiser), pub after hold. */
  API_EXPOSE: 'api_expose',
  /** Classic WAP: subscribe success or operator callback, whichever is higher. */
  SUBSCRIBE_OR_CALLBACK: 'subscribe_or_callback',
});

export function resolveConversionRule(flow, { apiExpose = false } = {}) {
  if (!flow) return ConversionRule.SUBSCRIBE_OR_CALLBACK;
  if (apiExpose && flow.allowsApiExpose) {
    if (flow.conversionRule === ConversionRule.OTP_PAYOUT) {
      return ConversionRule.OTP_PAYOUT;
    }
    return ConversionRule.API_EXPOSE;
  }
  return flow.conversionRule || ConversionRule.SUBSCRIBE_OR_CALLBACK;
}

const n = (value) => Math.max(0, Number(value) || 0);

/**
 * daily_stats grain → conversion count for this flow.
 * Does not mix CG callbacks into Orange BF OTP fires (or vice versa).
 */
export function countFlowConversions(metrics = {}, rule) {
  switch (rule) {
    case ConversionRule.OPERATOR_CALLBACK:
      return n(metrics.billingReceived);
    case ConversionRule.OTP_PAYOUT:
      return n(metrics.vendorSent);
    case ConversionRule.API_EXPOSE:
      return Math.max(n(metrics.vendorSent), n(metrics.subscribeSuccess));
    case ConversionRule.SUBSCRIBE_OR_CALLBACK:
    default:
      return Math.max(n(metrics.subscribeSuccess), n(metrics.billingReceived));
  }
}
