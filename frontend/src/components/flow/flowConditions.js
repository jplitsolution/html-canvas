export const ALL_CONDITIONS = [
  'DEFAULT',
  'MSISDN_RESOLVED',
  'MSISDN_UNRESOLVED',
  'OTP_VERIFIED',
  'SUBSCRIBED',
  'BLOCKED',
  'ERROR',
]

const CONDITION_LABELS = {
  DEFAULT: 'Default (next step)',
  MSISDN_RESOLVED: 'Phone resolved',
  MSISDN_UNRESOLVED: 'Phone not resolved',
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
      if (verificationMode === 'MSISDN_ONLY') {
        return ['MSISDN_RESOLVED', 'MSISDN_UNRESOLVED']
      }
      return ['DEFAULT']
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
