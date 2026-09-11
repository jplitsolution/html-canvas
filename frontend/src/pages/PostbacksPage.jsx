import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  RefreshCw,
  Search,
  Eye,
  Phone,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  FileDown,
  Inbox,
  Zap,
  RotateCcw,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import SearchableSelect from '../components/ui/SearchableSelect'
import {
  formatDate,
  DATE_PRESETS,
  getDateRangeForPreset,
  DEFAULT_TIMEZONE,
} from '../utils/date'
import { getPostbackSummary, listPostbacks, exportPostbackDayReport, firePostback } from '../services/api/partners'
import useStore from '../store/useStore'

const PAGE_SIZE = 25
const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'received', label: 'Received' },
  { id: 'sent', label: 'Sent' },
  { id: 'failed', label: 'Failed' },
  { id: 'skipped', label: 'Skipped' },
]

function operatorStatusBadge(status) {
  const s = String(status || '').toLowerCase()
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium'
  if (s === 'active' || s === 'success' || s === 'subscribed') return `${base} bg-emerald-50 text-emerald-700`
  if (s === 'grace' || s === 'parking') return `${base} bg-amber-50 text-amber-800`
  if (s.includes('unsub') || s === 'cancel' || s === 'cancelled') return `${base} bg-slate-100 text-slate-600`
  if (!s) return `${base} bg-slate-100 text-slate-400`
  return `${base} bg-indigo-50 text-indigo-700`
}

function statusBadge(status) {
  const s = String(status || '').toLowerCase()
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium'
  if (s === 'sent') return `${base} bg-emerald-50 text-emerald-700`
  if (s === 'received') return `${base} bg-sky-50 text-sky-700`
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
  const [searchParams, setSearchParams] = useSearchParams()
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
  const campaigns = useStore((s) => s.campaigns)
  const fetchCampaigns = useStore((s) => s.fetchCampaigns)
  const vendors = useStore((s) => s.vendors)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const [summary, setSummary] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const statusFromUrl = String(searchParams.get('status') || 'all').toLowerCase()
  const [status, setStatus] = useState(
    STATUS_FILTERS.some((f) => f.id === statusFromUrl) ? statusFromUrl : 'all',
  )
  const [operatorStatus, setOperatorStatus] = useState(
    () => String(searchParams.get('operatorStatus') || '').trim().toLowerCase(),
  )
  const [campaignId, setCampaignId] = useState(
    () => searchParams.get('campaignId') || searchParams.get('offer') || '',
  )
  const [vendorId, setVendorId] = useState(
    () => searchParams.get('vendorId') || '',
  )
  const [q, setQ] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [datePreset, setDatePreset] = useState(() => {
    if (searchParams.get('from') || searchParams.get('to')) return 'custom'
    return 'today'
  })
  const [dateRange, setDateRange] = useState(() => {
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (from || to) {
      return { from: from || '', to: to || '' }
    }
    return getDateRangeForPreset('today', timezone)
  })
  const [exporting, setExporting] = useState(false)
  const [firingId, setFiringId] = useState(null)
  const addToast = useStore((s) => s.addToast)

  useEffect(() => {
    fetchCampaigns().catch(() => {})
    fetchVendors().catch(() => {})
  }, [fetchCampaigns, fetchVendors])

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
        getPostbackSummary({
          ...rangeParams,
          campaignId: campaignId || undefined,
          vendorId: vendorId || undefined,
        }),
        listPostbacks({
          page,
          limit: PAGE_SIZE,
          status,
          operatorStatus: operatorStatus || undefined,
          q,
          vendorId: vendorId || undefined,
          campaignId: campaignId || undefined,
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
  }, [page, status, operatorStatus, q, vendorId, campaignId, dateRange.from, dateRange.to, timezone])

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

  const logsQuery = (extra = {}) => {
    const params = new URLSearchParams()
    params.set('preset', datePreset)
    if (dateRange.from) params.set('from', dateRange.from)
    if (dateRange.to) params.set('to', dateRange.to)
    if (campaignId) params.set('campaignId', campaignId)
    if (vendorId) params.set('vendorId', vendorId)
    if (extra.filter) params.set('filter', extra.filter)
    return `/postbacks/day-logs?${params.toString()}`
  }

  const exportLogs = async () => {
    if (!dateRange.from || !dateRange.to) return
    setExporting(true)
    try {
      const result = await exportPostbackDayReport({
        from: dateRange.from,
        to: dateRange.to,
        timezone,
        campaignId: campaignId || undefined,
        vendorId: vendorId || undefined,
        format: 'csv',
      })
      addToast(`Exported ${result.filename} (also saved on server)`, 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to export logs', 'error')
    } finally {
      setExporting(false)
    }
  }

  const fireVendorPostback = async (row, e) => {
    e.stopPropagation()
    if (!row?.id || firingId) return
    const alreadySent = String(row.status || '').toLowerCase() === 'sent'
    const label = row.msisdn || `#${row.id}`
    const ok = window.confirm(
      alreadySent
        ? `Postback for ${label} was already sent. Fire it again?`
        : `Fire vendor postback for ${label}?`,
    )
    if (!ok) return
    setFiringId(row.id)
    try {
      const result = await firePostback(row.id, { force: alreadySent })
      if (result?.skipped || result?.vendorSkipped) {
        addToast(result.reason || 'Postback was not sent', 'error')
      } else if (result?.success === false) {
        addToast(result.error || result.errorMessage || 'Vendor postback failed', 'error')
      } else {
        addToast(`Fired postback for ${label}`, 'success')
      }
      await load()
    } catch (err) {
      addToast(err?.message || 'Failed to fire postback', 'error')
    } finally {
      setFiringId(null)
    }
  }

  const campaignOptions = useMemo(() => {
    return campaigns.map((c) => ({
      value: String(c.id),
      label: `${c.name} (${c.id})`,
      sublabel: [
        c.trackingId ? `ID: ${c.trackingId}` : '',
        c.country && c.operator ? `${c.country} / ${c.operator}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      searchKey: `${c.name} ${c.id} ${c.trackingId || ''} ${c.country || ''} ${c.operator || ''}`,
    }))
  }, [campaigns])

  const vendorOptions = useMemo(() => {
    const map = new Map()
    vendors.forEach((v) => {
      map.set(String(v.id), {
        value: String(v.id),
        label: `${v.name} (${v.id})`,
        sublabel: v.code ? `Code: ${v.code}` : '',
        searchKey: `${v.name} ${v.id} ${v.code || ''}`,
      })
    })
    if (summary?.byVendor) {
      summary.byVendor.forEach((v) => {
        if (v.vendorId && !map.has(String(v.vendorId))) {
          map.set(String(v.vendorId), {
            value: String(v.vendorId),
            label: `${v.vendorName || 'Vendor'} (${v.vendorId})`,
            sublabel: v.vendorCode ? `Code: ${v.vendorCode}` : '',
            searchKey: `${v.vendorName || ''} ${v.vendorId} ${v.vendorCode || ''}`,
          })
        }
      })
    }
    return Array.from(map.values())
  }, [vendors, summary?.byVendor])

  const handleResetFilters = () => {
    setCampaignId('')
    setVendorId('')
    setOperatorStatus('')
    setQ('')
    setSearchDraft('')
    setStatus('all')
    applyDatePreset('today')
    setSearchParams({})
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <AppShell
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={exportLogs}
            disabled={exporting || !dateRange.from || !dateRange.to}
          >
            <FileDown className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exporting…' : 'Export logs'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(logsQuery())}
          >
            View logs
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
            MSISDN resolve → postback queue → billing callback (or manual fire) → vendor CPA.
            <span className="font-medium text-gray-700"> Fire postback</span> sends vendor CPA
            without waiting for an operator callback.
            <span className="font-medium text-gray-700"> Export logs</span> downloads
            the selected date range as CSV (and writes the same file on the server).
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="MSISDN resolved"
            value={summary?.msisdnResolved}
            icon={Phone}
            hint="Visits with phone"
          />
          <button
            type="button"
            className="text-left"
            onClick={() => navigate(logsQuery({ filter: 'he_fail_cg' }))}
          >
            <KpiCard
              label="No MSISDN → CG"
              value={summary?.heFailCg}
              icon={XCircle}
              hint="Open logs filter"
            />
          </button>
          <KpiCard
            label="Postbacks created"
            value={summary?.postbacksCreated}
            icon={Send}
          />
          <KpiCard label="Pending" value={summary?.pending} icon={Clock} />
          <KpiCard
            label="Received"
            value={summary?.received}
            icon={Inbox}
            hint="Operator callback"
          />
          <KpiCard label="Sent to vendor" value={summary?.sent} icon={CheckCircle2} />
          <KpiCard label="Failed" value={summary?.failed} icon={XCircle} />
        </div>

        {summary?.byOperatorStatus?.length > 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">
              Operator callback mix
            </h2>
            <div className="flex flex-wrap gap-2">
              {summary.byOperatorStatus.map((row) => (
                <button
                  key={row.status}
                  type="button"
                  onClick={() => {
                    setOperatorStatus(row.status)
                    setPage(1)
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev)
                      next.set('operatorStatus', row.status)
                      return next
                    })
                  }}
                  className={`${operatorStatusBadge(row.status)} gap-1.5 ${
                    operatorStatus === row.status ? 'ring-2 ring-indigo-300' : ''
                  }`}
                >
                  {row.status}
                  <span className="font-mono tabular-nums">{row.count}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              {summary.callbacksReceived || 0} callbacks in range · vendor fire is separate
              (pending / sent / failed above)
            </p>
          </div>
        ) : null}


        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-3.5">
          {/* Main Filter Row: From, To, Offer Dropdown, Vendor Dropdown, and Filter Button */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* From Date */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-from-date" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                From:
              </label>
              <input
                id="filter-from-date"
                type="date"
                value={dateRange.from || ''}
                onChange={(e) => updateDateField('from', e.target.value)}
                className="h-[38px] border border-gray-300 rounded-md px-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition-colors"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-to-date" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                To:
              </label>
              <input
                id="filter-to-date"
                type="date"
                value={dateRange.to || ''}
                onChange={(e) => updateDateField('to', e.target.value)}
                className="h-[38px] border border-gray-300 rounded-md px-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition-colors"
              />
            </div>

            {/* Campaign / Offer Searchable Dropdown */}
            <div className="w-56 min-w-[190px]">
              <SearchableSelect
                value={campaignId}
                onChange={(val) => {
                  setCampaignId(val)
                  setPage(1)
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev)
                    if (!val) {
                      next.delete('campaignId')
                      next.delete('offer')
                    } else {
                      next.set('campaignId', val)
                    }
                    return next
                  })
                }}
                options={campaignOptions}
                placeholder="All offers / campaigns"
                allOptionLabel="All offers / campaigns"
                searchPlaceholder="Search campaign..."
              />
            </div>

            {/* Vendor Searchable Dropdown */}
            <div className="w-48 min-w-[160px]">
              <SearchableSelect
                value={vendorId}
                onChange={(val) => {
                  setVendorId(val)
                  setPage(1)
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev)
                    if (!val) {
                      next.delete('vendorId')
                    } else {
                      next.set('vendorId', val)
                    }
                    return next
                  })
                }}
                options={vendorOptions}
                placeholder="All Vendors"
                allOptionLabel="All Vendors"
                searchPlaceholder="Search vendor..."
              />
            </div>

            {/* Filter Button in the same line */}
            <button
              type="button"
              onClick={() => {
                setPage(1)
                load()
              }}
              className="h-[38px] bg-blue-600 text-white font-medium px-6 rounded-md shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer transition-none shrink-0"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>

            {/* Reset Button in the same line when active */}
            {(campaignId || vendorId || operatorStatus || q || datePreset !== 'today') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-[38px] text-gray-500 text-xs sm:text-sm px-3.5 border border-gray-200 rounded-md cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          {/* Secondary Controls Bar: Presets on left, Export logs on right */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-100">
            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="font-medium text-gray-400 mr-1">Quick:</span>
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyDatePreset(preset.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border cursor-pointer ${
                    datePreset === preset.id
                      ? 'bg-blue-50 text-blue-800 border-blue-300 font-semibold shadow-2xs'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Export & Detailed Logs action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={exportLogs}
                disabled={exporting || !dateRange.from || !dateRange.to}
              >
                <FileDown className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
                {exporting ? 'Exporting…' : 'Export logs'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(logsQuery())}>
                View detailed logs
              </Button>
            </div>
          </div>

          {/* Status Tabs and Search Input Row */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setStatus(f.id)
                    setPage(1)
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev)
                      if (f.id === 'all') next.delete('status')
                      else next.set('status', f.id)
                      return next
                    })
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    status === f.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              {campaignId ? (
                <button
                  type="button"
                  onClick={() => {
                    setCampaignId('')
                    setPage(1)
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev)
                      next.delete('campaignId')
                      next.delete('offer')
                      return next
                    })
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>
                    Clear offer:{' '}
                    {campaigns.find((c) => String(c.id) === String(campaignId))?.name || `#${campaignId}`}
                  </span>
                  <XCircle className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
                </button>
              ) : null}

              {vendorId ? (
                <button
                  type="button"
                  onClick={() => {
                    setVendorId('')
                    setPage(1)
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev)
                      next.delete('vendorId')
                      return next
                    })
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>
                    Clear vendor:{' '}
                    {vendors.find((v) => String(v.id) === String(vendorId))?.name || `#${vendorId}`}
                  </span>
                  <XCircle className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
                </button>
              ) : null}

              {operatorStatus ? (
                <button
                  type="button"
                  onClick={() => {
                    setOperatorStatus('')
                    setPage(1)
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev)
                      next.delete('operatorStatus')
                      return next
                    })
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Clear operator status: {operatorStatus}</span>
                  <XCircle className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
                </button>
              ) : null}
            </div>

            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                setQ(searchDraft.trim())
                setPage(1)
              }}
            >
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  className="h-[36px] pl-8 pr-3 text-sm border border-gray-200 rounded-lg bg-white w-60 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="msisdn / click / rcid / camp / offer"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline" size="sm" className="h-[36px]">
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
              description="Rows appear when the operator hits /api/flow/callback, or when a funnel subscribe click queues pending."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50/40">
                    <th className="px-5 py-3 font-medium">Created</th>
                    <th className="px-3 py-3 font-medium">Offer</th>
                    <th className="px-3 py-3 font-medium">MSISDN</th>
                    <th className="px-3 py-3 font-medium">Callback</th>
                    <th className="px-3 py-3 font-medium">Postback</th>
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
                      <td
                        className="px-3 py-3"
                        title={row.campaignId ? 'Click to filter by this offer' : ''}
                        onClick={(e) => {
                          if (row.campaignId) {
                            e.stopPropagation()
                            const cidStr = String(row.campaignId)
                            setCampaignId(cidStr)
                            setPage(1)
                            setSearchParams((prev) => {
                              const next = new URLSearchParams(prev)
                              next.set('campaignId', cidStr)
                              return next
                            })
                          }
                        }}
                      >
                        <div
                          className={`font-medium text-xs text-gray-900 truncate max-w-[140px] ${
                            row.campaignId ? 'hover:text-indigo-600 transition-colors' : ''
                          }`}
                          title={row.campaignName || (row.campaignId ? `Campaign #${row.campaignId}` : '')}
                        >
                          {row.campaignName || (row.campaignId ? `Campaign #${row.campaignId}` : '—')}
                        </div>
                        {row.offerCode || row.trackingCampid ? (
                          <div
                            className="text-[11px] text-gray-400 font-mono truncate max-w-[140px]"
                            title={row.offerCode || row.trackingCampid || ''}
                          >
                            {row.offerCode || row.trackingCampid}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-800">{row.msisdn || '—'}</td>
                      <td className="px-3 py-3">
                        <span className={operatorStatusBadge(row.operatorStatus)}>
                          {row.operatorStatus || '—'}
                        </span>
                      </td>
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
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Fire vendor postback"
                            disabled={firingId === row.id}
                            onClick={(e) => fireVendorPostback(row, e)}
                          >
                            <Zap className={`w-4 h-4 ${firingId === row.id ? 'animate-pulse' : ''}`} />
                          </Button>
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
                        </div>
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
