import useStore from '../store/useStore'

export const DEFAULT_TIMEZONE = 'Asia/Kolkata'

export const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'custom', label: 'Custom' },
]

function getSettings() {
  const state = useStore.getState()
  return {
    format: state.dateFormat || 'YYYY-MM-DD',
    tz: state.timezone || DEFAULT_TIMEZONE,
  }
}

function pad(n) {
  return String(n).padStart(2, '0')
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function buildFormatted(parts, format) {
  const { YYYY, MM, DD, HH, mm, ss, MMM } = parts
  switch (format) {
    case 'YYYY-MM-DD':
      return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`
    case 'DD/MM/YYYY':
      return `${DD}/${MM}/${YYYY} ${HH}:${mm}:${ss}`
    case 'MM/DD/YYYY':
      return `${MM}/${DD}/${YYYY} ${HH}:${mm}:${ss}`
    case 'DD MMM YYYY':
      return `${DD} ${MMM} ${YYYY} ${HH}:${mm}:${ss}`
    case 'YYYY-MM-DD (Date only)':
      return `${YYYY}-${MM}-${DD}`
    case 'DD/MM/YYYY (Date only)':
      return `${DD}/${MM}/${YYYY}`
    case 'MM/DD/YYYY (Date only)':
      return `${MM}/${DD}/${YYYY}`
    case 'DD MMM YYYY (Date only)':
      return `${DD} ${MMM} ${YYYY}`
    default:
      return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`
  }
}

function partsFromDateInTz(date, tz) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const bag = {}
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value
  }
  const monthIdx = Number(bag.month) - 1
  return {
    YYYY: Number(bag.year),
    MM: pad(bag.month),
    DD: pad(bag.day),
    HH: pad(bag.hour),
    mm: pad(bag.minute),
    ss: pad(bag.second),
    MMM: SHORT_MONTHS[monthIdx] || bag.month,
  }
}

function partsFromWallClock(y, mo, d, h = '00', mi = '00', s = '00') {
  const monthIdx = Number(mo) - 1
  return {
    YYYY: Number(y),
    MM: pad(mo),
    DD: pad(d),
    HH: pad(h),
    mm: pad(mi),
    ss: pad(s),
    MMM: SHORT_MONTHS[monthIdx] || mo,
  }
}

export function timezoneAbbr(tz = DEFAULT_TIMEZONE) {
  if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'IST'
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(new Date())
    return parts.find((p) => p.type === 'timeZoneName')?.value || ''
  } catch {
    return ''
  }
}

/** Format a real UTC/ISO timestamp using profile date format + timezone (default IST). */
export function formatDate(dateString, formatOverride) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return String(dateString)

  const { format: storedFormat, tz } = getSettings()
  const format = formatOverride || storedFormat
  const formatted = buildFormatted(partsFromDateInTz(date, tz), format)
  if (String(format).includes('Date only')) return formatted
  const abbr = timezoneAbbr(tz)
  return abbr ? `${formatted} ${abbr}` : formatted
}

/**
 * Format aggregation bucket keys for charts.
 * Keys may already be wall-clock in the user's TZ (SQL) or full ISO (ES).
 */
export function formatChartLabel(key, { hourly = false } = {}) {
  if (key == null || key === '') return '—'
  const s = String(key)
  const { format, tz } = getSettings()

  const bare = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (bare) {
    const [, y, mo, d, h, mi] = bare
    const parts = partsFromWallClock(y, mo, d, h || '00', mi || '00', '00')
    if (hourly && h != null) {
      if (format.startsWith('DD MMM')) return `${parts.DD} ${parts.MMM} ${parts.HH}:${parts.mm}`
      if (format.startsWith('DD/MM')) return `${parts.DD}/${parts.MM} ${parts.HH}:${parts.mm}`
      if (format.startsWith('MM/DD')) return `${parts.MM}/${parts.DD} ${parts.HH}:${parts.mm}`
      return `${parts.HH}:${parts.mm}`
    }
    if (format.startsWith('DD MMM')) return `${parts.DD} ${parts.MMM} ${parts.YYYY}`
    if (format.startsWith('DD/MM')) return `${parts.DD}/${parts.MM}/${parts.YYYY}`
    if (format.startsWith('MM/DD')) return `${parts.MM}/${parts.DD}/${parts.YYYY}`
    return `${parts.YYYY}-${parts.MM}-${parts.DD}`
  }

  const date = new Date(s)
  if (isNaN(date.getTime())) return s

  const parts = partsFromDateInTz(date, tz)
  if (hourly) {
    if (format.startsWith('DD MMM')) return `${parts.DD} ${parts.MMM} ${parts.HH}:${parts.mm}`
    if (format.startsWith('DD/MM')) return `${parts.DD}/${parts.MM} ${parts.HH}:${parts.mm}`
    if (format.startsWith('MM/DD')) return `${parts.MM}/${parts.DD} ${parts.HH}:${parts.mm}`
    return `${parts.HH}:${parts.mm}`
  }
  if (format.startsWith('DD MMM')) return `${parts.DD} ${parts.MMM} ${parts.YYYY}`
  if (format.startsWith('DD/MM')) return `${parts.DD}/${parts.MM}/${parts.YYYY}`
  if (format.startsWith('MM/DD')) return `${parts.MM}/${parts.DD}/${parts.YYYY}`
  return `${parts.YYYY}-${parts.MM}-${parts.DD}`
}

/** Today's YYYY-MM-DD (and ranges) in the given IANA timezone. */
export function getDatePartsInTimezone(timeZone, date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  // en-CA → YYYY-MM-DD
  return fmt.format(date)
}

export function shiftDateString(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

export function getDateRangeForPreset(preset, timezone) {
  const to = getDatePartsInTimezone(timezone || DEFAULT_TIMEZONE)
  if (preset === 'today') return { from: to, to }
  if (preset === 'week') return { from: shiftDateString(to, -6), to }
  if (preset === 'month') return { from: shiftDateString(to, -29), to }
  return { from: '', to: '' }
}
