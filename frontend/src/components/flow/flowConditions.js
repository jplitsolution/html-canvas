export const ALL_CONDITIONS = [
  'DEFAULT',
  'HEADER_RESOLVED',
  'HEADER_UNRESOLVED',
  'OTP_VERIFIED',
  'SUBSCRIBED',
  'PENDING',
  'LOW_BALANCE',
  'BLOCKED',
  'ERROR',
]

const CONDITION_LABELS = {
  DEFAULT: 'Default (next step)',
  HEADER_RESOLVED: 'Header injection OK',
  HEADER_UNRESOLVED: 'Header injection missing',
  // Legacy labels (old saved graphs)
  MSISDN_RESOLVED: 'Header injection OK',
  MSISDN_UNRESOLVED: 'Header injection missing',
  OTP_VERIFIED: 'OTP verified',
  SUBSCRIBED: 'Subscribed',
  BLOCKED: 'Blocked',
  ERROR: 'Error',
}

export function conditionLabel(condition) {
  return CONDITION_LABELS[condition] || condition
}

export function getValidConditions(sourcePageType, verificationMode) {
  switch (sourcePageType) {
    case 'HOME':
      if (verificationMode === 'NONE') {
        return ['DEFAULT', 'SUBSCRIBED', 'PENDING', 'LOW_BALANCE', 'BLOCKED', 'ERROR']
      }
      if (
        verificationMode === 'HEADER_INJECTION' ||
        verificationMode === 'MSISDN_ONLY' ||
        verificationMode === 'BOTH' ||
        verificationMode === 'UNIVERSE_DCB'
      ) {
        return ['HEADER_RESOLVED', 'HEADER_UNRESOLVED', 'SUBSCRIBED', 'PENDING', 'LOW_BALANCE', 'BLOCKED', 'ERROR']
      }
      return ['DEFAULT', 'SUBSCRIBED', 'PENDING', 'LOW_BALANCE', 'BLOCKED', 'ERROR']
    case 'OTP':
      return ['OTP_VERIFIED', 'DEFAULT']
    case 'CONFIRM':
      return ['SUBSCRIBED', 'BLOCKED', 'ERROR', 'DEFAULT']
    default:
      return ['DEFAULT']
  }
}

export function getDefaultCondition(sourcePageType, verificationMode) {
  const valid = getValidConditions(sourcePageType, verificationMode)
  return valid[0] || 'DEFAULT'
}
