/**
 * Unfilled tracker / ads macros (`{}`, `{gclid}`, `{click_id}`, `{campaignid}`).
 * Treat as missing so we do not collapse every Google landing onto one rcid.
 */
const UNFILLED_MACRO_RE = /^\{[a-z0-9_]*\}$/i;

export function isUnfilledTrackingMacro(value) {
  const s = String(value ?? '').trim();
  if (!s) return true;
  return UNFILLED_MACRO_RE.test(s);
}

export function filledTrackingValue(value) {
  const s = String(value ?? '').trim();
  if (!s || isUnfilledTrackingMacro(s)) return '';
  return s;
}
