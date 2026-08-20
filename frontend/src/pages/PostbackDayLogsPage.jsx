import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  HardDrive,
  Phone,
  RefreshCw,
  Search,
  Send,
  FileDown,
  XCircle,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import {
  DATE_PRESETS,
  DEFAULT_TIMEZONE,
  formatChartLabel,
  formatDate,
  getDateRangeForPreset,
  getDatePartsInTimezone,
} from '../utils/date'
import { getPostbackDayReport, getPostbackStats, exportPostbackDayReport } from '../services/api/partners'
import useStore from '../store/useStore'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'complete', label: 'Complete (recv + fired)' },
  { id: 'waiting_callback', label: 'Waiting callback' },
  { id: 'fire_failed', label: 'Fire failed' },
  { id: 'he_fail_cg', label: 'No MSISDN → CG' },
  { id: 'callback_unmatched', label: 'Unmatched callback' },
  { id: 'callback_no_row', label: 'Callback, no queue' },
  { id: 'not_queued', label: 'Not queued' },
]
const HIT_FILTERS = [
  { id: 'all', label: 'All hits' },
  { id: 'billing_callback', label: 'Billing callback' },
  { id: 'vendor_postback', label: 'Vendor fire' },
  { id: 'ok', label: 'Passed' },
  { id: 'failed', label: 'Failed' },
  { id: 'unmatched', label: 'Unmatched' },
  { id: 'with_msisdn', label: 'Number received' },
  { id: 'without_msisdn', label: 'Number missing' },
]
const FILTER_IDS = new Set(FILTERS.map((f) => f.id))
const HIT_FILTER_IDS = new Set(HIT_FILTERS.map((f) => f.id))
const VIEWS = [
  { id: 'hits', label: 'Every hit (datewise)' },
  { id: 'numbers', label: 'By number' },
]
const GROUP_BY = [
  { id: 'date', label: 'By day' },
  { id: 'campaign', label: 'By campaign' },
  { id: 'vendor', label: 'By vendor' },
  { id: 'campaign_vendor', label: 'Campaign × vendor' },
]
const PAGE_SIZE = 50
const SELECT_CLASS =
  'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500'

function ymdOf(value, timezone) {
  if (!value) return 'unknown'
  try {
    return getDatePartsInTimezone(timezone || DEFAULT_TIMEZONE, new Date(value))
  } catch {
    return String(value).slice(0, 10) || 'unknown'
  }
}

function groupByDate(rows, timezone, pickAt) {
  const groups = []
  const map = new Map()
  for (const row of rows) {
    const day = pickAt(row) || 'unknown'
    if (!map.has(day)) {
      const group = { date: day, rows: [] }
      map.set(day, group)
      groups.push(group)
    }
    map.get(day).rows.push(row)
  }
  return groups
}

function rowKeyOf(row) {
  return row.rowKey || row.msisdn || (row.visitId ? `visit:${row.visitId}` : `click:${row.clickId || ''}`)
}

function ynClass(ok, fail) {
  if (fail) return 'bg-rose-50 text-rose-700 border-rose-200'
  if (ok) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-amber-50 text-amber-800 border-amber-200'
}

function Flag({ label, yes, fail, extra }) {
  const text = fail ? 'FAIL' : yes ? 'YES' : 'NO'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${ynClass(yes, fail)}`}
      title={extra || label}
    >
      <span className="uppercase tracking-wide text-[10px] opacity-70">{label}</span>
      {text}
    </span>
  )
}

function Kpi({ label, value, hint, icon: Icon }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">{value ?? 0}</p>
          {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <Icon className="w-4 h-4" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function NumberCard({ row, expanded, onToggle }) {
  const fireFail = row.vendorFireStatus === 'failed'
  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-5 py-3.5 hover:bg-indigo-50/30 flex flex-wrap items-start gap-3"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gray-900">
              {row.msisdn || '(no MSISDN)'}
            </span>
            <Flag
              label="Number"
              yes={Boolean(row.msisdnReceived ?? row.msisdn)}
              extra={row.msisdn || 'no MSISDN on callback'}
            />
            {row.outcome === 'he_fail_cg' ? (
              <Flag label="CG redirect" yes fail extra={row.cgUrl || 'fail URL'} />
            ) : row.outcome === 'callback_unmatched' ? (
              <Flag label="Unmatched" fail extra={row.unmatchedReason || 'not in system'} />
            ) : (
              <>
                <Flag label="Queued" yes={row.queued} extra={row.status || ''} />
                <Flag label="Received" yes={row.billingReceived} extra="billing /callback" />
                <Flag
                  label="Fired"
                  yes={row.vendorFired && !fireFail}
                  fail={fireFail}
                  extra={row.vendorFireStatus}
                />
              </>
            )}
          </div>
          <p className="mt-1.5 text-xs text-gray-600">{row.outcomeLabel}</p>
        </div>
        <div className="text-[11px] text-gray-400 whitespace-nowrap">
          {row.outcome === 'he_fail_cg'
            ? row.visitId
              ? `visit #${row.visitId}`
              : 'HE fail'
            : row.vendorName || '—'}
        </div>
      </button>
      {expanded ? (
        <div className="px-5 pb-4 pl-12 space-y-3">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Status row</dt>
              <dd className="font-mono text-xs">
                {row.postbackId ? `#${row.postbackId}` : 'none'} · {row.status || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Queued at</dt>
              <dd>{formatDate(row.queuedAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Callback received</dt>
              <dd>
                {row.billingReceived
                  ? `${formatDate(row.billingReceivedAt)}${row.billingHttp != null ? ` · HTTP ${row.billingHttp}` : ''}`
                  : 'Not received'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Vendor fire</dt>
              <dd>
                {row.vendorFired
                  ? `${row.vendorFireStatus} · ${formatDate(row.vendorFiredAt)}${row.vendorHttp != null ? ` · HTTP ${row.vendorHttp}` : ''}`
                  : 'Not fired'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">click_id / rcid</dt>
              <dd className="font-mono text-xs break-all">
                {row.clickId || '—'} / {row.rcid || '—'}
              </dd>
            </div>
            {row.cgUrl || row.redirectedToCg ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">CG / fail URL</dt>
                <dd className="font-mono text-xs break-all">{row.cgUrl || '—'}</dd>
              </div>
            ) : null}
            {row.heError ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">HE error</dt>
                <dd className="text-xs text-rose-600 whitespace-pre-wrap">{row.heError}</dd>
              </div>
            ) : null}
            {row.unmatchedReason ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">Unmatched reason</dt>
                <dd className="text-xs text-rose-600">{row.unmatchedReason}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Visit</dt>
              <dd>
                {row.visitId ? (
                  <Link
                    to={`/analytics/visits/${row.visitId}`}
                    className="text-indigo-600 hover:underline"
                  >
                    #{row.visitId}
                  </Link>
                ) : (
                  '—'
                )}
                {row.postbackId ? (
                  <>
                    {' · '}
                    <Link
                      to={`/postbacks/${row.postbackId}`}
                      className="text-indigo-600 hover:underline"
                    >
                      postback #{row.postbackId}
                    </Link>
                  </>
                ) : null}
              </dd>
            </div>
          </dl>
          {row.vendorUrl ? (
            <p className="text-[11px] font-mono text-gray-600 break-all">URL: {row.vendorUrl}</p>
          ) : null}
          {row.vendorError ? (
            <p className="text-xs text-rose-600 whitespace-pre-wrap">{row.vendorError}</p>
          ) : null}
          {row.timeline?.length ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                Timeline (logs)
              </p>
              <ul className="space-y-1">
                {row.timeline.map((ev, idx) => (
                  <li
                    key={`${ev.type}-${idx}-${ev.at}`}
                    className="text-xs border border-gray-100 rounded-lg px-3 py-1.5 flex flex-wrap gap-x-3 gap-y-0.5"
                  >
                    <span className="text-gray-400 whitespace-nowrap">{formatDate(ev.at)}</span>
                    <span className="font-mono font-medium text-indigo-700">{ev.type}</span>
                    <span className={ev.ok === false ? 'text-rose-600' : 'text-gray-600'}>
                      {ev.detail}
                    </span>
                    {ev.url ? (
                      <span className="font-mono text-gray-400 break-all w-full"> {ev.url}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No api_call_logs / visit_events on this date.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function HitRow({ hit }) {
  const fail = !hit.ok || hit.unmatched
  return (
    <div className="px-5 py-3 border-b border-gray-50 last:border-0 flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-gray-500 whitespace-nowrap">
            {formatDate(hit.at)}
          </span>
          <span className="font-mono text-sm font-semibold text-gray-900">
            {hit.callType === 'vendor_postback' ? 'Vendor fire' : 'Billing callback'}
          </span>
          <Flag
            label={hit.statusLabel || (fail ? 'FAIL' : 'OK')}
            yes={hit.ok && !hit.unmatched}
            fail={fail}
          />
          <Flag
            label="Number"
            yes={Boolean(hit.msisdnReceived)}
            extra={hit.msisdn || 'no MSISDN'}
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-600">
          {hit.msisdn ? (
            <span className="font-mono font-medium text-gray-800">{hit.msisdn}</span>
          ) : (
            <span className="text-amber-700">Number not received</span>
          )}
          {hit.clickId ? (
            <span className="font-mono text-gray-500"> · click {hit.clickId}</span>
          ) : null}
          {hit.visitId ? (
            <>
              {' · '}
              <Link
                to={`/analytics/visits/${hit.visitId}`}
                className="text-indigo-600 hover:underline"
              >
                visit #{hit.visitId}
              </Link>
            </>
          ) : null}
          {hit.http != null ? <span className="text-gray-400"> · HTTP {hit.http}</span> : null}
        </p>
        {hit.reason ? <p className="mt-1 text-xs text-rose-600">{hit.reason}</p> : null}
        {hit.url ? (
          <p className="mt-1 font-mono text-[11px] text-gray-400 break-all">{hit.url}</p>
        ) : null}
      </div>
    </div>
  )
}

function StatsTable({ rows, groupBy, totals, onDrill }) {
  const showDate = groupBy === 'date'
  const showCampaign = groupBy === 'campaign' || groupBy === 'campaign_vendor'
  const showVendor = groupBy === 'vendor' || groupBy === 'campaign_vendor'
  const cols = [
    showDate ? { key: 'date', label: 'Date' } : null,
    showCampaign ? { key: 'campaign', label: 'Campaign' } : null,
    showVendor ? { key: 'vendor', label: 'Vendor' } : null,
    { key: 'visits', label: 'Visits' },
    { key: 'heFailCg', label: 'HE→CG' },
    { key: 'postbacksQueued', label: 'Queued' },
    { key: 'billingReceived', label: 'Billing' },
    { key: 'vendorSent', label: 'Sent' },
    { key: 'vendorFailed', label: 'Failed' },
    { key: 'unmatchedCallbacks', label: 'Unmatched' },
  ].filter(Boolean)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Breakdown</h3>
        <p className="text-[11px] text-gray-400">Click a row to open matching hits / numbers</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-400 bg-gray-50/80">
              {cols.map((col) => (
                <th key={col.key} className="text-left font-semibold px-4 py-2 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row) => (
              <tr
                key={row.key}
                className="border-t border-gray-50 hover:bg-indigo-50/40 cursor-pointer"
                onClick={() => onDrill(row)}
              >
                {showDate ? (
                  <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">
                    {row.statDate}
                  </td>
                ) : null}
                {showCampaign ? (
                  <td className="px-4 py-2 text-gray-700">{row.campaignName || '—'}</td>
                ) : null}
                {showVendor ? (
                  <td className="px-4 py-2 text-gray-700">
                    {row.vendorName || '—'}
                    {row.vendorCode ? (
                      <span className="text-gray-400 font-mono text-[11px]"> · {row.vendorCode}</span>
                    ) : null}
                  </td>
                ) : null}
                <td className="px-4 py-2 tabular-nums">{row.visits || 0}</td>
                <td className="px-4 py-2 tabular-nums">{row.heFailCg || 0}</td>
                <td className="px-4 py-2 tabular-nums">{row.postbacksQueued || 0}</td>
                <td className="px-4 py-2 tabular-nums">{row.billingReceived || 0}</td>
                <td className="px-4 py-2 tabular-nums text-emerald-700">{row.vendorSent || 0}</td>
                <td className="px-4 py-2 tabular-nums text-rose-700">{row.vendorFailed || 0}</td>
                <td className="px-4 py-2 tabular-nums">{row.unmatchedCallbacks || 0}</td>
              </tr>
            ))}
            {totals && rows?.length ? (
              <tr className="border-t border-gray-200 bg-gray-50/70 font-semibold">
                <td className="px-4 py-2" colSpan={Math.max(1, cols.length - 7)}>
                  Total
                </td>
                <td className="px-4 py-2 tabular-nums">{totals.visits || 0}</td>
                <td className="px-4 py-2 tabular-nums">{totals.heFailCg || 0}</td>
                <td className="px-4 py-2 tabular-nums">{totals.postbacksQueued || 0}</td>
                <td className="px-4 py-2 tabular-nums">{totals.billingReceived || 0}</td>
                <td className="px-4 py-2 tabular-nums">{totals.vendorSent || 0}</td>
                <td className="px-4 py-2 tabular-nums">{totals.vendorFailed || 0}</td>
                <td className="px-4 py-2 tabular-nums">{totals.unmatchedCallbacks || 0}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {!rows?.length ? (
        <p className="px-5 py-6 text-sm text-gray-500 text-center">
          No rolled-up stats for this range yet. Totals appear after traffic, or on the next refresh.
        </p>
      ) : null}
    </div>
  )
}

function PostbackDayLogsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
  const campaigns = useStore((s) => s.campaigns) || []
  const vendors = useStore((s) => s.vendors) || []
  const fetchCampaigns = useStore((s) => s.fetchCampaigns)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const [datePreset, setDatePreset] = useState(
    () => searchParams.get('preset') || 'today',
  )
  const [customRange, setCustomRange] = useState(() => {
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (from && to) return { from, to }
    return getDateRangeForPreset('today', timezone)
  })
  const dateRange =
    datePreset === 'custom'
      ? customRange
      : getDateRangeForPreset(datePreset, timezone)

  const [data, setData] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState(() => searchParams.get('q') || '')
  const [searchDraft, setSearchDraft] = useState(() => searchParams.get('q') || '')
  const [filter, setFilter] = useState(() => {
    const f = searchParams.get('filter')
    return FILTER_IDS.has(f) ? f : 'all'
  })
  const [hitFilter, setHitFilter] = useState(() => {
    const f = searchParams.get('hitFilter')
    return HIT_FILTER_IDS.has(f) ? f : 'all'
  })
  const [view, setView] = useState(() => {
    const v = searchParams.get('view')
    if (v === 'hits' || v === 'numbers') return v
    const f = searchParams.get('filter')
    return FILTER_IDS.has(f) && f !== 'all' ? 'numbers' : 'hits'
  })
  const [campaignId, setCampaignId] = useState(() => searchParams.get('campaignId') || '')
  const [vendorId, setVendorId] = useState(() => searchParams.get('vendorId') || '')
  const [groupBy, setGroupBy] = useState(() => {
    const g = searchParams.get('groupBy')
    return GROUP_BY.some((x) => x.id === g) ? g : 'date'
  })
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page'), 10) || 1))
  const [expanded, setExpanded] = useState(() => new Set())
  const [exporting, setExporting] = useState(false)
  const addToast = useStore((s) => s.addToast)

  useEffect(() => {
    fetchCampaigns().catch(() => {})
    fetchVendors().catch(() => {})
  }, [fetchCampaigns, fetchVendors])

  const reportParams = useMemo(
    () => ({
      from: dateRange.from,
      to: dateRange.to,
      timezone,
      campaignId: campaignId || undefined,
      vendorId: vendorId || undefined,
      outcome: filter,
      hitType: hitFilter,
      q: q || undefined,
      view,
      page,
      limit: PAGE_SIZE,
    }),
    [
      dateRange.from,
      dateRange.to,
      timezone,
      campaignId,
      vendorId,
      filter,
      hitFilter,
      q,
      view,
      page,
    ],
  )

  const load = useCallback(async ({ writeFile = false } = {}) => {
    if (!dateRange.from || !dateRange.to) return
    setLoading(true)
    setError('')
    try {
      const [statsRes, res] = await Promise.all([
        getPostbackStats({
          from: dateRange.from,
          to: dateRange.to,
          timezone,
          campaignId: campaignId || undefined,
          vendorId: vendorId || undefined,
          groupBy,
        }),
        getPostbackDayReport({ ...reportParams, writeFile }),
      ])
      setStats(statsRes)
      setData(res)
      setExpanded(new Set())
    } catch (err) {
      setError(err?.message || 'Failed to load day logs')
    } finally {
      setLoading(false)
    }
  }, [dateRange.from, dateRange.to, timezone, campaignId, vendorId, groupBy, reportParams])

  useEffect(() => {
    load() // eslint-disable-line react-hooks/set-state-in-effect -- fetch on filter change
  }, [load])

  const patchParams = (mutate) => {
    const next = new URLSearchParams(searchParams)
    mutate(next)
    setSearchParams(next)
  }

  const applyDatePreset = (preset) => {
    setDatePreset(preset)
    setPage(1)
    if (preset === 'custom') {
      setCustomRange({ from: dateRange.from, to: dateRange.to })
      patchParams((next) => {
        next.set('preset', preset)
        next.set('page', '1')
        if (dateRange.from) next.set('from', dateRange.from)
        if (dateRange.to) next.set('to', dateRange.to)
      })
      return
    }
    const range = getDateRangeForPreset(preset, timezone)
    setCustomRange(range)
    patchParams((next) => {
      next.set('preset', preset)
      next.set('page', '1')
      next.set('from', range.from)
      next.set('to', range.to)
    })
  }

  const updateDateField = (key, value) => {
    setDatePreset('custom')
    setPage(1)
    setCustomRange((current) => ({ ...current, [key]: value }))
    patchParams((next) => {
      next.set('preset', 'custom')
      next.set('page', '1')
      const from = key === 'from' ? value : customRange.from
      const to = key === 'to' ? value : customRange.to
      if (from) next.set('from', from)
      if (to) next.set('to', to)
    })
  }

  const applyFilter = (id) => {
    setFilter(id)
    setPage(1)
    patchParams((next) => {
      next.set('page', '1')
      if (!id || id === 'all') next.delete('filter')
      else next.set('filter', id)
    })
  }

  const applyHitFilter = (id) => {
    setHitFilter(id)
    setPage(1)
    patchParams((next) => {
      next.set('page', '1')
      if (!id || id === 'all') next.delete('hitFilter')
      else next.set('hitFilter', id)
    })
  }

  const applyView = (id) => {
    setView(id)
    setPage(1)
    patchParams((next) => {
      next.set('view', id)
      next.set('page', '1')
    })
  }

  const applyCampaign = (id) => {
    setCampaignId(id)
    setPage(1)
    patchParams((next) => {
      next.set('page', '1')
      if (id) next.set('campaignId', id)
      else next.delete('campaignId')
    })
  }

  const applyVendor = (id) => {
    setVendorId(id)
    setPage(1)
    patchParams((next) => {
      next.set('page', '1')
      if (id) next.set('vendorId', id)
      else next.delete('vendorId')
    })
  }

  const applyGroupBy = (id) => {
    setGroupBy(id)
    patchParams((next) => next.set('groupBy', id))
  }

  const applySearch = (value) => {
    const nextQ = value.trim()
    setQ(nextQ)
    setPage(1)
    patchParams((next) => {
      next.set('page', '1')
      if (nextQ) next.set('q', nextQ)
      else next.delete('q')
    })
  }

  const drillStatsRow = (row) => {
    setPage(1)
    if (row.statDate) {
      setDatePreset('custom')
      setCustomRange({ from: row.statDate, to: row.statDate })
    }
    if (row.campaignId) setCampaignId(String(row.campaignId))
    if (row.vendorId) setVendorId(String(row.vendorId))
    setView('hits')
    patchParams((next) => {
      next.set('view', 'hits')
      next.set('page', '1')
      if (row.statDate) {
        next.set('preset', 'custom')
        next.set('from', row.statDate)
        next.set('to', row.statDate)
      }
      if (row.campaignId) next.set('campaignId', String(row.campaignId))
      if (row.vendorId) next.set('vendorId', String(row.vendorId))
    })
  }

  const exportLogs = async (format) => {
    if (!dateRange.from || !dateRange.to) return
    setExporting(true)
    try {
      const result = await exportPostbackDayReport({
        ...reportParams,
        format,
      })
      addToast(`Exported ${result.filename}`, 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to export logs', 'error')
    } finally {
      setExporting(false)
    }
  }

  const numbers = data?.numbers || []
  const hits = data?.hits || []

  const numberGroups = useMemo(
    () =>
      groupByDate(numbers, timezone, (row) =>
        ymdOf(
          row.queuedAt || row.billingReceivedAt || row.heRedirectedAt || row.vendorFiredAt,
          timezone,
        ),
      ),
    [numbers, timezone],
  )

  const hitGroups = useMemo(
    () => groupByDate(hits, timezone, (row) => row.date || ymdOf(row.at, timezone)),
    [hits, timezone],
  )

  const summary = data?.summary
  const file = data?.file
  const totalRows = data?.total || 0
  const totalPages = Math.max(1, data?.totalPages || 1)

  const goToPage = (nextPage) => {
    const safe = Math.min(totalPages, Math.max(1, nextPage))
    setPage(safe)
    patchParams((next) => next.set('page', String(safe)))
  }

  return (
    <AppShell
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/postbacks')}>
            <ArrowLeft className="w-4 h-4" />
            Postbacks
          </Button>
          <Button variant="outline" size="sm" onClick={() => load({ writeFile: true })} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Rewrite on server
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportLogs('csv')}
            disabled={exporting || loading}
          >
            <FileDown className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportLogs('txt')}
            disabled={exporting || loading}
          >
            <FileText className="w-4 h-4" />
            Export TXT
          </Button>
        </div>
      }
    >
      <div className="page-container space-y-6">
        <div className="page-header">
          <h1 className="page-header-title">Postback day logs</h1>
          <p className="page-header-description">
            Daily totals come from a rolled-up stats table (fast, survives archive).
            Apply campaign / vendor / outcome filters, then drill to every hit or
            every MSISDN. Elasticsearch stays optional for funnel log search — it is
            not the report store.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3">
            {error}
          </div>
        ) : null}

        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Date range & filters
          </h3>
          <div>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyDatePreset(preset.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                    datePreset === preset.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-gray-50/60 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {datePreset !== 'custom' && dateRange.from && dateRange.to ? (
              <p className="mt-2 text-[11px] text-gray-400 font-medium">
                Showing {formatChartLabel(dateRange.from)} → {formatChartLabel(dateRange.to)}
                {timezone ? ` · ${timezone === 'Asia/Kolkata' ? 'IST' : timezone}` : ''}
                {data?.generatedAt ? ` · generated ${formatDate(data.generatedAt)}` : ''}
              </p>
            ) : null}
          </div>

          {datePreset === 'custom' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">From Date</label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                    value={dateRange.from}
                    onChange={(e) => updateDateField('from', e.target.value)}
                  />
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">To Date</label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                    value={dateRange.to}
                    onChange={(e) => updateDateField('to', e.target.value)}
                  />
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Campaign</label>
              <select
                className={SELECT_CLASS}
                value={campaignId}
                onChange={(e) => applyCampaign(e.target.value)}
              >
                <option value="">All campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.trackingId || `${c.country} / ${c.operator}`} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Vendor</label>
              <select
                className={SELECT_CLASS}
                value={vendorId}
                onChange={(e) => applyVendor(e.target.value)}
              >
                <option value="">All vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.name}{v.code ? ` (${v.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Breakdown</label>
              <select
                className={SELECT_CLASS}
                value={groupBy}
                onChange={(e) => applyGroupBy(e.target.value)}
              >
                {GROUP_BY.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => exportLogs('csv')}
              disabled={exporting || loading || !dateRange.from || !dateRange.to}
            >
              <FileDown className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
              {exporting ? 'Exporting…' : 'Export logs'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportLogs('txt')}
              disabled={exporting || loading || !dateRange.from || !dateRange.to}
            >
              <FileText className="w-4 h-4" />
              Export TXT
            </Button>
          </div>
        </div>

        {file ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 flex items-start gap-3">
            <HardDrive className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-900">Log file written on server</p>
              <p className="mt-1 font-mono text-xs text-emerald-900 break-all">{file.absolutePath}</p>
              <p className="mt-1 text-[11px] text-emerald-800">
                {file.filename}
                {file.bytes != null ? ` · ${file.bytes} bytes` : ''}
                {file.writtenAt ? ` · ${formatDate(file.writtenAt)}` : ''}
                {' · overwrite same range on Rewrite'}
              </p>
              <p className="mt-1 text-[11px] text-emerald-800">
                Live hits also append to{' '}
                <span className="font-mono">postback-hits-YYYY-MM-DD.txt</span> in the same folder
                (every callback / vendor fire, pass or fail).
              </p>
            </div>
          </div>
        ) : null}

        {data?.fileError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3">
            Server file write failed: {data.fileError}
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <Kpi
            label="Visits"
            value={stats?.totals?.visits}
            hint="Rolled-up daily stats"
            icon={Clock}
          />
          <button type="button" className="text-left" onClick={() => applyView('hits')}>
            <Kpi label="Hits" value={summary?.hitCount} hint="Every callback + fire" icon={FileText} />
          </button>
          <Kpi label="Callback hits" value={summary?.billingHits} icon={CheckCircle2} />
          <button
            type="button"
            className="text-left"
            onClick={() => {
              applyView('hits')
              applyHitFilter('unmatched')
            }}
          >
            <Kpi
              label="Unmatched"
              value={summary?.unmatched ?? summary?.callbackUnmatched}
              hint="click_id / msisdn not in system"
            />
          </button>
          <button
            type="button"
            className="text-left"
            onClick={() => {
              applyView('hits')
              applyHitFilter('with_msisdn')
            }}
          >
            <Kpi label="Number received" value={summary?.withMsisdn} icon={Phone} />
          </button>
          <button
            type="button"
            className="text-left"
            onClick={() => {
              applyView('hits')
              applyHitFilter('without_msisdn')
            }}
          >
            <Kpi label="Number missing" value={summary?.withoutMsisdn} />
          </button>
          <Kpi label="Vendor sent" value={summary?.vendorSent} icon={Send} />
          <Kpi label="Fire failed" value={summary?.hitFailed ?? summary?.vendorFailed} icon={XCircle} />
          <button
            type="button"
            className="text-left"
            onClick={() => {
              applyView('numbers')
              applyFilter('he_fail_cg')
            }}
          >
            <Kpi
              label="No MSISDN → CG"
              value={summary?.heFailCg}
              hint="HE resolve failed, sent to CG"
              icon={XCircle}
            />
          </button>
        </div>

        <StatsTable
          rows={stats?.rows || []}
          groupBy={stats?.groupBy || groupBy}
          totals={stats?.totals}
          onDrill={drillStatsRow}
        />

        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => applyView(v.id)}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                  view === v.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-gray-50/60 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(view === 'hits' ? HIT_FILTERS : FILTERS).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => (view === 'hits' ? applyHitFilter(f.id) : applyFilter(f.id))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    (view === 'hits' ? hitFilter : filter) === f.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative flex gap-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white w-full sm:w-64"
                placeholder="msisdn / click / rcid — Enter"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applySearch(searchDraft)
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => applySearch(searchDraft)}
              >
                Search
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">Building day log…</div>
          ) : view === 'hits' && !hits.length ? (
            <EmptyState
              icon={FileText}
              title="No callback / postback hits for this date"
              description="Every operator /callback and every vendor fire (pass or fail) shows up here, including when the number was not received."
            />
          ) : view === 'numbers' && !numbers.length ? (
            <EmptyState
              icon={FileText}
              title={
                filter === 'he_fail_cg'
                  ? 'No HE fail → CG redirects'
                  : filter === 'callback_unmatched'
                    ? 'No unmatched callbacks'
                    : 'No postback logs for this date'
              }
              description={
                filter === 'he_fail_cg'
                  ? 'When token/resolve does not return a number and we send the user to the CG page, those visits show up here.'
                  : 'When a number is queued, billed, fired, unmatched, or HE-fail redirected to CG, it will show up here.'
              }
            />
          ) : view === 'hits' ? (
            hitGroups.map((group) => (
              <div key={group.date}>
                <div className="px-5 py-2 bg-gray-50/80 border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {formatChartLabel(group.date)} · {group.rows.length} hit
                  {group.rows.length === 1 ? '' : 's'}
                </div>
                {group.rows.map((hit, idx) => (
                  <HitRow key={`${hit.id || hit.at}-${idx}`} hit={hit} />
                ))}
              </div>
            ))
          ) : (
            numberGroups.map((group) => (
              <div key={group.date}>
                {numberGroups.length > 1 ? (
                  <div className="px-5 py-2 bg-gray-50/80 border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {formatChartLabel(group.date)} · {group.rows.length}
                  </div>
                ) : null}
                {group.rows.map((row) => {
                  const key = rowKeyOf(row)
                  return (
                    <NumberCard
                      key={key}
                      row={row}
                      expanded={expanded.has(key)}
                      onToggle={() => {
                        setExpanded((prev) => {
                          const next = new Set(prev)
                          if (next.has(key)) next.delete(key)
                          else next.add(key)
                          return next
                        })
                      }}
                    />
                  )
                })}
              </div>
            ))
          )}
        </div>

        {totalRows > 0 ? (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>
              {totalRows} {view === 'hits' ? 'hits' : 'numbers'}
              {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}
            </p>
            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {data?.rangeClamped ? (
          <p className="text-xs text-amber-700">
            Range limited to 93 days from the start date. Pick a shorter custom range if needed.
          </p>
        ) : null}
        {data?.truncated ? (
          <p className="text-xs text-amber-700">
            File truncated at 1500 numbers. Narrow the date range if you need a smaller slice.
          </p>
        ) : null}
      </div>
    </AppShell>
  )
}

export default memo(PostbackDayLogsPage)
