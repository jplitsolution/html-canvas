import { memo, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  RefreshCw,
  Search,
  Eye,
  Phone,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Store,
  Calendar,
  Filter,
  FileDown,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import {
  formatDate,
  formatChartLabel,
  DATE_PRESETS,
  getDateRangeForPreset,
  DEFAULT_TIMEZONE,
} from '../utils/date'
import { getPostbackSummary, listPostbacks } from '../services/api/partners'
import useStore from '../store/useStore'

const PAGE_SIZE = 25
const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'sent', label: 'Sent' },
  { id: 'failed', label: 'Failed' },
  { id: 'skipped', label: 'Skipped' },
]

function statusBadge(status) {
  const s = String(status || '').toLowerCase()
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium'
  if (s === 'sent') return `${base} bg-emerald-50 text-emerald-700`
  if (s === 'pending') return `${base} bg-amber-50 text-amber-700`
  if (s === 'failed') return `${base} bg-rose-50 text-rose-700`
  if (s === 'skipped') return `${base} bg-slate-100 text-slate-600`
  return `${base} bg-slate-100 text-slate-700`
}

function KpiCard({ label, value, icon: Icon, hint }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">{value ?? '—'}</p>
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

function PostbacksPage() {
  const navigate = useNavigate()
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
  const [summary, setSummary] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const [vendorId, setVendorId] = useState('')
  const [q, setQ] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [datePreset, setDatePreset] = useState('month')
  const [dateRange, setDateRange] = useState(() =>
    getDateRangeForPreset('month', timezone),
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rangeParams = {
        from: dateRange.from || undefined,
        to: dateRange.to || undefined,
        timezone,
      }
      const [sum, list] = await Promise.all([
        getPostbackSummary(rangeParams),
        listPostbacks({
          page,
          limit: PAGE_SIZE,
          status,
          q,
          vendorId: vendorId || undefined,
          ...rangeParams,
        }),
      ])
      setSummary(sum)
      setItems(list?.items || [])
      setTotal(list?.total || 0)
    } catch (err) {
      setError(err?.message || 'Failed to load postbacks')
    } finally {
      setLoading(false)
    }
  }, [page, status, q, vendorId, dateRange.from, dateRange.to, timezone])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (datePreset === 'custom' || !timezone) return
    const range = getDateRangeForPreset(datePreset, timezone)
    setDateRange((current) => {
      if (current.from === range.from && current.to === range.to) return current
      return range
    })
  }, [timezone, datePreset])

  const applyDatePreset = (preset) => {
    setDatePreset(preset)
    setPage(1)
    if (preset === 'custom') return
    setDateRange(getDateRangeForPreset(preset, timezone))
  }

  const updateDateField = (key, value) => {
    setDatePreset('custom')
    setPage(1)
    setDateRange((current) => ({ ...current, [key]: value }))
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <AppShell
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/postbacks/day-logs')}
          >
            <FileDown className="w-4 h-4" />
            Today&apos;s logs
          </Button>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </>
      }
    >
      <div className="page-container space-y-6">
        <div className="page-header">
          <h1 className="page-header-title">Postbacks</h1>
          <p className="page-header-description">
            MSISDN resolve → postback queue → billing callback → vendor CPA fire.
            Use <span className="font-medium text-gray-700">Today&apos;s logs</span> to
            write a per-number file on the server (queued / callback received / vendor fired).
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="MSISDN resolved"
            value={summary?.msisdnResolved}
            icon={Phone}
            hint="Visits with phone"
          />
          <KpiCard
            label="Postbacks created"
            value={summary?.postbacksCreated}
            icon={Send}
          />
          <KpiCard label="Pending" value={summary?.pending} icon={Clock} />
          <KpiCard label="Sent to vendor" value={summary?.sent} icon={CheckCircle2} />
          <KpiCard label="Failed" value={summary?.failed} icon={XCircle} />
        </div>

        {summary?.byVendor?.length > 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50/40">
              <Store className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-gray-800">By vendor</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="px-5 py-2.5 font-medium">Vendor</th>
                    <th className="px-3 py-2.5 font-medium">Total</th>
                    <th className="px-3 py-2.5 font-medium">Pending</th>
                    <th className="px-3 py-2.5 font-medium">Sent</th>
                    <th className="px-3 py-2.5 font-medium">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byVendor.map((v) => (
                    <tr
                      key={v.vendorId ?? 'unknown'}
                      className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer"
                      onClick={() => {
                        setVendorId(v.vendorId ? String(v.vendorId) : '')
                        setPage(1)
                      }}
                    >
                      <td className="px-5 py-2.5">
                        <div className="font-medium text-gray-900">{v.vendorName}</div>
                        {v.vendorCode ? (
                          <div className="text-xs text-gray-400 font-mono">{v.vendorCode}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{v.total}</td>
                      <td className="px-3 py-2.5 tabular-nums text-amber-700">{v.pending}</td>
                      <td className="px-3 py-2.5 tabular-nums text-emerald-700">{v.sent}</td>
                      <td className="px-3 py-2.5 tabular-nums text-rose-700">{v.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </h3>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Date Range</label>
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

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setStatus(f.id)
                    setPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    status === f.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              {vendorId ? (
                <button
                  type="button"
                  onClick={() => {
                    setVendorId('')
                    setPage(1)
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                >
                  Clear vendor filter
                </button>
              ) : null}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                setQ(searchDraft.trim())
                setPage(1)
              }}
            >
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white w-56"
                  placeholder="msisdn / click / rcid / campid"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </form>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
          {loading && !items.length ? (
            <div className="p-10 text-center text-sm text-gray-500">Loading…</div>
          ) : !items.length ? (
            <EmptyState
              title="No postbacks yet"
              description="When HE detect creates a pending row (status new), it will show up here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50/40">
                    <th className="px-5 py-3 font-medium">Created</th>
                    <th className="px-3 py-3 font-medium">MSISDN</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Vendor</th>
                    <th className="px-3 py-3 font-medium">Click ID</th>
                    <th className="px-3 py-3 font-medium">RCID</th>
                    <th className="px-3 py-3 font-medium">Campid</th>
                    <th className="px-3 py-3 font-medium text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-50 hover:bg-indigo-50/30 cursor-pointer"
                      onClick={() => navigate(`/postbacks/${row.id}`)}
                    >
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-800">{row.msisdn || '—'}</td>
                      <td className="px-3 py-3">
                        <span className={statusBadge(row.status)}>{row.status}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-gray-800">{row.vendorName || '—'}</div>
                        {row.vendorCode ? (
                          <div className="text-[11px] text-gray-400 font-mono">{row.vendorCode}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-gray-800 max-w-[160px] truncate" title={row.clickId || ''}>
                        {row.clickId || '—'}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-gray-800 max-w-[180px] truncate" title={row.rcid || ''}>
                        {row.rcid || '—'}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-gray-600">
                        {row.campid || '—'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/postbacks/${row.id}`)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-600">
              <span>
                Page {page} of {totalPages} · {total} total
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <p className="text-xs text-gray-400">
          Billing callback docs:{' '}
          <Link to="/docs/callbacks" className="text-indigo-600 hover:underline">
            Callbacks
          </Link>
        </p>
      </div>
    </AppShell>
  )
}

export default memo(PostbacksPage)
