export const DEFAULT_TIMEZONE = 'Asia/Kolkata'

export function normalizeTimezone(timeZone) {
  if (!timeZone) return DEFAULT_TIMEZONE
  if (timeZone === 'Asia/Calcutta') return 'Asia/Kolkata'
  return timeZone
}

/** Convert YYYY-MM-DD in `timeZone` to a UTC Date at start or end of that local day. */
export function zonedDayBound(dateStr, timeZone, bound) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim())
  if (!match) {
    const fallback = new Date(dateStr)
    if (bound === 'end' && dateStr && !String(dateStr).includes('T')) {
      fallback.setUTCHours(23, 59, 59, 999)
    }
    return fallback
  }
  const y = Number(match[1])
  const mo = Number(match[2])
  const d = Number(match[3])
  const hour = bound === 'end' ? 23 : 0
  const minute = bound === 'end' ? 59 : 0
  const second = bound === 'end' ? 59 : 0

  const tz = normalizeTimezone(timeZone)
  let utcMs = Date.UTC(y, mo - 1, d, hour, minute, second, 0)

  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(utcMs))

    const num = (type) => Number(parts.find((p) => p.type === type)?.value || '0')
    const seen = Date.UTC(
      num('year'),
      num('month') - 1,
      num('day'),
      num('hour'),
      num('minute'),
      num('second'),
    )
    const desired = Date.UTC(y, mo - 1, d, hour, minute, second)
    const diff = desired - seen
    utcMs += diff
    if (diff === 0) break
  }

  return new Date(bound === 'end' ? utcMs + 999 : utcMs)
}

export function resolveRangeBounds(params = {}, defaultTz = DEFAULT_TIMEZONE) {
  const tz = normalizeTimezone(params.timezone || defaultTz)
  return {
    from: params.from ? zonedDayBound(params.from, tz, 'start') : undefined,
    to: params.to ? zonedDayBound(params.to, tz, 'end') : undefined,
  }
}
