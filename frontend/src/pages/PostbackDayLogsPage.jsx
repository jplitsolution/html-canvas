import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
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
} from '../utils/date'
import { getPostbackDayReport, exportPostbackDayReport } from '../services/api/partners'
import useStore from '../store/useStore'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'complete', label: 'Complete (recv + fired)' },
  { id: 'waiting_callback', label: 'Waiting callback' },
  { id: 'fire_failed', label: 'Fire failed' },
  { id: 'he_fail_cg', label: 'No MSISDN → CG' },
  { id: 'callback_no_row', label: 'Callback, no queue' },
  { id: 'not_queued', label: 'Not queued' },
]
const FILTER_IDS = new Set(FILTERS.map((f) => f.id))

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
            {row.outcome === 'he_fail_cg' ? (
              <Flag label="CG redirect" yes fail extra={row.cgUrl || 'fail URL'} />
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

function PostbackDayLogsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState(() => {
    const f = searchParams.get('filter')
    return FILTER_IDS.has(f) ? f : 'all'
  })
  const [expanded, setExpanded] = useState(() => new Set())
  const [exporting, setExporting] = useState(false)
  const addToast = useStore((s) => s.addToast)

  const load = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return
    setLoading(true)
    setError('')
    try {
      const res = await getPostbackDayReport({
        from: dateRange.from,
        to: dateRange.to,
        timezone,
      })
      setData(res)
      setExpanded(new Set())
    } catch (err) {
      setError(err?.message || 'Failed to load day logs')
    } finally {
      setLoading(false)
    }
  }, [dateRange.from, dateRange.to, timezone])

  useEffect(() => {
    load() // eslint-disable-line react-hooks/set-state-in-effect -- fetch on range change
  }, [load])

  const applyDatePreset = (preset) => {
    setDatePreset(preset)
    const next = new URLSearchParams(searchParams)
    next.set('preset', preset)
    if (preset === 'custom') {
      setCustomRange({ from: dateRange.from, to: dateRange.to })
      if (dateRange.from) next.set('from', dateRange.from)
      if (dateRange.to) next.set('to', dateRange.to)
      setSearchParams(next)
      return
    }
    const range = getDateRangeForPreset(preset, timezone)
    next.set('from', range.from)
    next.set('to', range.to)
    setSearchParams(next)
  }

  const updateDateField = (key, value) => {
    setDatePreset('custom')
    setCustomRange((current) => ({ ...current, [key]: value }))
    const next = new URLSearchParams(searchParams)
    next.set('preset', 'custom')
    const from = key === 'from' ? value : customRange.from
    const to = key === 'to' ? value : customRange.to
    if (from) next.set('from', from)
    if (to) next.set('to', to)
    setSearchParams(next)
  }

  const applyFilter = (id) => {
    setFilter(id)
    const next = new URLSearchParams(searchParams)
    if (!id || id === 'all') next.delete('filter')
    else next.set('filter', id)
    setSearchParams(next)
  }

  const exportLogs = async (format) => {
    if (!dateRange.from || !dateRange.to) return
    setExporting(true)
    try {
      const result = await exportPostbackDayReport({
        from: dateRange.from,
        to: dateRange.to,
        timezone,
        format,
      })
      addToast(`Exported ${result.filename}`, 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to export logs', 'error')
    } finally {
      setExporting(false)
    }
  }

  const numbers = useMemo(() => {
    const list = data?.numbers || []
    const needle = q.trim()
    return list.filter((n) => {
      if (filter !== 'all' && n.outcome !== filter) return false
      if (!needle) return true
      const hay = [
        n.msisdn,
        n.clickId,
        n.rcid,
        n.campid,
        n.trackingCampid,
        n.vendorName,
        n.visitId,
        n.cgUrl,
        n.outcome,
        n.heError,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle.toLowerCase())
    })
  }, [data, q, filter])

  const summary = data?.summary
  const file = data?.file

  return (
    <AppShell
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/postbacks')}>
            <ArrowLeft className="w-4 h-4" />
            Postbacks
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
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
            Each click writes a greppable log file on the API server (not your laptop),
            grouped by MSISDN — queued, billing callback received, vendor CPA fired.
            Use <span className="font-medium text-gray-700">No MSISDN → CG</span> to
            see token/resolve failures that still went to the CG page.
            Export CSV/TXT uses the date range above; files are also written on the server.
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
            Date range
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
            </div>
          </div>
        ) : null}

        {data?.fileError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3">
            Server file write failed: {data.fileError}
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <Kpi label="Numbers" value={summary?.numbers} icon={Phone} />
          <Kpi label="Queued" value={summary?.queued} icon={Clock} />
          <Kpi label="Callback received" value={summary?.billingReceived} icon={CheckCircle2} />
          <Kpi label="Callback missing" value={summary?.billingMissing} />
          <Kpi label="Vendor sent" value={summary?.vendorSent} icon={Send} />
          <Kpi label="Fire failed" value={summary?.vendorFailed} icon={XCircle} />
          <button type="button" className="text-left" onClick={() => applyFilter('he_fail_cg')}>
            <Kpi
              label="No MSISDN → CG"
              value={summary?.heFailCg}
              hint="HE resolve failed, sent to CG"
              icon={XCircle}
            />
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => applyFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white w-full sm:w-64"
              placeholder="search msisdn / click / rcid"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">Building day log…</div>
          ) : !numbers.length ? (
            <EmptyState
              icon={FileText}
              title={
                filter === 'he_fail_cg'
                  ? 'No HE fail → CG redirects'
                  : 'No postback logs for this date'
              }
              description={
                filter === 'he_fail_cg'
                  ? 'When token/resolve does not return a number and we send the user to the CG page, those visits show up here.'
                  : 'When a number is queued, billed, fired, or HE-fail redirected to CG, it will show up here.'
              }
            />
          ) : (
            numbers.map((row) => {
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
            })
          )}
        </div>

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
