import useStore from '../store/useStore'

export function formatDate(dateString, formatOverride) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString

  const format = formatOverride || useStore.getState().dateFormat || 'YYYY-MM-DD'
  const tz = useStore.getState().timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

  // Shift the date to the selected timezone
  const shiftedDate = new Date(date.toLocaleString('en-US', { timeZone: tz }))

  const pad = (n) => String(n).padStart(2, '0')
  const YYYY = shiftedDate.getFullYear()
  const MM = pad(shiftedDate.getMonth() + 1)
  const DD = pad(shiftedDate.getDate())
  const HH = pad(shiftedDate.getHours())
  const mm = pad(shiftedDate.getMinutes())
  const ss = pad(shiftedDate.getSeconds())

  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const MMM = shortMonths[shiftedDate.getMonth()]

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
