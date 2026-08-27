/**
 * Default WAP vendor stats + tracking link.
 * HE / BOTH / OTP WAP / DCB WAP all start from this; a flow file can replace columns.
 */

export const WAP_VENDOR_HINT =
  'Clicks from landings. Conv % is matched operator callbacks ÷ clicks. Pub conv % is vendor postbacks sent ÷ clicks.'

export const totalClicksColumn = {
  key: 'totalClicks',
  label: 'Total clicks',
  render: (row) => row.totalClicks ?? 0,
}

export const convPercentColumn = {
  key: 'convPercent',
  label: 'Conv %',
  render: (row) => `${Number(row.convPercent || 0).toFixed(1)}%`,
}

export const pubConvPercentColumn = {
  key: 'pubConvPercent',
  label: 'Pub conv %',
  render: (row) => `${Number(row.pubConvPercent || 0).toFixed(1)}%`,
}

export const wapClickColumns = [totalClicksColumn, convPercentColumn, pubConvPercentColumn]

export const WAP_ASSIGNMENT_ACTIONS = {
  openTracking: true,
}

export function trackingEndpoints({ vendorId, displayUrl }) {
  return [{ key: String(vendorId), method: 'GET', label: 'Track', url: displayUrl }]
}

export function wapFlowDetail(id) {
  return {
    id,
    vendorHint: WAP_VENDOR_HINT,
    statsColumns: wapClickColumns,
    getVendorEndpoints: trackingEndpoints,
    assignmentActions: WAP_ASSIGNMENT_ACTIONS,
  }
}
