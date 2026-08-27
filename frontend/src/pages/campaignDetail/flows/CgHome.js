import {
  convPercentColumn,
  pubConvPercentColumn,
  totalClicksColumn,
  trackingEndpoints,
  WAP_ASSIGNMENT_ACTIONS,
} from './shared/wapClicks'

/** HOME first, Subscribe → CG. Extra home / banner / CG columns. */
export default {
  id: 'CG_HOME',
  vendorHint:
    'Landings = visits. Home shown = HOME page loaded. Banner clicks = subscribe CTA. CG redirects = users sent to the operator CG URL. Conv % is matched operator callbacks ÷ clicks.',
  statsColumns: [
    totalClicksColumn,
    {
      key: 'homeView',
      label: 'Home shown',
      hint: 'HOME page loaded',
      render: (row) => row.homeView ?? 0,
    },
    {
      key: 'subscribeClick',
      label: 'Banner clicks',
      hint: 'Subscribe / banner CTA',
      render: (row) => row.subscribeClick ?? 0,
    },
    {
      key: 'cgRedirect',
      label: 'CG redirects',
      hint: 'Redirected to operator CG',
      render: (row) => row.cgRedirect ?? 0,
    },
    convPercentColumn,
    pubConvPercentColumn,
  ],
  getVendorEndpoints: trackingEndpoints,
  assignmentActions: WAP_ASSIGNMENT_ACTIONS,
}
