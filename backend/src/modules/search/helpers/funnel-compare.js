export const DEFAULT_COMPARE_EVENTS = ['VISIT', 'CG_REDIRECT'];

const EVENT_KEY_RE = /^[A-Z][A-Z0-9_]{0,47}$/;
const MAX_COMPARE_EVENTS = 4;

export function parseCompareEvents(raw, fallback = DEFAULT_COMPARE_EVENTS) {
  const source = Array.isArray(raw)
    ? raw
    : String(raw || '')
        .split(',')
        .map((s) => s.trim());
  const seen = new Set();
  const out = [];
  for (const item of source) {
    const key = String(item || '')
      .trim()
      .toUpperCase();
    if (!EVENT_KEY_RE.test(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= MAX_COMPARE_EVENTS) break;
  }
  return out.length > 0 ? out : [...fallback];
}

export const emptyFunnelTotals = (eventKeys = DEFAULT_COMPARE_EVENTS) =>
  Object.fromEntries(eventKeys.map((key) => [key, 0]));

export function pivotFunnelTimeSeries(
  rawRows = [],
  eventKeys = DEFAULT_COMPARE_EVENTS,
) {
  const keys = parseCompareEvents(eventKeys);
  const byKey = new Map();
  for (const row of rawRows) {
    const key = row.groupkey == null ? 'null' : String(row.groupkey);
    if (!byKey.has(key)) {
      byKey.set(key, { key, ...emptyFunnelTotals(keys) });
    }
    const eventType = String(row.eventType || row.event_type || '');
    if (eventType in byKey.get(key)) {
      byKey.get(key)[eventType] = Number(row.count) || 0;
    }
  }
  return [...byKey.values()].sort((a, b) =>
    String(a.key).localeCompare(String(b.key)),
  );
}

export function funnelTotalsFromRows(
  rawRows = [],
  eventKeys = DEFAULT_COMPARE_EVENTS,
) {
  const totals = emptyFunnelTotals(parseCompareEvents(eventKeys));
  for (const row of rawRows) {
    const eventType = String(row.eventType || row.event_type || '');
    if (eventType in totals) {
      totals[eventType] += Number(row.count) || 0;
    }
  }
  return totals;
}
