import { wapFlowDetail } from './shared/wapClicks'

const wap = wapFlowDetail('ORANGE_BF')

export const orangeBfFlowDetail = {
  ...wap,
  id: 'ORANGE_BF',
  isFlowLocked: true,
  vendorHint: 'Orange Burkina Faso (+226) VAS OTP & CheckSub flow. Postbacks fire on successful OTP validation subject to vendor approval percentage.',
  getVendorEndpoints({ origin, campaign, vendorId }) {
    const base = `${origin}/flow/api/orange-bf`
    const copyKey = String(vendorId || 'all')
    return [
      { key: `${copyKey}-check`, method: 'POST', label: 'CheckSub', url: `${base}/check?campid=${campaign.id}` },
      { key: `${copyKey}-send`, method: 'POST', label: 'Send OTP', url: `${base}/otp/send?campid=${campaign.id}` },
      { key: `${copyKey}-verify`, method: 'POST', label: 'Verify OTP', url: `${base}/otp/verify?campid=${campaign.id}` },
      { key: `${copyKey}-unsub`, method: 'POST', label: 'Unsubscribe', url: `${base}/unsub?campid=${campaign.id}` },
    ]
  },
  assignmentActions: {
    downloadApiGuide: 'orange-bf',
    downloadHtmlScreen: false,
    openHtmlScreen: false,
  },
}

export default {
  id: 'ORANGE_BF',
  resolve() {
    return orangeBfFlowDetail
  },
}
