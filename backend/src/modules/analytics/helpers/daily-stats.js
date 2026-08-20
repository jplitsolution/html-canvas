export const STAT_METRICS = [
  'visits',
  'msisdnResolved',
  'heFailCg',
  'otpSend',
  'otpVerify',
  'subscribeSuccess',
  'subscribeFailed',
  'postbacksQueued',
  'pending',
  'billingReceived',
  'vendorSent',
  'vendorFailed',
  'skipped',
  'unmatchedCallbacks',
];

export const STAT_GROUP_BY = ['date', 'campaign', 'vendor', 'campaign_vendor'];

export function emptyMetrics() {
  return Object.fromEntries(STAT_METRICS.map((key) => [key, 0]));
}

export function statsGrainKey(campaignId, vendorId) {
  return `${Number(campaignId) || 0}:${Number(vendorId) || 0}`;
}

export function addMetrics(target, extra = {}) {
  const out = target || emptyMetrics();
  for (const key of STAT_METRICS) {
    out[key] = (Number(out[key]) || 0) + (Number(extra[key]) || 0);
  }
  return out;
}

export function eachYmd(fromYmd, toYmd) {
  const start = String(fromYmd || '').slice(0, 10);
  const end = String(toYmd || start).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return [];
  }
  const out = [];
  let cursor = start;
  while (cursor <= end) {
    out.push(cursor);
    const dt = new Date(`${cursor}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() + 1);
    cursor = dt.toISOString().slice(0, 10);
  }
  return out;
}

export function bumpMetric(map, campaignId, vendorId, field, amount = 1) {
  if (!amount) return;
  const key = statsGrainKey(campaignId, vendorId);
  if (!map.has(key)) {
    map.set(key, {
      campaignId: Number(campaignId) || 0,
      vendorId: Number(vendorId) || 0,
      ...emptyMetrics(),
    });
  }
  const row = map.get(key);
  row[field] = (Number(row[field]) || 0) + Number(amount);
}

export function groupStatsRows(rows, groupBy = 'date') {
  const mode = STAT_GROUP_BY.includes(groupBy) ? groupBy : 'date';
  const map = new Map();
  for (const row of rows || []) {
    let key;
    if (mode === 'campaign') key = `c:${Number(row.campaignId) || 0}`;
    else if (mode === 'vendor') key = `v:${Number(row.vendorId) || 0}`;
    else if (mode === 'campaign_vendor') {
      key = `c:${Number(row.campaignId) || 0}|v:${Number(row.vendorId) || 0}`;
    } else {
      key = `d:${row.statDate || row.date || ''}`;
    }
    if (!map.has(key)) {
      map.set(key, {
        key,
        groupBy: mode,
        statDate: mode === 'date' ? row.statDate || row.date || null : null,
        campaignId:
          mode === 'campaign' || mode === 'campaign_vendor'
            ? Number(row.campaignId) || 0
            : null,
        vendorId:
          mode === 'vendor' || mode === 'campaign_vendor'
            ? Number(row.vendorId) || 0
            : null,
        campaignName: row.campaignName || null,
        vendorName: row.vendorName || null,
        vendorCode: row.vendorCode || null,
        ...emptyMetrics(),
      });
    }
    const acc = map.get(key);
    addMetrics(acc, row);
    if (mode === 'campaign' || mode === 'campaign_vendor') {
      acc.campaignName = acc.campaignName || row.campaignName || null;
    }
    if (mode === 'vendor' || mode === 'campaign_vendor') {
      acc.vendorName = acc.vendorName || row.vendorName || null;
      acc.vendorCode = acc.vendorCode || row.vendorCode || null;
    }
  }
  const grouped = [...map.values()];
  grouped.sort((a, b) => {
    if (mode === 'date') return String(b.statDate || '').localeCompare(String(a.statDate || ''));
    return (Number(b.visits) || 0) - (Number(a.visits) || 0);
  });
  return grouped;
}

export function totalsFromRows(rows) {
  return (rows || []).reduce((acc, row) => addMetrics(acc, row), emptyMetrics());
}
