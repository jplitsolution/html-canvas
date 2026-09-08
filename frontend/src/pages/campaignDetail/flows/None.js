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
    'Landings = visits. CG redirects = users sent to the operator CG on landing (no HOME). Conversion = operator billing callback received.',
  statsColumns: [
    totalClicksColumn,
    {
      key: 'cgRedirect',
      label: 'CG redirects',
      hint: 'Redirected to operator CG on landing',
      render: (row) => row.cgRedirect ?? 0,
    },
    {
      key: 'conversions',
      label: 'Conversions',
      hint: 'Operator billing callbacks received',
      render: (row) => row.conversions ?? 0,
    },
    convPercentColumn,
    pubConvPercentColumn,
  ],
  getVendorEndpoints: trackingEndpoints,
  assignmentActions: WAP_ASSIGNMENT_ACTIONS,
}
