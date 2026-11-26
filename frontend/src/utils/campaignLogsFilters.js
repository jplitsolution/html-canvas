import { isApiExposeCampaign, normalizeModeId } from '../components/flow/verificationModes'

export const ALL_BASE_STATUSES = [
  'VISIT',
  'HOME_SHOWN',
  'CONFIRM_SHOWN',
  'OTP_SHOWN',
  'SUBSCRIBED',
  'SUCCESS',
  'FAILED',
  'BLOCKED',
]

export const STANDARD_EVENT_TYPES = [
  'VISIT',
  'HOME_VIEW',
  'CONFIRM_VIEW',
  'CONFIRM_CLICK',
  'SUBSCRIBE_CLICK',
  'OTP_VIEW',
  'OTP_SEND',
  'OTP_VERIFY',
  'ORANGE_BF_SYNC',
  'SUBSCRIBE_SUCCESS',
  'SUBSCRIBE_FAILED',
  'API_ORANGE_BF_CHECKSUB',
  'API_ORANGE_BF_OTP_SEND',
  'API_ORANGE_BF_OTP_VERIFY',
  'API_ORANGE_BF_SYNC',
  'API_DCB_CONFIG',
  'API_DCB_SUBSCRIPTIONS',
  'API_DCB_PINCODE',
  'API_DCB_CONFIRM',
  'API_DCB_EXPOSE_CONFIG_IN',
  'API_DCB_EXPOSE_PINCODE_IN',
  'API_DCB_EXPOSE_CONFIRM_IN',
  'API_DCB_EXPOSE_STATUS_IN',
  'API_OTP_SEND',
  'API_OTP_VERIFY',
  'API_OTP_EXPOSE_SEND_IN',
  'API_OTP_EXPOSE_VERIFY_IN',
  'API_HE_RESOLVE',
  'API_HE_TOKEN',
  'API_HE_MSISDN',
  'API_HE_REDIRECT',
  'API_CHECKSUB',
  'API_SUBSCRIBE',
  'API_CG_REDIRECT',
  'API_DELAYED_CHECKSUB',
  'API_BILLING_CALLBACK',
  'API_VENDOR_POSTBACK',
  'CG_REDIRECT',
  'CHECKSUB_30M',
  'CALLBACK_RECEIVED',
  'POSTBACK_PENDING',
  'POSTBACK_SENT',
  'POSTBACK_FAILED',
  'RATE_LIMIT_HIT',
  'BRUTE_FORCE_ATTEMPT',
  'BLOCKED_REQUEST',
  'BLOCKED',
]

export const FLOW_SPECS = {
  ORANGE_BF: {
    label: 'Orange Burkina Faso (DCB)',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'CONFIRM_VIEW',
      'CONFIRM_CLICK',
      'SUBSCRIBE_CLICK',
      'OTP_VIEW',
      'OTP_SEND',
      'OTP_VERIFY',
      'ORANGE_BF_SYNC',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_ORANGE_BF_CHECKSUB',
      'API_ORANGE_BF_OTP_SEND',
      'API_ORANGE_BF_OTP_VERIFY',
      'API_ORANGE_BF_SYNC',
      'API_ORANGE_BF_UNSUB',
      'API_ORANGE_BF_EXPOSE_CHECK_IN',
      'API_ORANGE_BF_EXPOSE_SEND_IN',
      'API_ORANGE_BF_EXPOSE_VERIFY_IN',
      'API_ORANGE_BF_EXPOSE_UNSUB_IN',
      'API_CHECKSUB',
      'API_SUBSCRIBE',
      'CHECKSUB_30M',
      'API_DELAYED_CHECKSUB',
      'CALLBACK_RECEIVED',
      'API_BILLING_CALLBACK',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'API_VENDOR_POSTBACK',
      'RATE_LIMIT_HIT',
      'BRUTE_FORCE_ATTEMPT',
      'BLOCKED_REQUEST',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'CONFIRM_SHOWN',
      'OTP_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'obf-funnel', label: 'Screen Funnel (Visit → Confirm → OTP → Success)', events: ['VISIT', 'CONFIRM_VIEW', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'] },
      { id: 'obf-screens', label: 'Screens (Home → Confirm → OTP)', events: ['HOME_VIEW', 'CONFIRM_VIEW', 'OTP_VIEW'] },
      { id: 'obf-otp', label: 'OTP: Send vs Verify', events: ['OTP_SEND', 'OTP_VERIFY'] },
      { id: 'obf-checksub', label: 'Visit vs Delayed CheckSub', events: ['VISIT', 'CHECKSUB_30M'] },
    ],
    defaultCompare: ['VISIT', 'CONFIRM_VIEW', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'],
  },
  UNIVERSE_DCB: {
    label: 'Universe Telecom DCB',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'CONFIRM_VIEW',
      'CONFIRM_CLICK',
      'OTP_VIEW',
      'OTP_SEND',
      'OTP_VERIFY',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_DCB_CONFIG',
      'API_DCB_SUBSCRIPTIONS',
      'API_DCB_PINCODE',
      'API_DCB_CONFIRM',
      'API_HE_REDIRECT',
      'CALLBACK_RECEIVED',
      'API_BILLING_CALLBACK',
      'CHECKSUB_30M',
      'API_DELAYED_CHECKSUB',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'API_VENDOR_POSTBACK',
      'RATE_LIMIT_HIT',
      'BLOCKED_REQUEST',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'CONFIRM_SHOWN',
      'OTP_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'dcb-funnel', label: 'DCB Funnel (Visit → PIN → Verify → Success)', events: ['VISIT', 'OTP_SEND', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'] },
      { id: 'dcb-api', label: 'PIN Send vs PIN Confirm', events: ['API_DCB_PINCODE', 'API_DCB_CONFIRM'] },
      { id: 'dcb-conv', label: 'Success vs Postback', events: ['SUBSCRIBE_SUCCESS', 'POSTBACK_SENT'] },
    ],
    defaultCompare: ['VISIT', 'OTP_SEND', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'],
  },
  UNIVERSE_DCB_EXPOSE: {
    label: 'Universe Telecom DCB (API Expose)',
    funnelEvents: [
      'VISIT',
      'OTP_SEND',
      'OTP_VERIFY',
    ],
    apiEvents: [
      'API_DCB_EXPOSE_CONFIG_IN',
      'API_DCB_EXPOSE_PINCODE_IN',
      'API_DCB_EXPOSE_CONFIRM_IN',
      'API_DCB_EXPOSE_STATUS_IN',
      'API_DCB_CONFIG',
      'API_DCB_PINCODE',
      'API_DCB_CONFIRM',
      'API_DCB_SUBSCRIPTIONS',
      'CALLBACK_RECEIVED',
      'API_BILLING_CALLBACK',
      'CHECKSUB_30M',
      'API_DELAYED_CHECKSUB',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'API_VENDOR_POSTBACK',
      'RATE_LIMIT_HIT',
      'BLOCKED_REQUEST',
    ],
    statuses: [
      'OTP_SHOWN',
      'SUCCESS',
      'SUCCESS_SENT',
      'HELD',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'dcb-exp-funnel', label: 'API Funnel (Visit → PIN Send → PIN Confirm)', events: ['VISIT', 'OTP_SEND', 'OTP_VERIFY'] },
      { id: 'dcb-exp-api', label: 'Inbound PIN Send vs Confirm', events: ['API_DCB_EXPOSE_PINCODE_IN', 'API_DCB_EXPOSE_CONFIRM_IN'] },
      { id: 'dcb-exp-cb', label: 'Verify vs Callback', events: ['OTP_VERIFY', 'CALLBACK_RECEIVED'] },
    ],
    defaultCompare: ['VISIT', 'OTP_SEND', 'OTP_VERIFY'],
  },
  OTP_ONLY: {
    label: 'OTP Only Flow',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'CONFIRM_VIEW',
      'CONFIRM_CLICK',
      'SUBSCRIBE_CLICK',
      'OTP_VIEW',
      'OTP_SEND',
      'OTP_VERIFY',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_OTP_SEND',
      'API_OTP_VERIFY',
      'API_CHECKSUB',
      'API_PRIORITY',
      'API_BLOCKLIST',
      'API_SUBSCRIBE',
      'CALLBACK_RECEIVED',
      'API_BILLING_CALLBACK',
      'CHECKSUB_30M',
      'API_DELAYED_CHECKSUB',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'API_VENDOR_POSTBACK',
      'RATE_LIMIT_HIT',
      'BRUTE_FORCE_ATTEMPT',
      'BLOCKED_REQUEST',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'CONFIRM_SHOWN',
      'OTP_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'otp-funnel', label: 'OTP Funnel (Visit → Send → Verify → Success)', events: ['VISIT', 'OTP_SEND', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'] },
      { id: 'otp-screens', label: 'Visit vs Home vs OTP', events: ['VISIT', 'HOME_VIEW', 'OTP_VERIFY'] },
    ],
    defaultCompare: ['VISIT', 'OTP_SEND', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'],
  },
  OTP_ONLY_EXPOSE: {
    label: 'OTP Only (API Expose)',
    funnelEvents: [
      'VISIT',
      'OTP_SEND',
      'OTP_VERIFY',
    ],
    apiEvents: [
      'API_OTP_EXPOSE_SEND_IN',
      'API_OTP_EXPOSE_VERIFY_IN',
      'API_OTP_SEND',
      'API_OTP_VERIFY',
      'API_CHECKSUB',
      'CALLBACK_RECEIVED',
      'API_BILLING_CALLBACK',
      'CHECKSUB_30M',
      'API_DELAYED_CHECKSUB',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'API_VENDOR_POSTBACK',
      'RATE_LIMIT_HIT',
      'BRUTE_FORCE_ATTEMPT',
      'BLOCKED_REQUEST',
    ],
    statuses: [
      'OTP_SHOWN',
      'SUCCESS',
      'SUCCESS_SENT',
      'HELD',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'otp-exp-funnel', label: 'API Funnel (Visit → Send → Verify)', events: ['VISIT', 'OTP_SEND', 'OTP_VERIFY'] },
      { id: 'otp-exp-cb', label: 'Verify vs Callback vs CheckSub', events: ['OTP_VERIFY', 'CALLBACK_RECEIVED', 'CHECKSUB_30M'] },
    ],
    defaultCompare: ['VISIT', 'OTP_SEND', 'OTP_VERIFY'],
  },
  HEADER_INJECTION: {
    label: 'Header Injection',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'CONFIRM_VIEW',
      'CONFIRM_CLICK',
      'SUBSCRIBE_CLICK',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_HE_TOKEN',
      'API_HE_MSISDN',
      'API_HE_RESOLVE',
      'API_HE_REDIRECT',
      'API_RESOLVE_MSISDN',
      'API_CHECKSUB',
      'API_BLOCKLIST',
      'API_PRIORITY',
      'API_SUBSCRIBE',
      'CALLBACK_RECEIVED',
      'API_BILLING_CALLBACK',
      'CHECKSUB_30M',
      'API_DELAYED_CHECKSUB',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'API_VENDOR_POSTBACK',
      'RATE_LIMIT_HIT',
      'BLOCKED_REQUEST',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'CONFIRM_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'he-funnel', label: 'HE Funnel (Visit → Home → Click → Success)', events: ['VISIT', 'HOME_VIEW', 'SUBSCRIBE_CLICK', 'SUBSCRIBE_SUCCESS'] },
    ],
    defaultCompare: ['VISIT', 'HOME_VIEW', 'SUBSCRIBE_CLICK', 'SUBSCRIBE_SUCCESS'],
  },
  BOTH: {
    label: 'Header Injection + OTP',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'CONFIRM_VIEW',
      'CONFIRM_CLICK',
      'SUBSCRIBE_CLICK',
      'OTP_VIEW',
      'OTP_SEND',
      'OTP_VERIFY',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_HE_TOKEN',
      'API_HE_MSISDN',
      'API_HE_RESOLVE',
      'API_HE_REDIRECT',
      'API_RESOLVE_MSISDN',
      'API_CHECKSUB',
      'API_BLOCKLIST',
      'API_PRIORITY',
      'API_SUBSCRIBE',
      'API_OTP_SEND',
      'API_OTP_VERIFY',
      'CALLBACK_RECEIVED',
      'API_BILLING_CALLBACK',
      'CHECKSUB_30M',
      'API_DELAYED_CHECKSUB',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'API_VENDOR_POSTBACK',
      'RATE_LIMIT_HIT',
      'BRUTE_FORCE_ATTEMPT',
      'BLOCKED_REQUEST',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'CONFIRM_SHOWN',
      'OTP_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'both-funnel', label: 'Funnel: Visit → OTP → Success', events: ['VISIT', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'] },
      { id: 'both-he-otp', label: 'Home vs OTP Verify', events: ['HOME_VIEW', 'OTP_VERIFY'] },
    ],
    defaultCompare: ['VISIT', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS'],
  },
  NONE: {
    label: 'Consent Gateway / Redirect',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'SUBSCRIBE_CLICK',
      'CG_REDIRECT',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_CG_REDIRECT',
      'CALLBACK_RECEIVED',
      'API_BILLING_CALLBACK',
      'CHECKSUB_30M',
      'API_DELAYED_CHECKSUB',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'API_VENDOR_POSTBACK',
      'RATE_LIMIT_HIT',
      'BLOCKED_REQUEST',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'visit-cg', label: 'Visit vs CG', events: ['VISIT', 'CG_REDIRECT'] },
      { id: 'visit-cg-cb', label: 'Visit vs CG vs Callback', events: ['VISIT', 'CG_REDIRECT', 'CALLBACK_RECEIVED'] },
      { id: 'visit-cb-pb', label: 'Callback vs Postback', events: ['CALLBACK_RECEIVED', 'POSTBACK_SENT'] },
    ],
    defaultCompare: ['VISIT', 'CG_REDIRECT'],
  },
  CG_HOME: {
    label: 'CG via Home',
    funnelEvents: [
      'VISIT',
      'HOME_VIEW',
      'SUBSCRIBE_CLICK',
      'CG_REDIRECT',
      'SUBSCRIBE_SUCCESS',
      'SUBSCRIBE_FAILED',
    ],
    apiEvents: [
      'API_CG_REDIRECT',
      'API_HE_REDIRECT',
      'CALLBACK_RECEIVED',
      'API_BILLING_CALLBACK',
      'CHECKSUB_30M',
      'API_DELAYED_CHECKSUB',
      'POSTBACK_PENDING',
      'POSTBACK_SENT',
      'POSTBACK_FAILED',
      'API_VENDOR_POSTBACK',
      'RATE_LIMIT_HIT',
      'BLOCKED_REQUEST',
      'BLOCKED',
    ],
    statuses: [
      'VISIT',
      'HOME_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
    ],
    presets: [
      { id: 'visit-cg', label: 'Visit vs CG', events: ['VISIT', 'CG_REDIRECT'] },
      { id: 'visit-home-cg', label: 'Visit vs Home vs CG', events: ['VISIT', 'HOME_VIEW', 'CG_REDIRECT'] },
      { id: 'visit-banner-cg', label: 'Visit vs Banner vs CG', events: ['VISIT', 'SUBSCRIBE_CLICK', 'CG_REDIRECT'] },
    ],
    defaultCompare: ['VISIT', 'HOME_VIEW', 'CG_REDIRECT'],
  },
}

const parseFlowConfig = (raw) => {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Resolve the flow profile (mode + API Expose sub-type) for a selected campaign.
 */
export function resolveCampaignProfile(campaign) {
  if (!campaign) {
    return { flowType: null, isApiExpose: false, specKey: null, flowSpec: null }
  }
  const parsedFlowConfig = parseFlowConfig(campaign.flowConfig ?? campaign.flow_config)
  const normalizedCampaign = parsedFlowConfig
    ? { ...campaign, flowConfig: parsedFlowConfig }
    : campaign
  const flowType = normalizeModeId(normalizedCampaign.verificationMode)
  const isApiExpose = isApiExposeCampaign(normalizedCampaign)
  let specKey = flowType
  if (isApiExpose && flowType === 'OTP_ONLY') specKey = 'OTP_ONLY_EXPOSE'
  if (isApiExpose && flowType === 'UNIVERSE_DCB') specKey = 'UNIVERSE_DCB_EXPOSE'
  const flowSpec = FLOW_SPECS[specKey] || FLOW_SPECS[flowType] || null
  return {
    flowType,
    isApiExpose,
    specKey: flowSpec ? specKey : null,
    flowSpec,
  }
}

export function isForeignFlowEvent(eventType, flowType, options = {}) {
  if (!flowType) return false
  const t = String(eventType).toUpperCase()
  const isApiExpose = Boolean(options?.isApiExpose)

  if (flowType === 'ORANGE_BF') {
    return t.includes('DCB') || t.includes('API_HE') || t.includes('CG_REDIRECT') || t.includes('API_OTP_')
  }
  if (flowType === 'UNIVERSE_DCB') {
    if (
      t.includes('ORANGE_BF') ||
      t.includes('API_HE_') ||
      t.includes('CG_REDIRECT') ||
      t.includes('API_OTP_')
    ) {
      return true
    }
    if (isApiExpose) {
      return (
        t === 'HOME_VIEW' ||
        t === 'PLAN_VIEW' ||
        t === 'CONFIRM_VIEW' ||
        t === 'CONFIRM_CLICK' ||
        t === 'SUBSCRIBE_CLICK' ||
        t === 'OTP_VIEW' ||
        t === 'SUBSCRIBE_SUCCESS' ||
        t === 'SUBSCRIBE_FAILED' ||
        t === 'BLOCKED'
      )
    }
    return t.includes('DCB_EXPOSE_')
  }
  if (flowType === 'OTP_ONLY') {
    if (
      t.includes('ORANGE_BF') ||
      t.includes('DCB') ||
      t.includes('API_HE') ||
      t.includes('CG_REDIRECT')
    ) {
      return true
    }
    if (isApiExpose) {
      return (
        t === 'HOME_VIEW' ||
        t === 'CONFIRM_VIEW' ||
        t === 'CONFIRM_CLICK' ||
        t === 'SUBSCRIBE_CLICK' ||
        t === 'OTP_VIEW' ||
        t === 'SUBSCRIBE_SUCCESS' ||
        t === 'SUBSCRIBE_FAILED' ||
        t === 'API_SUBSCRIBE' ||
        t === 'BLOCKED'
      )
    }
    return t.includes('OTP_EXPOSE_')
  }
  if (flowType === 'HEADER_INJECTION') {
    return (
      t.includes('ORANGE_BF') ||
      t.includes('DCB') ||
      t.includes('CG_REDIRECT') ||
      t.includes('OTP_')
    )
  }
  if (flowType === 'BOTH') {
    return (
      t.includes('ORANGE_BF') ||
      t.includes('DCB') ||
      t.includes('CG_REDIRECT') ||
      t.includes('OTP_EXPOSE_')
    )
  }
  if (flowType === 'NONE' || flowType === 'CG_HOME') {
    return (
      t.includes('ORANGE_BF') ||
      t.includes('DCB') ||
      t.includes('OTP_') ||
      (flowType === 'NONE' && t.includes('API_HE'))
    )
  }
  return false
}

export function eventLabel(type, flowType) {
  if (!type) return ''
  if (flowType === 'ORANGE_BF') {
    const obf = {
      VISIT: 'Ad Visit (Landing)',
      HOME_VIEW: 'Screen 1: Mobile Number Entry',
      CONFIRM_VIEW: 'Screen 2: Confirm Pack',
      CONFIRM_CLICK: 'Screen 2: Confirm Click',
      SUBSCRIBE_CLICK: 'Subscribe Click',
      OTP_VIEW: 'Screen 3: Enter 4-Digit OTP',
      OTP_SEND: 'OTP Sent to User',
      OTP_VERIFY: 'Screen 3: OTP Verified',
      ORANGE_BF_SYNC: 'Orange BF Subscription Sync',
      SUBSCRIBE_SUCCESS: 'Conversion: Subscribed & Charged',
      SUBSCRIBE_FAILED: 'Subscription Failed',
      API_ORANGE_BF_CHECKSUB: 'API: CheckSub (Operator)',
      API_ORANGE_BF_OTP_SEND: 'API: Send OTP (Operator)',
      API_ORANGE_BF_OTP_VERIFY: 'API: Verify OTP (Operator)',
      API_ORANGE_BF_SYNC: 'API: Sync Subscription',
      API_ORANGE_BF_UNSUB: 'API: Unsubscribe',
      API_ORANGE_BF_EXPOSE_CHECK_IN: 'API: Expose CheckSub In',
      API_ORANGE_BF_EXPOSE_SEND_IN: 'API: Expose Send In',
      API_ORANGE_BF_EXPOSE_VERIFY_IN: 'API: Expose Verify In',
      API_ORANGE_BF_EXPOSE_UNSUB_IN: 'API: Expose Unsub In',
      CHECKSUB_30M: 'Delayed CheckSub (30m)',
      API_DELAYED_CHECKSUB: 'API: Delayed CheckSub',
      CALLBACK_RECEIVED: 'Operator Callback Received',
      API_BILLING_CALLBACK: 'API: Billing Callback',
      POSTBACK_PENDING: 'Affiliate Postback Pending',
      POSTBACK_SENT: 'Affiliate Postback Sent',
      POSTBACK_FAILED: 'Affiliate Postback Failed',
      API_VENDOR_POSTBACK: 'API: Vendor Postback',
      RATE_LIMIT_HIT: 'Rate Limit Hit',
      BRUTE_FORCE_ATTEMPT: 'Brute Force Attempt',
      BLOCKED_REQUEST: 'Blocked Request',
      BLOCKED: 'Blocked Traffic',
    }
    if (obf[type]) return obf[type]
  }

  if (flowType === 'UNIVERSE_DCB') {
    const dcb = {
      VISIT: 'Ad Visit (Landing)',
      HOME_VIEW: 'Screen 1: Welcome & Overview',
      PLAN_VIEW: 'Screen 2: Select Pack',
      CONFIRM_VIEW: 'Screen 2: Confirm Pack',
      CONFIRM_CLICK: 'Screen 2: Confirm Click',
      OTP_VIEW: 'Screen 3: Enter PIN Code',
      OTP_SEND: 'PIN Requested',
      OTP_VERIFY: 'Screen 3: Confirm PIN',
      SUBSCRIBE_SUCCESS: 'Conversion: Subscribed & Charged',
      SUBSCRIBE_FAILED: 'Subscription Failed',
      API_DCB_PINCODE: 'API: Send PIN (Universe DCB)',
      API_DCB_CONFIRM: 'API: Confirm PIN (Universe DCB)',
      API_DCB_CONFIG: 'API: DCB Config',
      API_DCB_SUBSCRIPTIONS: 'API: DCB Subscriptions',
      API_DCB_EXPOSE_CONFIG_IN: 'API: Expose Config In',
      API_DCB_EXPOSE_PINCODE_IN: 'API: PIN Send In',
      API_DCB_EXPOSE_CONFIRM_IN: 'API: PIN Confirm In',
      API_DCB_EXPOSE_STATUS_IN: 'API: Expose Status In',
      API_BILLING_CALLBACK: 'API: Billing Callback',
      CALLBACK_RECEIVED: 'Callback Received',
      CHECKSUB_30M: 'Delayed CheckSub (30m)',
      API_DELAYED_CHECKSUB: 'API: Delayed CheckSub',
      POSTBACK_PENDING: 'Affiliate Postback Pending',
      POSTBACK_SENT: 'Affiliate Postback Sent',
      POSTBACK_FAILED: 'Affiliate Postback Failed',
      API_VENDOR_POSTBACK: 'API: Vendor Postback',
      BLOCKED: 'Blocked Traffic',
    }
    if (dcb[type]) return dcb[type]
  }

  if (flowType === 'OTP_ONLY') {
    const otpOnly = {
      VISIT: 'Ad Visit (Landing / API Session)',
      HOME_VIEW: 'Screen 1: Welcome & Mobile Number',
      CONFIRM_VIEW: 'Screen 2: Confirm Pack',
      CONFIRM_CLICK: 'Screen 2: Confirm Click',
      SUBSCRIBE_CLICK: 'Subscribe Click',
      OTP_VIEW: 'Screen 2: Enter OTP',
      OTP_SEND: 'OTP Sent to User',
      OTP_VERIFY: 'OTP Verified',
      SUBSCRIBE_SUCCESS: 'Conversion: Subscribed',
      SUBSCRIBE_FAILED: 'Subscription Failed',
      API_OTP_SEND: 'API: Send OTP Gateway',
      API_OTP_VERIFY: 'API: Verify OTP Gateway',
      API_OTP_EXPOSE_SEND_IN: 'API: Expose OTP Send In',
      API_OTP_EXPOSE_VERIFY_IN: 'API: Expose OTP Verify In',
      API_CHECKSUB: 'API: CheckSub',
      API_PRIORITY: 'API: Priority Check',
      API_BLOCKLIST: 'API: Blocklist Check',
      API_SUBSCRIBE: 'API: Subscribe',
      CALLBACK_RECEIVED: 'Callback Received',
      API_BILLING_CALLBACK: 'API: Billing Callback',
      CHECKSUB_30M: 'Delayed CheckSub (30m)',
      API_DELAYED_CHECKSUB: 'API: Delayed CheckSub',
      POSTBACK_PENDING: 'Affiliate Postback Pending',
      POSTBACK_SENT: 'Affiliate Postback Sent',
      POSTBACK_FAILED: 'Affiliate Postback Failed',
      API_VENDOR_POSTBACK: 'API: Vendor Postback',
      BLOCKED: 'Blocked Traffic',
    }
    if (otpOnly[type]) return otpOnly[type]
  }

  if (flowType === 'HEADER_INJECTION') {
    const he = {
      VISIT: 'Ad Visit (Landing)',
      HOME_VIEW: 'Screen 1: Welcome (HE Number Resolved)',
      CONFIRM_VIEW: 'Screen 2: Confirm Pack',
      CONFIRM_CLICK: 'Screen 2: Confirm Click',
      SUBSCRIBE_CLICK: 'Subscribe Click',
      SUBSCRIBE_SUCCESS: 'Conversion: Subscribed',
      SUBSCRIBE_FAILED: 'Subscription Failed',
      API_HE_RESOLVE: 'API: Resolve Carrier Header',
      API_HE_TOKEN: 'API: Carrier Token',
      API_HE_MSISDN: 'API: Decrypt MSISDN',
      API_HE_REDIRECT: 'API: HE Redirect',
      API_RESOLVE_MSISDN: 'API: Resolve MSISDN',
      API_CHECKSUB: 'API: CheckSub',
      API_BLOCKLIST: 'API: Blocklist Check',
      API_PRIORITY: 'API: Priority Check',
      API_SUBSCRIBE: 'API: Subscribe',
      CALLBACK_RECEIVED: 'Callback Received',
      API_BILLING_CALLBACK: 'API: Billing Callback',
      CHECKSUB_30M: 'Delayed CheckSub (30m)',
      API_DELAYED_CHECKSUB: 'API: Delayed CheckSub',
      POSTBACK_PENDING: 'Affiliate Postback Pending',
      POSTBACK_SENT: 'Affiliate Postback Sent',
      POSTBACK_FAILED: 'Affiliate Postback Failed',
      API_VENDOR_POSTBACK: 'API: Vendor Postback',
      BLOCKED: 'Blocked / Non-Carrier IP',
    }
    if (he[type]) return he[type]
  }

  if (flowType === 'NONE' || flowType === 'CG_HOME') {
    const cg = {
      VISIT: 'Ad Visit (Landing)',
      HOME_VIEW: 'Screen 1: Landing Page',
      SUBSCRIBE_CLICK: 'Continue / Subscribe Click',
      CG_REDIRECT: 'Redirected to Telecom Consent Gateway',
      SUBSCRIBE_SUCCESS: 'Conversion: Operator CG Success',
      SUBSCRIBE_FAILED: 'Gateway Subscription Failed',
      API_CG_REDIRECT: 'API: Consent Gateway Redirect',
      API_HE_REDIRECT: 'API: HE Redirect',
      CALLBACK_RECEIVED: 'Telecom Callback Received',
      API_BILLING_CALLBACK: 'API: Billing Callback',
      CHECKSUB_30M: 'Delayed CheckSub (30m)',
      API_DELAYED_CHECKSUB: 'API: Delayed CheckSub',
      POSTBACK_PENDING: 'Affiliate Postback Pending',
      POSTBACK_SENT: 'Affiliate Postback Sent',
      POSTBACK_FAILED: 'Affiliate Postback Failed',
      API_VENDOR_POSTBACK: 'API: Vendor Postback',
      BLOCKED: 'Blocked Traffic',
    }
    if (cg[type]) return cg[type]
  }

  const standard = {
    VISIT: 'Ad Visit (Landing)',
    HOME_VIEW: 'Screen 1: Home Shown',
    CONFIRM_VIEW: 'Screen 2: Confirm Shown',
    CONFIRM_CLICK: 'Screen 2: Confirm Click',
    SUBSCRIBE_CLICK: 'Subscribe Click',
    OTP_VIEW: 'Screen 3: OTP Box',
    OTP_SEND: 'OTP Send',
    OTP_VERIFY: 'Screen 3: OTP Verify',
    ORANGE_BF_SYNC: 'Orange BF Sync',
    SUBSCRIBE_SUCCESS: 'Subscribe Success (Converted)',
    SUBSCRIBE_FAILED: 'Subscribe Failed',
    CG_REDIRECT: 'CG Redirect',
    CHECKSUB_30M: 'Delayed CheckSub (30m)',
    CALLBACK_RECEIVED: 'Callback Received',
    POSTBACK_PENDING: 'Postback Pending',
    POSTBACK_SENT: 'Postback Sent',
    POSTBACK_FAILED: 'Postback Failed',
    RATE_LIMIT_HIT: 'Rate Limit Hit',
    BRUTE_FORCE_ATTEMPT: 'Brute Force Attempt',
    BLOCKED_REQUEST: 'Blocked Request',
    BLOCKED: 'Blocked',
  }
  return standard[type] || String(type).replace(/_/g, ' ')
}

export function statusLabel(status, flowType, options = {}) {
  const hasHoldStatusOptions = Boolean(options?.hasHoldStatusOptions)
  if (hasHoldStatusOptions) {
    if (status === 'SUCCESS') return 'Success — All (Sent & Held)'
    if (status === 'SUCCESS_SENT') return 'Success — Sent (Not Held)'
    if (status === 'HELD') return 'Success — Held (Withheld)'
  }

  if (flowType === 'ORANGE_BF') {
    const obf = {
      VISIT: '1. Landed (Dropped at Screen 1)',
      HOME_SHOWN: '1. Screen 1: Home / Number Shown',
      CONFIRM_SHOWN: '2. Screen 2: Reached Pack Confirm',
      OTP_SHOWN: '3. Screen 3: Reached OTP Screen',
      SUBSCRIBED: '4. Subscribed & Charged (Success)',
      SUCCESS: '4. Subscribed & Charged (Success)',
      FAILED: 'Failed / Insufficient Balance',
      BLOCKED: 'Blocked (Anti-Fraud / Wrong Carrier)',
      ACTIVE: 'Already Active Subscriber',
    }
    if (obf[status]) return obf[status]
  }

  if (flowType === 'UNIVERSE_DCB') {
    const dcb = {
      VISIT: '1. Landed (Dropped at Landing)',
      HOME_SHOWN: '1. Screen 1: Home Shown',
      CONFIRM_SHOWN: '2. Screen 2: Reached Pack Selection',
      OTP_SHOWN: '3. Screen 3: Reached PIN Entry',
      SUBSCRIBED: '4. Subscribed & Charged (Success)',
      SUCCESS: '4. Subscribed & Charged (Success)',
      FAILED: 'Failed / Insufficient Balance',
      BLOCKED: 'Blocked Traffic',
      ACTIVE: 'Active Subscriber',
      PENDING: 'Pending Confirmation',
    }
    if (dcb[status]) return dcb[status]
  }

  if (flowType === 'OTP_ONLY') {
    const otp = {
      VISIT: '1. Landed (Dropped at Landing)',
      HOME_SHOWN: '1. Screen 1: Home Shown',
      CONFIRM_SHOWN: '2. Confirm Shown',
      OTP_SHOWN: '2. OTP Screen / API Initiated',
      SUBSCRIBED: '3. Subscribed (Success)',
      SUCCESS: '3. Subscribed (Success)',
      FAILED: 'Failed',
      BLOCKED: 'Blocked',
    }
    if (otp[status]) return otp[status]
  }

  if (flowType === 'HEADER_INJECTION') {
    const he = {
      VISIT: '1. Landed (Dropped at Landing)',
      HOME_SHOWN: '1. Screen 1: Home Shown (HE Resolved)',
      CONFIRM_SHOWN: '2. Screen 2: Reached Confirm Pack',
      SUBSCRIBED: '3. Subscribed (Success)',
      SUCCESS: '3. Subscribed (Success)',
      FAILED: 'Failed',
      BLOCKED: 'Blocked (Non-Carrier IP)',
    }
    if (he[status]) return he[status]
  }

  if (flowType === 'NONE' || flowType === 'CG_HOME') {
    const cg = {
      VISIT: '1. Landed (CG Redirected)',
      HOME_SHOWN: '1. Screen 1: Home Shown',
      SUBSCRIBED: '2. Converted (Operator CG Success)',
      SUCCESS: '2. Success',
      FAILED: 'Failed at Operator Gateway',
      BLOCKED: 'Blocked Traffic',
    }
    if (cg[status]) return cg[status]
  }

  const standard = {
    VISIT: 'Visit (Landed)',
    HOME_SHOWN: 'Home Shown',
    CONFIRM_SHOWN: 'Confirm Shown',
    OTP_SHOWN: 'OTP Shown',
    SUBSCRIBED: 'Subscribed (Success)',
    SUCCESS: 'Success',
    SUCCESS_SENT: 'Success — Sent (Not Held)',
    HELD: 'Success — Held (Withheld)',
    FAILED: 'Failed',
    BLOCKED: 'Blocked',
    ACTIVE: 'Active',
    PENDING: 'Pending',
  }
  return standard[status] || status
}

/**
 * Valid Event Types for the selected campaign profile (or all when profile.flowSpec is null).
 */
export function getEventTypeOptions({ profile, aggsByEventType = [] }) {
  if (profile?.flowSpec) {
    const allowed = new Set([...profile.flowSpec.funnelEvents, ...profile.flowSpec.apiEvents])
    for (const item of aggsByEventType) {
      if (
        item?.key &&
        Number(item.count) > 0 &&
        !isForeignFlowEvent(item.key, profile.flowType, { isApiExpose: profile.isApiExpose })
      ) {
        allowed.add(item.key)
      }
    }
    return Array.from(allowed)
  }

  const set = new Set(STANDARD_EVENT_TYPES)
  Object.values(FLOW_SPECS).forEach((spec) => {
    spec.funnelEvents.forEach((ev) => set.add(ev))
    spec.apiEvents.forEach((ev) => set.add(ev))
  })
  for (const item of aggsByEventType) {
    if (item?.key) set.add(item.key)
  }
  return Array.from(set).sort()
}

const EVENT_STATUS_MAP = {
  VISIT: {
    OTP_ONLY_EXPOSE: ['OTP_SHOWN', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED', 'BLOCKED'],
    UNIVERSE_DCB_EXPOSE: ['OTP_SHOWN', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED', 'BLOCKED'],
    NONE: ['VISIT', 'HOME_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'FAILED', 'BLOCKED'],
    DEFAULT: ALL_BASE_STATUSES.concat(['SUCCESS_SENT', 'HELD']),
  },
  HOME_VIEW: {
    DEFAULT: ['HOME_SHOWN', 'CONFIRM_SHOWN', 'OTP_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED', 'BLOCKED'],
  },
  PLAN_VIEW: {
    DEFAULT: ['HOME_SHOWN', 'CONFIRM_SHOWN', 'OTP_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'FAILED', 'BLOCKED'],
  },
  CONFIRM_VIEW: {
    DEFAULT: ['CONFIRM_SHOWN', 'HOME_SHOWN', 'OTP_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED', 'BLOCKED'],
  },
  CONFIRM_CLICK: {
    DEFAULT: ['CONFIRM_SHOWN', 'OTP_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED', 'BLOCKED'],
  },
  OTP_VIEW: {
    DEFAULT: ['OTP_SHOWN', 'HOME_SHOWN', 'CONFIRM_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED', 'BLOCKED'],
  },
  OTP_SEND: {
    OTP_ONLY_EXPOSE: ['OTP_SHOWN', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'],
    UNIVERSE_DCB_EXPOSE: ['OTP_SHOWN', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'],
    DEFAULT: ['VISIT', 'HOME_SHOWN', 'CONFIRM_SHOWN', 'OTP_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'],
  },
  OTP_VERIFY: {
    OTP_ONLY_EXPOSE: ['OTP_SHOWN', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'],
    UNIVERSE_DCB_EXPOSE: ['OTP_SHOWN', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'],
    ORANGE_BF: ['OTP_SHOWN', 'CONFIRM_SHOWN', 'HOME_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'],
    DEFAULT: ['VISIT', 'OTP_SHOWN', 'CONFIRM_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'],
  },
  ORANGE_BF_SYNC: {
    DEFAULT: ['SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'CONFIRM_SHOWN', 'OTP_SHOWN', 'FAILED'],
  },
  SUBSCRIBE_CLICK: {
    CG_HOME: ['HOME_SHOWN', 'VISIT', 'SUBSCRIBED', 'SUCCESS', 'FAILED', 'BLOCKED'],
    NONE: ['HOME_SHOWN', 'VISIT', 'SUBSCRIBED', 'SUCCESS', 'FAILED', 'BLOCKED'],
    DEFAULT: ['HOME_SHOWN', 'CONFIRM_SHOWN', 'OTP_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED', 'BLOCKED'],
  },
  CG_REDIRECT: {
    NONE: ['VISIT', 'HOME_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'FAILED', 'BLOCKED'],
    CG_HOME: ['HOME_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'FAILED', 'BLOCKED'],
    DEFAULT: ['VISIT', 'HOME_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'FAILED', 'BLOCKED'],
  },
  SUBSCRIBE_SUCCESS: {
    ORANGE_BF: ['SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'CONFIRM_SHOWN', 'OTP_SHOWN'],
    DEFAULT: ['SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD'],
  },
  SUBSCRIBE_FAILED: {
    DEFAULT: ['FAILED'],
  },
  BLOCKED: {
    DEFAULT: ['BLOCKED', 'HOME_SHOWN'],
  },
  POST_ACTION: {
    NONE: ['VISIT', 'HOME_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'FAILED'],
    OTP_ONLY_EXPOSE: ['OTP_SHOWN', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'],
    UNIVERSE_DCB_EXPOSE: ['OTP_SHOWN', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'],
    ORANGE_BF: ['CONFIRM_SHOWN', 'OTP_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'],
    DEFAULT: ['VISIT', 'HOME_SHOWN', 'CONFIRM_SHOWN', 'OTP_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'],
  },
}

const EVENT_STATUS_ALIAS = {
  API_OTP_SEND: 'OTP_SEND',
  API_OTP_EXPOSE_SEND_IN: 'OTP_SEND',
  API_DCB_PINCODE: 'OTP_SEND',
  API_DCB_EXPOSE_PINCODE_IN: 'OTP_SEND',
  API_ORANGE_BF_OTP_SEND: 'OTP_SEND',
  API_ORANGE_BF_EXPOSE_SEND_IN: 'OTP_SEND',

  API_OTP_VERIFY: 'OTP_VERIFY',
  API_OTP_EXPOSE_VERIFY_IN: 'OTP_VERIFY',
  API_DCB_CONFIRM: 'OTP_VERIFY',
  API_DCB_EXPOSE_CONFIRM_IN: 'OTP_VERIFY',
  API_ORANGE_BF_OTP_VERIFY: 'OTP_VERIFY',
  API_ORANGE_BF_EXPOSE_VERIFY_IN: 'OTP_VERIFY',

  API_ORANGE_BF_SYNC: 'ORANGE_BF_SYNC',
  API_SUBSCRIBE: 'SUBSCRIBE_SUCCESS',
  API_CG_REDIRECT: 'CG_REDIRECT',

  CALLBACK_RECEIVED: 'POST_ACTION',
  API_BILLING_CALLBACK: 'POST_ACTION',
  CHECKSUB_30M: 'POST_ACTION',
  API_DELAYED_CHECKSUB: 'POST_ACTION',
  POSTBACK_PENDING: 'POST_ACTION',
  POSTBACK_SENT: 'POST_ACTION',
  POSTBACK_FAILED: 'POST_ACTION',
  API_VENDOR_POSTBACK: 'POST_ACTION',
}

const VALID_SESSION_STATUSES = new Set([
  ...ALL_BASE_STATUSES,
  'SUCCESS_SENT',
  'HELD',
])

function buildCampaignStatusList({ profile, hasHoldStatusOptions, aggsByStatus = [] }) {
  const base = profile?.flowSpec?.statuses ? [...profile.flowSpec.statuses] : [...ALL_BASE_STATUSES]
  const set = new Set()

  for (const st of base) {
    if ((st === 'SUCCESS_SENT' || st === 'HELD') && !hasHoldStatusOptions) continue
    set.add(st)
    if (st === 'SUCCESS' && hasHoldStatusOptions) {
      set.add('SUCCESS_SENT')
      set.add('HELD')
    }
  }
  if (hasHoldStatusOptions) {
    set.add('SUCCESS')
    set.add('SUCCESS_SENT')
    set.add('HELD')
  }
  for (const item of aggsByStatus) {
    if (item?.key && Number(item.count) > 0 && VALID_SESSION_STATUSES.has(item.key)) {
      set.add(item.key)
    }
  }
  return Array.from(set)
}

/**
 * Valid Verification Statuses for `(campaign profile, selected eventType)`.
 */
export function getStatusesForEvent({
  profile,
  eventType,
  hasHoldStatusOptions = false,
  aggsByStatus = [],
}) {
  const campaignStatuses = buildCampaignStatusList({
    profile,
    hasHoldStatusOptions,
    aggsByStatus,
  })

  if (!eventType) {
    return campaignStatuses
  }

  const ruleKey = EVENT_STATUS_ALIAS[eventType] || eventType
  const rule = EVENT_STATUS_MAP[ruleKey]
  if (!rule) {
    return campaignStatuses
  }

  const specKey = profile?.specKey || 'DEFAULT'
  const rawAllowed = rule[specKey] || rule.DEFAULT || campaignStatuses
  const allowedSet = new Set(rawAllowed)

  if (!hasHoldStatusOptions) {
    allowedSet.delete('SUCCESS_SENT')
    allowedSet.delete('HELD')
  }

  // Keep campaign status order while restricting to valid statuses for this event.
  const filtered = campaignStatuses.filter((st) => allowedSet.has(st))
  if (filtered.length > 0) {
    return filtered
  }
  return Array.from(allowedSet)
}

/**
 * Vendors available for the selected campaign (`All` returns all vendors).
 */
export function getVendorOptionsForCampaign({
  selectedCampaign,
  allVendors = [],
  knownVendorIds = [],
  aggsByVendor = [],
}) {
  if (!selectedCampaign) {
    return allVendors
  }

  const allowedIds = new Set()
  for (const t of selectedCampaign.trackings || []) {
    const vid = t?.vendorId ?? t?.vendor?.id
    if (vid != null && vid !== '') allowedIds.add(String(vid))
  }
  for (const vid of knownVendorIds) {
    if (vid != null && vid !== '' && vid !== 'null') allowedIds.add(String(vid))
  }
  for (const item of aggsByVendor) {
    if (item?.key != null && item.key !== '' && item.key !== 'null') {
      allowedIds.add(String(item.key))
    }
  }

  if (allowedIds.size === 0) {
    return allVendors
  }

  const byId = new Map(allVendors.map((v) => [String(v.id), v]))
  for (const t of selectedCampaign.trackings || []) {
    if (t?.vendor && t.vendor.id != null && !byId.has(String(t.vendor.id))) {
      byId.set(String(t.vendor.id), t.vendor)
    }
  }

  const result = []
  for (const v of allVendors) {
    if (allowedIds.has(String(v.id))) result.push(v)
  }
  for (const id of allowedIds) {
    if (!result.some((v) => String(v.id) === id) && byId.has(id)) {
      result.push(byId.get(id))
    }
  }
  return result
}
