/**
 * Normalizes OTP / PIN failure errors into clean categories.
 *
 * Typical reasons:
 * - Wrong PIN: user entered incorrect OTP/PIN code, mismatch, SubOTP 1002, DCB wrong PIN
 * - Expired / Timeout: OTP expired (SubOTP 1001), gateway timeout (504), timed out
 * - Rate Limited: too many attempts, HTTP 429, brute force block
 * - Offer Capped: campaign capping reached, held payout cut (clientResponse invalid_otp or DCB_HELD)
 * - Provider Error: HTTP 500/502/503, partner internal error, upstream gateway failure
 * - Invalid Request: missing required parameters, invalid correlation / requestId
 */

export function normalizeFailureReason(meta = {}, eventType = 'OTP_VERIFY') {
  if (!meta || typeof meta !== 'object') {
    return eventType === 'OTP_SEND' ? 'Send Failed' : 'Wrong PIN';
  }

  const errStr = String(
    meta.error || meta.errorMessage || meta.message || '',
  ).trim();
  const codeStr = String(
    meta.code ||
      meta.responseCode ||
      meta.status ||
      meta.statusLabel ||
      '',
  ).trim();
  const clientResponse = String(meta.clientResponse || '').trim().toLowerCase();
  const httpStatus = Number(meta.httpStatus || meta.responseStatus || 0);
  const combined = `${errStr} ${codeStr} ${clientResponse}`.toLowerCase();

  // 1. Offer Capped / Held (check first if held flag is true)
  if (
    meta.held === true ||
    codeStr === 'DCB_HELD' ||
    codeStr === 'OFFER_STOPPED' ||
    /offer.*stop/i.test(combined) ||
    /capp(?:ed|ing)/i.test(combined)
  ) {
    return 'Offer Capped';
  }

  // 2. Wrong PIN / Invalid OTP (SubOTP 1002, INVALID_OTP, incorrect/wrong PIN entered)
  if (
    clientResponse === 'invalid_otp' ||
    codeStr === '1002' ||
    codeStr === 'INVALID_OTP' ||
    codeStr === 'WRONG_PIN' ||
    codeStr === 'PIN_MISMATCH' ||
    codeStr === 'INCORRECT_PIN' ||
    codeStr === 'PIN_FAILED' ||
    /wrong.*pin/i.test(combined) ||
    /invalid.*(?:otp|pin|code)/i.test(combined) ||
    /incorrect.*(?:otp|pin|code)/i.test(combined) ||
    /mismatch/i.test(combined) ||
    /bad.*(?:otp|pin|code)/i.test(combined)
  ) {
    return 'Wrong PIN';
  }

  // 3. Invalid Request / Missing param / Correlation error (check before general expired)
  if (
    codeStr === 'DCB_CORRELATION_REQUIRED' ||
    codeStr === 'DCB_REQUEST_ID_MISMATCH' ||
    codeStr === 'PIN_REQUIRED' ||
    codeStr === 'REQUEST_ID_REQUIRED' ||
    /request[\s_-]?id/i.test(combined) ||
    /correlation/i.test(combined) ||
    /pin is required/i.test(combined) ||
    /missing param/i.test(combined) ||
    /invalid param/i.test(combined)
  ) {
    return 'Invalid Request';
  }

  // 4. Rate Limited / Max attempts / Brute force block (HTTP 429)
  if (
    httpStatus === 429 ||
    /too many/i.test(combined) ||
    /rate[\s_-]?limit/i.test(combined) ||
    /brute/i.test(combined) ||
    /max.*attempt/i.test(combined)
  ) {
    return 'Rate Limited';
  }

  // 5. Expired / Timeout (SubOTP code 1001, HTTP 504, GATEWAY_TIMEOUT)
  if (
    codeStr === '1001' ||
    httpStatus === 504 ||
    /expired/i.test(combined) ||
    /timed?[\s_-]?out/i.test(combined) ||
    /gateway.*timeout/i.test(combined)
  ) {
    return 'Expired / Timeout';
  }

  // 6. Server / Provider Error (HTTP 500, 502, 503)
  if (
    httpStatus === 500 ||
    httpStatus === 502 ||
    httpStatus === 503 ||
    codeStr === '500' ||
    /provider.*error/i.test(combined) ||
    /internal.*server/i.test(combined) ||
    /upstream/i.test(combined) ||
    /bad gateway/i.test(combined) ||
    /server error/i.test(combined)
  ) {
    return 'Provider Error';
  }

  // 7. General HTTP 400/404 invalid request
  if (httpStatus === 400 || httpStatus === 404) {
    if (/not found/i.test(combined) || /missing/i.test(combined) || /required/i.test(combined)) {
      return 'Invalid Request';
    }
  }

  // 8. Clean short custom error string if provided
  if (
    errStr &&
    errStr.length > 0 &&
    errStr.length <= 25 &&
    !/failed|error/i.test(errStr)
  ) {
    return errStr;
  }

  // Fallback defaults
  return eventType === 'OTP_SEND' ? 'Send Failed' : 'Wrong PIN';
}
