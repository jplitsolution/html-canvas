export const ALL_CONDITIONS = [
  'DEFAULT',
  'HEADER_RESOLVED',
  'HEADER_UNRESOLVED',
  'MANUAL_MSISDN_REQUIRED',
  'OTP_VERIFIED',
  'MSISDN_CHECKED',
  'PIN_REQUESTED',
  'PIN_CONFIRMED',
  'ENTITLED',
  'ACTIVATED',
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
  MANUAL_MSISDN_REQUIRED: 'No HE → enter number',
  // Legacy labels (old saved graphs)
  MSISDN_RESOLVED: 'Header injection OK',
  MSISDN_UNRESOLVED: 'Header injection missing',
  OTP_VERIFIED: 'OTP verified',
  MSISDN_CHECKED: 'then choose pack',
  PIN_REQUESTED: 'then enter PIN',
  PIN_CONFIRMED: 'then wait for activation',
  ENTITLED: 'Already entitled',
  ACTIVATED: 'Subscription activated',
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
      if (verificationMode === 'UNIVERSE_DCB') {
        return ['PIN_REQUESTED', 'ENTITLED', 'LOW_BALANCE', 'BLOCKED', 'ERROR']
      }
      if (verificationMode === 'NONE' || verificationMode === 'CG_HOME') {
        return ['DEFAULT', 'SUBSCRIBED', 'PENDING', 'LOW_BALANCE', 'BLOCKED', 'ERROR']
      }
      if (
        verificationMode === 'HEADER_INJECTION' ||
        verificationMode === 'MSISDN_ONLY' ||
        verificationMode === 'BOTH'
      ) {
        return ['HEADER_RESOLVED', 'HEADER_UNRESOLVED', 'SUBSCRIBED', 'PENDING', 'LOW_BALANCE', 'BLOCKED', 'ERROR']
      }
      return ['DEFAULT', 'SUBSCRIBED', 'PENDING', 'LOW_BALANCE', 'BLOCKED', 'ERROR']
    case 'OTP':
      if (verificationMode === 'UNIVERSE_DCB') {
        return ['MSISDN_CHECKED', 'PIN_CONFIRMED', 'ERROR']
      }
      return ['OTP_VERIFIED', 'DEFAULT']
    case 'INPROGRESS':
      if (verificationMode === 'UNIVERSE_DCB') {
        return ['ACTIVATED', 'PENDING', 'LOW_BALANCE', 'ERROR']
      }
      return ['DEFAULT']
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
