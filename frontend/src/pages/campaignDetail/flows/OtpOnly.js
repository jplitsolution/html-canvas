import { isApiExposeEntry } from '../../../components/flow/verificationModes'
import { buildOtpExposeUrls } from '../../../services/api/otp'
import { wapFlowDetail } from './shared/wapClicks'
import { PIN_VENDOR_HINT, pinApiColumns } from './shared/pinApiStats'

const wap = wapFlowDetail('OTP_ONLY')

const apiExpose = {
  id: 'OTP_ONLY',
  variant: 'api_expose',
  vendorHint: PIN_VENDOR_HINT,
  statsColumns: pinApiColumns,
  pinFooter: true,
  getVendorEndpoints({ origin, campaign, vendorId }) {
    const otpUrls = buildOtpExposeUrls(origin, campaign.id, vendorId)
    const copyKey = String(vendorId)
    return [
      { key: `${copyKey}-send`, method: 'POST', label: 'Send', url: otpUrls.sendUrl },
      { key: `${copyKey}-verify`, method: 'POST', label: 'Verify', url: otpUrls.verifyUrl },
    ]
  },
  assignmentActions: {
    downloadApiGuide: 'otp',
  },
}

export default {
  id: 'OTP_ONLY',
  resolve(campaign) {
    return isApiExposeEntry(campaign?.flowConfig?.entryPage) ? apiExpose : wap
  },
}
