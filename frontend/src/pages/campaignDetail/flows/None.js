import {
  convPercentColumn,
  pubConvPercentColumn,
  totalClicksColumn,
  trackingEndpoints,
  WAP_ASSIGNMENT_ACTIONS,
} from './shared/wapClicks'

/** Landing → CG redirect (no HOME). Extra CG-redirect column on vendor stats. */
export default {
  id: 'NONE',
  vendorHint:
    'Landings = visits. CG redirects = users sent to the operator CG on landing (no HOME). Conv % is matched operator callbacks ÷ clicks.',
  statsColumns: [
    totalClicksColumn,
    {
      key: 'cgRedirect',
      label: 'CG redirects',
      hint: 'Redirected to operator CG on landing',
      render: (row) => row.cgRedirect ?? 0,
    },
    convPercentColumn,
    pubConvPercentColumn,
  ],
  getVendorEndpoints: trackingEndpoints,
  assignmentActions: WAP_ASSIGNMENT_ACTIONS,
}
