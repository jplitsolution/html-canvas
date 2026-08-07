const FLOW_FONT =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'

/** Set VITE_FLOW_PAGE_CACHE=false to disable in-memory page prefetch/cache on live funnel. */
const FLOW_PAGE_CACHE_ENABLED =
  String(import.meta.env.VITE_FLOW_PAGE_CACHE ?? 'true').toLowerCase() !== 'false'

const VALID_PACKS = ['daily', 'weekly', 'monthly']
const VALID_PAGES = [
  'HOME',
  'OTP',
  'CONFIRM',
  'THANKYOU',
  'INPROGRESS',
  'LOW_BALANCE',
  'BLOCKED',
  'ERROR',
]

/** Token/API HE: never paint internal HOME or OTP — redirect or status pages only. */
const HE_SUPPRESSED_FUNNEL_PAGES = new Set(['HOME', 'OTP'])

const PRELOAD_BY_PAGE = {
  HOME: ['CONFIRM', 'THANKYOU', 'INPROGRESS', 'LOW_BALANCE', 'ERROR', 'BLOCKED'],
  CONFIRM: ['THANKYOU', 'INPROGRESS', 'LOW_BALANCE', 'ERROR', 'BLOCKED'],
}

export {
  FLOW_FONT,
  FLOW_PAGE_CACHE_ENABLED,
  VALID_PACKS,
  VALID_PAGES,
  HE_SUPPRESSED_FUNNEL_PAGES,
  PRELOAD_BY_PAGE,
}
