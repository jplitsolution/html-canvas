/**
 * Orange Burkina Faso response normalizer & business code mapping.
 *
 * REST Endpoints:
 * - /subapi/auth/otp/generate
 * - /subapi/auth/otp/validate
 * - /subapi/checksub
 * - /subapi/unsub
 * - /Subs_Engine/subscription/sync
 */

export const ORANGE_BF_OUTCOMES = Object.freeze({
  SUCCESS: 'SUCCESS',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  OTP_SENT: 'OTP_SENT',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MISMATCH: 'OTP_MISMATCH',
  ENGINE_NOT_FOUND: 'ENGINE_NOT_FOUND',
  FAILED: 'FAILED',
});

export const ORANGE_BF_RESPONSE_CODES = Object.freeze({
  0: 'Success',
  1001: 'OTP is invalid or expired',
  1002: 'OTP value does not match',
  2001: 'Subscription engine returned failure status (not found)',
  500: 'Internal server error',
});

export function normalizeOrangeBfResponse(raw, config = {}) {
  if (!raw || typeof raw !== 'object') {
    return {
      success: false,
      outcome: ORANGE_BF_OUTCOMES.FAILED,
      responseCode: '500',
      responseMessage: 'Invalid response format from partner',
      transactionId: null,
      timestamp: null,
      data: null,
    };
  }

  const successKey = config.successKey || config.success_key || 'responseCode';
  const successValue = String(config.successValue ?? config.success_value ?? '0').trim();

  const code = String(raw[successKey] ?? raw.responseCode ?? raw.response_code ?? '500').trim();
  const message = raw.responseMessage || raw.response_message || raw.message || ORANGE_BF_RESPONSE_CODES[code] || 'Unknown';
  const data = raw.data && typeof raw.data === 'object' ? raw.data : null;
  const transactionId = raw.transactionId ? String(raw.transactionId) :
    raw.transaction_id ? String(raw.transaction_id) :
    raw.requestId ? String(raw.requestId) :
    raw.request_id ? String(raw.request_id) :
    raw.referenceId ? String(raw.referenceId) :
    raw.reference_id ? String(raw.reference_id) :
    raw.token ? String(raw.token) :
    raw.sessionId ? String(raw.sessionId) :
    raw.session_id ? String(raw.session_id) :
    raw.otpId ? String(raw.otpId) :
    raw.otp_id ? String(raw.otp_id) :
    raw.id ? String(raw.id) :
    (data?.engineTransactionId ? String(data.engineTransactionId) : null);
  const timestamp = raw.timestamp ? String(raw.timestamp) : null;

  // 1. Success response (code === "0")
  if (code === successValue) {
    // Check if checksub response
    if (data && (data.subscriptionStatus !== undefined || data.currentStatus !== undefined || data.status !== undefined)) {
      const isAct = String(data.subscriptionStatus || '').toLowerCase() === 'active' ||
                    String(data.currentStatus || '').toLowerCase() === 'active' ||
                    String(data.status || '').toLowerCase() === 'active';
      return {
        success: true,
        outcome: isAct ? ORANGE_BF_OUTCOMES.ACTIVE : ORANGE_BF_OUTCOMES.INACTIVE,
        responseCode: code,
        responseMessage: message,
        transactionId,
        timestamp,
        data,
      };
    }

    return {
      success: true,
      outcome: ORANGE_BF_OUTCOMES.SUCCESS,
      responseCode: code,
      responseMessage: message,
      transactionId,
      timestamp,
      data,
    };
  }

  // 2. OTP invalid or expired (1001)
  if (code === '1001') {
    return {
      success: false,
      outcome: ORANGE_BF_OUTCOMES.OTP_EXPIRED,
      responseCode: code,
      responseMessage: message || 'OTP is invalid or expired',
      transactionId,
      timestamp,
      data,
    };
  }

  // 3. OTP value does not match (1002)
  if (code === '1002') {
    return {
      success: false,
      outcome: ORANGE_BF_OUTCOMES.OTP_MISMATCH,
      responseCode: code,
      responseMessage: message || 'OTP is invalid',
      transactionId,
      timestamp,
      data,
    };
  }

  // 4. Engine returned non-successful status (2001) -> e.g. notFound
  if (code === '2001') {
    return {
      success: false,
      outcome: ORANGE_BF_OUTCOMES.ENGINE_NOT_FOUND,
      responseCode: code,
      responseMessage: message || 'Subscription engine returned failure status (not found)',
      transactionId,
      timestamp,
      data,
    };
  }

  // 5. Internal error or other code
  return {
    success: false,
    outcome: ORANGE_BF_OUTCOMES.FAILED,
    responseCode: code,
    responseMessage: message || 'Internal server error',
    transactionId,
    timestamp,
    data,
  };
}
