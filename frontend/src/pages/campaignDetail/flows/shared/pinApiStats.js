/**
 * PIN send/validate vendor table — OTP API expose and DCB API expose.
 */

export const PIN_VENDOR_HINT =
  'PIN send and PIN validate legs, with unique MSISDN per leg. Send conversion is what the vendor gets after the payout cut. Adv CR is Pin_Val success ÷ Pin request; Pub CR is send conversion ÷ Pin request. Traffic counts only — we do not hold any amount.'

export const PIN_COLUMNS = [
  { key: 'pinRequest', label: 'Pin Request', hint: 'PIN send API calls received' },
  { key: 'pinSendSuccess', label: 'Pin_Send Success', hint: 'PIN sent by the operator' },
  {
    key: 'uniquePinSend',
    label: 'Unique Pin_Send',
    hint: 'Distinct MSISDN with a PIN sent',
    tint: 'bg-accent-muted/40',
  },
  { key: 'pinValRequest', label: 'Pin_Val Request', hint: 'PIN validate API calls received' },
  {
    key: 'uniquePinValRequest',
    label: 'Unique Pin_Val Request',
    hint: 'Distinct MSISDN attempting validation',
    tint: 'bg-accent-muted/40',
  },
  { key: 'pinValSuccess', label: 'Pin_Val Success', hint: 'PIN validated by the operator' },
  {
    key: 'uniquePinVal',
    label: 'Unique Pin_Val',
    hint: 'Distinct MSISDN validated',
    tint: 'bg-accent-muted/40',
  },
  {
    key: 'sendConversion',
    label: 'Send Conversion',
    hint: 'Validations forwarded to the vendor after the payout cut',
    tint: 'bg-success-muted/50',
  },
]

export function sumPinColumns(rows) {
  const totals = Object.fromEntries(PIN_COLUMNS.map((col) => [col.key, 0]))
  for (const row of rows) {
    for (const col of PIN_COLUMNS) totals[col.key] += Number(row?.[col.key]) || 0
  }
  const cr = (num) => (totals.pinRequest > 0 ? (num / totals.pinRequest) * 100 : 0)
  return {
    ...totals,
    advCrPercent: cr(totals.pinValSuccess),
    pubCrPercent: cr(totals.sendConversion),
  }
}

export const pinApiColumns = [
  {
    key: 'cut',
    label: 'Cut',
    muted: true,
    render: (row) => `${100 - Number(row.payoutPercent ?? 100)}%`,
    footer: () => '–',
  },
  ...PIN_COLUMNS.map((col) => ({
    ...col,
    render: (row) => row[col.key] ?? 0,
    footer: (totals) => totals[col.key],
  })),
  {
    key: 'advCrPercent',
    label: 'Adv CR',
    hint: 'Pin_Val success ÷ Pin request',
    render: (row) => `${Number(row.advCrPercent || 0).toFixed(1)}%`,
    footer: (totals) => `${totals.advCrPercent.toFixed(1)}%`,
  },
  {
    key: 'pubCrPercent',
    label: 'Pub CR',
    hint: 'Send conversion ÷ Pin request',
    render: (row) => `${Number(row.pubCrPercent || 0).toFixed(1)}%`,
    footer: (totals) => `${totals.pubCrPercent.toFixed(1)}%`,
  },
]
