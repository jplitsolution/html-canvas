import { isApiExposeEntry } from '../../../components/flow/verificationModes'
import { buildDcbExposeUrls } from '../../../services/api/dcbExpose'
import { wapFlowDetail } from './shared/wapClicks'
import { PIN_VENDOR_HINT, pinApiColumns } from './shared/pinApiStats'

const wap = wapFlowDetail('UNIVERSE_DCB')

const apiExpose = {
  id: 'UNIVERSE_DCB',
  variant: 'api_expose',
  vendorHint: PIN_VENDOR_HINT,
  statsColumns: pinApiColumns,
  pinFooter: true,
  getVendorEndpoints({ origin, campaign, vendorId }) {
    const dcbUrls = buildDcbExposeUrls(origin, campaign.id, vendorId)
    const copyKey = String(vendorId)
    return [
      { key: `${copyKey}-config`, method: 'GET', label: 'Config', url: dcbUrls.configUrl },
      { key: `${copyKey}-pin`, method: 'POST', label: 'PIN', url: dcbUrls.pincodeUrl },
      { key: `${copyKey}-confirm`, method: 'POST', label: 'Confirm', url: dcbUrls.confirmUrl },
      { key: `${copyKey}-status`, method: 'GET', label: 'Status', url: dcbUrls.statusUrl },
      { key: `${copyKey}-screen`, method: 'GET', label: 'Screen', url: dcbUrls.screenUrl },
    ]
  },
  assignmentActions: {
    downloadApiGuide: 'dcb',
    downloadHtmlScreen: true,
    openHtmlScreen: true,
  },
}

export default {
  id: 'UNIVERSE_DCB',
  resolve(campaign) {
    return isApiExposeEntry(campaign?.flowConfig?.entryPage) ? apiExpose : wap
  },
}
