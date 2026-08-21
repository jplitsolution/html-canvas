import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  RefreshCw,
  Search,
  Database,
  AlertCircle,
  Activity,
  Users,
  UserCheck,
  Calendar,
  Filter,
  Phone,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  KeyRound,
  Percent,
  Shield,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { formatDate, formatChartLabel, DATE_PRESETS, getDateRangeForPreset, DEFAULT_TIMEZONE } from '../utils/date'
import useStore from '../store/useStore'
import {
  getLogsStatus,
  searchCampaignLogs,
  getCampaignLogAggregations,
  searchAllCampaignLogs,
  getAllCampaignLogAggregations,
} from '../services/api/logs'

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']
const PAGE_SIZE = 25

const STANDARD_EVENT_TYPES = [
  'VISIT',
  'HOME_VIEW',
  'PLAN_VIEW',
  'CONFIRM_VIEW',
  'OTP_VIEW',
  'OTP_SEND',
  'OTP_VERIFY',
  'OTP_SHOWN',
  'SUBSCRIBE_CLICK',
  'CONFIRM_CLICK',
  'SUBSCRIBE_SUCCESS',
  'SUBSCRIBE_FAILED',
  'API_CHECKSUB',
  'API_PRIORITY',
  'API_SUBSCRIBE',
  'API_BLOCKLIST',
  'API_RESOLVE_MSISDN',
  'API_HE_TOKEN',
  'API_HE_MSISDN',
  'API_HE_RESOLVE',
  'API_HE_REDIRECT',
  'API_DCB_CONFIG',
  'API_DCB_SUBSCRIPTIONS',
  'API_DCB_PINCODE',
  'API_DCB_CONFIRM',
  'API_BILLING_CALLBACK',
  'API_VENDOR_POSTBACK',
  'API_OTP_SEND',
  'API_OTP_VERIFY',
  'API_OTP_EXPOSE_SEND_IN',
  'API_OTP_EXPOSE_VERIFY_IN',
  'CALLBACK_RECEIVED',
  'POSTBACK_PENDING',
  'POSTBACK_SENT',
  'POSTBACK_FAILED',
  'RATE_LIMIT_HIT',
  'BRUTE_FORCE_ATTEMPT',
  'BLOCKED_REQUEST',
  'BLOCKED',
]


function resolveInterval(preset, from, to) {
  if (preset === 'today') return 'hour'
  if (from && to && from === to) return 'hour'
  return 'day'
}

function SectionCard({ title, children, actions, className = "" }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden hover:border-gray-200/80 transition-all duration-300 ${className}`}>
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full" />
          <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function StatCard({ label, value, hint, icon: Icon, colorClass = "from-indigo-500 to-indigo-600" }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm">
      <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${colorClass}`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">{value}</p>
          {hint ? (
            <p className="text-[11px] text-gray-400 mt-1 font-medium">{hint}</p>
          ) : null}
        </div>
        {Icon && (
          <div className="rounded-xl p-3 bg-gray-50 border border-gray-100 text-gray-500 transition-all duration-300 group-hover:scale-110">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
        )}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label, hourly }) => {
  if (active && payload && payload.length) {
    const displayLabel =
      payload[0]?.payload?.label ||
      (label != null ? formatChartLabel(label, { hourly }) : '')
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/95 p-3 text-white shadow-xl backdrop-blur-md">
        <p className="text-[10px] font-semibold text-gray-300">{displayLabel}</p>
        <p className="text-xs font-bold mt-1.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          {payload[0].name || 'Events'}: <span className="font-mono text-indigo-300">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

function getEventBadgeClass(type) {
  const t = String(type).toUpperCase();
  if (t.includes('SUCCESS') || t.includes('SUBSCRIBED')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
  }
  if (t.includes('FAILED') || t.includes('LIMIT') || t.includes('BRUTE') || t.includes('BLOCKED')) {
    return 'bg-rose-50 text-rose-700 border-rose-200/50';
  }
  if (t.includes('API_SUBSCRIBE') || t === 'SUBSCRIBE' || t.includes('SUBSCRIBE_CLICK')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/50';
  }
  if (t.includes('OTP_VERIFY') || t.includes('API_OTP_VERIFY') || t.includes('OTP_EXPOSE_VERIFY')) {
    return 'bg-violet-50 text-violet-700 border-violet-200/50';
  }
  if (
    t.includes('OTP_SEND') ||
    t.includes('API_OTP_SEND') ||
    t.includes('OTP_EXPOSE_SEND') ||
    t.includes('OTP_VIEW') ||
    t.includes('OTP_SHOWN') ||
    t.includes('OTP')
  ) {
    return 'bg-amber-50 text-amber-700 border-amber-200/50';
  }
  if (t.includes('CLICK')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/50';
  }
  if (t.includes('HOME_VIEW') || t.includes('HOME')) {
    return 'bg-teal-50 text-teal-700 border-teal-200/50';
  }
  if (t.includes('CONFIRM_VIEW') || t.includes('CONFIRM')) {
    return 'bg-purple-50 text-purple-700 border-purple-200/50';
  }
  if (t.includes('PLAN_VIEW') || t.includes('PLAN')) {
    return 'bg-sky-50 text-sky-700 border-sky-200/50';
  }
  if (t.includes('VISIT')) {
    return 'bg-blue-50 text-blue-700 border-blue-200/50';
  }
  return 'bg-gray-50 text-gray-700 border-gray-200/50';
}

const getStatusBadgeClass = (status) => {
  const s = String(status).toUpperCase();
  if (s === 'ACTIVE' || s.includes('SUCCESS') || s.includes('SUBSCRIBED')) {
    return 'text-emerald-600';
  }
  if (s === 'NEW' || s === 'INACTIVE' || s === 'PENDING' || s === 'GRACE' || s === 'PARKING') {
    return 'text-amber-600';
  }
  if (s.includes('FAILED') || s.includes('BLOCKED')) {
    return 'text-rose-600';
  }
  if (s.includes('OTP_SHOWN') || s.includes('CONFIRM_SHOWN')) {
    return 'text-amber-600';
  }
  if (s.includes('PLAN_SHOWN') || s.includes('HOME_SHOWN')) {
    return 'text-indigo-600';
  }
  if (s.includes('VISIT')) {
    return 'text-blue-600';
  }
  return 'text-gray-500';
}

function CampaignLogsPage() {
  const navigate = useNavigate()
  const addToast = useStore((s) => s.addToast)
  const campaigns = useStore((s) => s.campaigns)
  const fetchCampaigns = useStore((s) => s.fetchCampaigns)
  const vendors = useStore((s) => s.vendors)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
  const dateFormat = useStore((s) => s.dateFormat)
  const [searchParams] = useSearchParams()
  const paramCampaignId = searchParams.get('campaignId')
  const paramPreset = searchParams.get('preset')
  const paramFrom = searchParams.get('from')
  const paramTo = searchParams.get('to')
  const paramEventType = searchParams.get('eventType')
  const paramVendorId = searchParams.get('vendorId')

  const [selectedId, setSelectedId] = useState('')
  const [esEnabled, setEsEnabled] = useState(true)

  const openVisitDetail = useCallback((visitId) => {
    if (!visitId) return
    navigate(`/analytics/visits/${visitId}`)
  }, [navigate])

  const [datePreset, setDatePreset] = useState(paramPreset || (paramFrom && paramTo ? 'custom' : 'today'))
  const [filters, setFilters] = useState(() => {
    const range = getDateRangeForPreset(paramPreset || 'today', timezone)
    return {
      eventType: paramEventType || '',
      vendorId: paramVendorId || '',
      clickId: '',
      q: '',
      from: paramFrom || range.from,
      to: paramTo || range.to,
    }
  })
  const [page, setPage] = useState(1)

  const [aggs, setAggs] = useState(null)
  const [logs, setLogs] = useState({ items: [], total: 0, page: 1, size: PAGE_SIZE })
  const [loading, setLoading] = useState(false)

  const chartInterval = resolveInterval(datePreset, filters.from, filters.to)
  const isHourly = chartInterval === 'hour'

  const getCampaignLabel = useCallback((campaignId) => {
    if (!campaignId) return '—'
    const c = campaigns.find((item) => String(item.id) === String(campaignId))
    if (!c) return `Campaign #${campaignId}`
    return `${c.trackingId || `${c.country} / ${c.operator}`} — ${c.name}`
  }, [campaigns])

  useEffect(() => {
    getLogsStatus()
      .then((res) => setEsEnabled(Boolean(res?.enabled)))
      .catch(() => setEsEnabled(false))
    fetchCampaigns()
      .then(() => {
        if (paramCampaignId) {
          setSelectedId(Number(paramCampaignId))
        } else {
          setSelectedId('all')
        }
      })
      .catch(() => {})
    fetchVendors().catch(() => {})
  }, [addToast, paramCampaignId, fetchCampaigns, fetchVendors])

  // Keep Today/Week/Month ranges aligned when profile timezone changes
  useEffect(() => {
    if (datePreset === 'custom' || !timezone) return
    const range = getDateRangeForPreset(datePreset, timezone)
    setFilters((f) => {
      if (f.from === range.from && f.to === range.to) return f
      return { ...f, from: range.from, to: range.to }
    })
  }, [timezone, datePreset])

  const fetchData = useCallback(async () => {
    if (!selectedId) return
    setLoading(true)
    try {
      const interval = resolveInterval(datePreset, filters.from, filters.to)
      const aggParams = { ...filters, interval, timezone }
      const params = { ...filters, page, size: PAGE_SIZE, timezone, view: 'sessions' }
      const isAll = selectedId === 'all'
      const [aggRes, logRes] = await Promise.all([
        isAll ? getAllCampaignLogAggregations(aggParams) : getCampaignLogAggregations(selectedId, aggParams),
        isAll ? searchAllCampaignLogs(params) : searchCampaignLogs(selectedId, params),
      ])
      setAggs(aggRes)
      setLogs(logRes)
    } catch (err) {
      addToast(err.message || 'Failed to load logs', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedId, filters, page, addToast, datePreset, timezone])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalEvents = useMemo(
    () => (aggs?.byEventType || []).reduce((sum, b) => sum + b.count, 0),
    [aggs],
  )

  const otpStats = aggs?.otpStats || {
    requested: 0,
    verifiedLive: 0,
    verifiedVendor: 0,
    held: 0,
    liveConvPercent: 0,
    vendorConvPercent: 0,
    holdPercent: 0,
  }

  const eventTypeOptions = useMemo(() => {
    const set = new Set(STANDARD_EVENT_TYPES)
    if (aggs?.byEventType) {
      aggs.byEventType.forEach((item) => {
        if (item.key) set.add(item.key)
      })
    }
    if (filters.eventType && !set.has(filters.eventType)) {
      set.add(filters.eventType)
    }
    return Array.from(set).sort()
  }, [aggs, filters.eventType])
  const totalPages = Math.max(1, Math.ceil((logs.total || 0) / PAGE_SIZE))

  const timeSeriesData = useMemo(() => {
    const series = aggs?.timeSeries || []
    return series.map((row) => ({
      ...row,
      label: formatChartLabel(row.key, { hourly: isHourly }),
    }))
    // dateFormat/timezone intentionally included so labels refresh with profile prefs
  }, [aggs, isHourly, dateFormat, timezone])

  const updateFilter = (key, value) => {
    setPage(1)
    if (key === 'from' || key === 'to') setDatePreset('custom')
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const applyDatePreset = (preset) => {
    setDatePreset(preset)
    setPage(1)
    if (preset === 'custom') return
    const range = getDateRangeForPreset(preset, timezone)
    setFilters((f) => ({ ...f, from: range.from, to: range.to }))
  }

  return (
    <AppShell>
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Campaign Logs
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              One row per click ID. Open a row for funnel pages, events, and API timeline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 border-gray-200/80 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs font-semibold px-4 py-2 rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {!esEnabled && (
          <div className="mb-6 rounded-2xl border border-amber-200/60 bg-amber-50/50 px-5 py-4 text-sm text-amber-800 flex items-start gap-3 backdrop-blur-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Elasticsearch not configured</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Set <code className="font-mono bg-amber-100/60 px-1 py-0.5 rounded text-amber-900">ELASTICSEARCH_NODE</code> to enable search. Falling back to SQL Database logs mode.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Filters Panel */}
        <div className="bg-white border border-gray-100 shadow-2xs rounded-2xl p-5 mb-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Query Filters
          </h3>

          <div className="mb-4">
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
            {datePreset !== 'custom' && filters.from && filters.to && (
              <p className="mt-2 text-[11px] text-gray-400 font-medium">
                Showing {formatChartLabel(filters.from)} → {formatChartLabel(filters.to)}
                {isHourly ? ' · hourly' : ' · daily'}
                {timezone === 'Asia/Kolkata' || timezone === 'Asia/Calcutta' ? ' · IST' : timezone ? ` · ${timezone}` : ''}
              </p>
            )}
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
              datePreset === 'custom' ? 'lg:grid-cols-6' : 'lg:grid-cols-4'
            }`}
          >
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Campaign Node</label>
              <select
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                value={selectedId}
                onChange={(e) => {
                  setPage(1)
                  setSelectedId(e.target.value)
                }}
              >
                <option value="all">— All Campaigns —</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.trackingId || `${c.country} / ${c.operator}`} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Event Type</label>
              <select
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200 cursor-pointer"
                value={filters.eventType}
                onChange={(e) => updateFilter('eventType', e.target.value)}
              >
                <option value="">— All Event Types —</option>
                {eventTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Vendor</label>
              <select
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200 cursor-pointer"
                value={filters.vendorId}
                onChange={(e) => updateFilter('vendorId', e.target.value)}
              >
                <option value="">— All Vendors —</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.code})
                  </option>
                ))}
              </select>
            </div>

            {datePreset === 'custom' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">From Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                      value={filters.from}
                      onChange={(e) => updateFilter('from', e.target.value)}
                    />
                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">To Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                      value={filters.to}
                      onChange={(e) => updateFilter('to', e.target.value)}
                    />
                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Global Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 bg-gray-50/40 text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                  value={filters.q}
                  onChange={(e) => updateFilter('q', e.target.value)}
                  placeholder="Click ID, RCID, phone..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Summary Widgets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard label="Total Event Count" value={totalEvents} icon={Activity} colorClass="from-indigo-500 to-purple-500" />
          <StatCard label="Clicks in filter" value={logs.total || 0} icon={Database} colorClass="from-blue-500 to-indigo-500" />
          <StatCard label="Unique Vendors" value={(aggs?.byVendor || []).length} icon={Users} colorClass="from-teal-500 to-emerald-500" />
          <StatCard label="Campaigns in view" value={selectedId === 'all' ? (aggs?.byCampaign || []).length || '—' : 1} icon={UserCheck} colorClass="from-amber-500 to-orange-500" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="OTP requested"
            value={otpStats.requested}
            hint="Successful send"
            icon={KeyRound}
            colorClass="from-amber-500 to-orange-500"
          />
          <StatCard
            label="OTP verified"
            value={otpStats.verifiedLive}
            hint={`${otpStats.verifiedVendor} shown to vendor`}
            icon={KeyRound}
            colorClass="from-violet-500 to-indigo-500"
          />
          <StatCard
            label="Live conv %"
            value={`${otpStats.liveConvPercent}%`}
            hint="Verified / requested"
            icon={Percent}
            colorClass="from-emerald-500 to-teal-500"
          />
          <StatCard
            label="Vendor conv %"
            value={`${otpStats.vendorConvPercent}%`}
            hint="After hold, what vendor sees"
            icon={Percent}
            colorClass="from-sky-500 to-blue-500"
          />
          <StatCard
            label="Hold %"
            value={`${otpStats.holdPercent}%`}
            hint={`${otpStats.held} held of live verifies`}
            icon={Shield}
            colorClass="from-rose-500 to-orange-500"
          />
        </div>

        {/* Charts Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SectionCard title={isHourly ? 'Events over time (by hour)' : 'Events over time'}>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="key"
                    stroke="#94a3b8"
                    tick={{ fontSize: 10, fontWeight: 500 }}
                    tickFormatter={(v) => formatChartLabel(v, { hourly: isHourly })}
                    interval={isHourly ? 'preserveStartEnd' : 0}
                    minTickGap={isHourly ? 28 : 8}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip hourly={isHourly} />} />
                  <Area type="monotone" name="Events Count" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#evGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Events by type">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={aggs?.byEventType || []} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="key" stroke="#94a3b8" tick={{ fontSize: 9, fontWeight: 500 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Frequency" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Verification Status Distribution">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={aggs?.byStatus || []}
                    dataKey="count"
                    nameKey="key"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {(aggs?.byStatus || []).map((entry, i) => (
                      <Cell key={entry.key} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Vendor Traffic Volumes">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={aggs?.byVendor || []} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="key" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Total Events" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Click ID list */}
        <SectionCard title="Clicks (one row per click ID)">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-semibold text-gray-500">Retrieving campaign logs telemetry...</p>
            </div>
          ) : logs.items.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">
                No clicks match these filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="min-w-full divide-y divide-gray-100 text-left">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-100">
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time</span>
                      </th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Click ID</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">RCID</th>
                      {selectedId === 'all' && (
                        <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Campaign</th>
                      )}
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Campid</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> MSISDN</span>
                      </th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Event</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {logs.items.map((row, idx) => (
                      <tr
                        key={`${row.visitId}-${row.clickId || 's'}-${idx}`}
                        className="hover:bg-indigo-50/40 transition-colors duration-150 cursor-pointer"
                        onClick={() => openVisitDetail(row.visitId)}
                      >
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                          {row.timestamp ? formatDate(row.timestamp) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-800 font-semibold whitespace-nowrap">
                          {row.clickId || <span className="text-gray-300 font-normal">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-nowrap max-w-[180px] truncate" title={row.rcid || ''}>
                          {row.rcid || <span className="text-gray-300">—</span>}
                        </td>
                        {selectedId === 'all' && (
                          <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                            {row.campaignId ? (
                              <span className="font-semibold text-gray-800">
                                {getCampaignLabel(row.campaignId)}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        )}
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {row.vidRaw || row.vendorId ? (
                            <span className="font-semibold text-gray-800">
                              {row.vidRaw || row.vendorId}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-nowrap max-w-[140px] truncate" title={row.campid || ''}>
                          {row.campid || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">
                          {row.phone || row.phoneMasked ? (
                            row.phone || row.phoneMasked
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium">
                          {row.eventType ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getEventBadgeClass(row.eventType)}`}>
                              {row.eventType}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {row.status ? (
                            <span className={`font-bold tracking-wide text-[11px] ${getStatusBadgeClass(row.status)}`}>
                              {row.status}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          <button
                            type="button"
                            title="View click detail"
                            aria-label="View click detail"
                            disabled={!row.visitId}
                            onClick={(e) => {
                              e.stopPropagation()
                              openVisitDetail(row.visitId)
                            }}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-5 bg-gray-50/50 p-4 border border-gray-100 rounded-xl">
                <p className="text-xs font-medium text-gray-500">
                  Page <span className="font-bold text-gray-800">{logs.page}</span> of <span className="font-bold text-gray-800">{totalPages}</span> · Total{' '}
                  <span className="font-bold text-indigo-600">{logs.total}</span>{' '}
                  clicks
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-gray-200 text-gray-600 bg-white disabled:bg-gray-50 disabled:text-gray-300"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-gray-200 text-gray-600 bg-white disabled:bg-gray-50 disabled:text-gray-300"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SectionCard>
      </div>

    </AppShell>
  )
}

export default memo(CampaignLogsPage)
