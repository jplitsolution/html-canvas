const UNFILLED_MACRO_RE = /^\{[a-z0-9_]*\}$/i

/** Drop unfilled `{}` / `{gclid}` so Google Ads landings are unique visits. */
export function filledTrackingValue(value) {
  const s = String(value ?? '').trim()
  if (!s || UNFILLED_MACRO_RE.test(s)) return ''
  return s
}
