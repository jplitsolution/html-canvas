import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  LayoutDashboard,
  FolderKanban,
  Store,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
  Globe,
  Activity,
  Calendar,
  RefreshCw,
  ChevronRight,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import { formatDate, formatChartLabel, getDateRangeForPreset, DEFAULT_TIMEZONE, shiftDateString } from '../utils/date'
import useStore from '../store/useStore'
import { listMarkets } from '../services/api/markets'
import { listCampaigns } from '../services/api/campaigns'
import { listVendors, getPostbackSummary } from '../services/api/partners'
import { searchAllCampaignLogs } from '../services/api/logs'

const DASHBOARD_DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Last 7 Days' },
  { id: 'month', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom' },
]

const EVENT_COLOR_MAP = {
  VISIT: '#3b82f6',
  OTP_SEND: '#f59e0b',
  OTP_VERIFY: '#8b5cf6',
  SUBSCRIBE_SUCCESS: '#059669',
  SUBSCRIBE_FAILED: '#ef4444',
}

const FUNNEL_FROM_STATS = [
  { key: 'VISIT', label: 'Visits', field: 'visits', color: EVENT_COLOR_MAP.VISIT },
  { key: 'OTP_SEND', label: 'OTP sent', field: 'otpSend', color: EVENT_COLOR_MAP.OTP_SEND },
  { key: 'OTP_VERIFY', label: 'OTP verified', field: 'otpVerify', color: EVENT_COLOR_MAP.OTP_VERIFY },
  { key: 'SUBSCRIBE_SUCCESS', label: 'Subscribe success', field: 'subscribeSuccess', color: EVENT_COLOR_MAP.SUBSCRIBE_SUCCESS },
  { key: 'SUBSCRIBE_FAILED', label: 'Subscribe failed', field: 'subscribeFailed', color: EVENT_COLOR_MAP.SUBSCRIBE_FAILED },
]

function operatorBarColor(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'active' || s === 'success' || s === 'ok' || s === 'subscribed' || s === 'true' || s === '1') {
    return '#10b981'
  }
  if (s === 'grace' || s === 'parking' || s === 'low_balance' || s === 'pending') {
    return '#f59e0b'
  }
  if (s.includes('unsub') || s === 'cancel' || s === 'cancelled' || s === 'inactive') {
    return '#64748b'
  }
  if (s === 'failed' || s === 'false' || s === 'error' || s === 'unmatched') {
    return '#ef4444'
  }
  return '#6366f1'
}

const getEventTypeBadgeClass = (eventType) => {
  const t = String(eventType).toUpperCase()
  if (t.includes('SUCCESS') || t.includes('VERIFIED')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
  }
  if (t.includes('FAIL') || t.includes('BLOCKED') || t.includes('ERROR')) {
    return 'bg-rose-50 text-rose-700 border-rose-200/60'
  }
  if (t.includes('OTP') || t.includes('PENDING')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/60'
  }
  if (t.includes('CLICK')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/60'
  }
  return 'bg-slate-50 text-slate-700 border-slate-200/60'
}

const getOperatorStatusBadgeClass = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'active' || s === 'success' || s === 'ok' || s === 'subscribed' || s === 'true' || s === '1') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
  }
  if (s === 'grace' || s === 'parking' || s === 'low_balance' || s === 'pending') {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
  }
  if (s.includes('unsub') || s === 'cancel' || s === 'cancelled' || s === 'inactive') {
    return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  }
  if (s === 'failed' || s === 'false' || s === 'error' || s === 'unmatched') {
    return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
  }
  return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20'
}

const getStatusBadgeClass = (status) => {
  const s = String(status).toUpperCase()
  if (s === 'ACTIVE' || s.includes('SUCCESS') || s.includes('SUBSCRIBED')) {
    return 'bg-emerald-50 text-emerald-600 border-emerald-200'
  }
  if (s === 'PENDING' || s === 'INACTIVE' || s === 'NEW') {
    return 'bg-amber-50 text-amber-600 border-amber-200'
  }
  if (s.includes('FAILED') || s.includes('BLOCKED')) {
    return 'bg-rose-50 text-rose-600 border-rose-200'
  }
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

const CustomTooltip = ({ active, payload, label, hourly }) => {
  if (active && payload && payload.length) {
    const displayLabel = payload[0]?.payload?.label || (label != null ? formatChartLabel(label, { hourly }) : '')
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-3 text-white shadow-xl backdrop-blur-md">
        <p className="text-[11px] font-medium text-slate-400">{displayLabel}</p>
        <div className="mt-2 space-y-1">
          {payload.map((item, idx) => (
            <p key={idx} className="text-xs font-semibold flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: item.color || item.fill }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                {item.name}:
              </span>
              <span className="font-mono text-slate-200">{item.value?.toLocaleString()}</span>
            </p>
          ))}
        </div>
      </div>
    )
  }
  return null
}

function DashboardPage() {
  const navigate = useNavigate()
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
  const addToast = useStore((s) => s.addToast)

  const [preset, setPreset] = useState('today')
  const [customRange, setCustomRange] = useState({ from: '', to: '' })
  const [dateRange, setDateRange] = useState(() => getDateRangeForPreset('today', timezone))

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [markets, setMarkets] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [vendors, setVendors] = useState([])
  const [postbackStats, setPostbackStats] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])

  // Resolve preset change
  const handlePresetChange = (newPreset) => {
    setPreset(newPreset)
    if (newPreset === 'yesterday') {
      const todayStr = getDateRangeForPreset('today', timezone).from
      const yestStr = shiftDateString(todayStr, -1)
      setDateRange({ from: yestStr, to: yestStr })
    } else if (newPreset !== 'custom') {
      const range = getDateRangeForPreset(newPreset, timezone)
      setDateRange(range)
    }
  }

  const handleCustomDateApply = () => {
    if (!customRange.from || !customRange.to) {
      addToast('Please select both From and To dates', 'warning')
      return
    }
    setDateRange({ from: customRange.from, to: customRange.to })
  }

  const fetchDashboardData = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true)
    else setLoading(true)

    try {
      const params = {
        from: dateRange.from,
        to: dateRange.to,
        timezone,
      }

      const [marketsRes, campaignsRes, vendorsRes, postbackRes, logsRes] =
        await Promise.allSettled([
          listMarkets(),
          listCampaigns(),
          listVendors(),
          getPostbackSummary(params),
          searchAllCampaignLogs({ ...params, page: 1, size: 10, view: 'sessions' }),
        ])

      if (marketsRes.status === 'fulfilled') setMarkets(marketsRes.value || [])
      if (campaignsRes.status === 'fulfilled') setCampaigns(campaignsRes.value || [])
      if (vendorsRes.status === 'fulfilled') setVendors(vendorsRes.value || [])
      if (postbackRes.status === 'fulfilled') setPostbackStats(postbackRes.value || null)
      if (logsRes.status === 'fulfilled') setRecentLogs(logsRes.value?.items || [])

    } catch (err) {
      console.error('Dashboard data fetch error:', err)
      addToast('Failed to load dashboard statistics', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [dateRange, timezone, addToast])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const totalVisits = Number(postbackStats?.visits) || 0
  const totalConversions = Number(postbackStats?.subscribeSuccess) || 0

  const conversionRate = useMemo(() => {
    if (!totalVisits) return '0.0%'
    return `${((totalConversions / totalVisits) * 100).toFixed(1)}%`
  }, [totalVisits, totalConversions])

  const activeCampaignsCount = useMemo(() => {
    return campaigns.filter((c) => c.active).length
  }, [campaigns])

  const totalPostbacks = useMemo(() => {
    return postbackStats?.postbacksCreated || postbackStats?.total || 0
  }, [postbackStats])

  const operatorStatusBreakdown = useMemo(() => {
    return postbackStats?.byOperatorStatus || []
  }, [postbackStats])

  const callbacksReceived = useMemo(() => {
    if (postbackStats?.callbacksReceived != null) return postbackStats.callbacksReceived
    return operatorStatusBreakdown.reduce((n, row) => n + (Number(row.count) || 0), 0)
  }, [postbackStats, operatorStatusBreakdown])

  const funnelBreakdown = useMemo(() => {
    return FUNNEL_FROM_STATS
      .map((item) => ({
        ...item,
        count: Number(postbackStats?.[item.field]) || 0,
      }))
      .filter((item) => item.count > 0 || item.key === 'VISIT')
  }, [postbackStats])

  const timeSeriesData = useMemo(() => {
    return (postbackStats?.byDate || []).map((item) => ({
      rawKey: item.statDate,
      label: formatChartLabel(item.statDate, { hourly: false }),
      Visits: item.visits || 0,
    }))
  }, [postbackStats])

  // Helper URL builder for Analytics page navigation
  const buildAnalyticsUrl = (extraParams = {}) => {
    const search = new URLSearchParams()
    search.set('preset', preset)
    if (dateRange.from) search.set('from', dateRange.from)
    if (dateRange.to) search.set('to', dateRange.to)
    Object.entries(extraParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        search.set(k, String(v))
      }
    })
    return `/analytics?${search.toString()}`
  }

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-w-0">
        
        {/* Top Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-elevated p-5 rounded-2xl border border-border shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent-muted text-accent">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-fg tracking-tight">Executive Dashboard</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live System
              </span>
            </div>
            <p className="text-xs text-fg-muted mt-1">
              Today is live from visits/postbacks. Older days are dumped into daily_stats at midnight ({timezone})
            </p>
          </div>

          {/* Date Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-bg-base p-1 rounded-xl border border-border">
              {DASHBOARD_DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    preset === p.id
                      ? 'bg-accent text-accent-fg shadow-xs font-semibold'
                      : 'text-fg-muted hover:text-fg hover:bg-bg-subtle'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing || loading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Custom Range Picker Drawer */}
        {preset === 'custom' && (
          <div className="bg-bg-elevated p-4 rounded-2xl border border-border flex flex-wrap items-center gap-3 animate-fade-in">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium text-fg">Custom Range:</span>
            <input
              type="date"
              value={customRange.from}
              onChange={(e) => setCustomRange((r) => ({ ...r, from: e.target.value }))}
              className="px-3 py-1.5 text-xs rounded-lg border border-border bg-bg-base text-fg focus:outline-none focus:border-accent"
            />
            <span className="text-xs text-fg-muted">to</span>
            <input
              type="date"
              value={customRange.to}
              onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))}
              className="px-3 py-1.5 text-xs rounded-lg border border-border bg-bg-base text-fg focus:outline-none focus:border-accent"
            />
            <Button size="sm" onClick={handleCustomDateApply}>
              Apply Filter
            </Button>
          </div>
        )}

        {/* KPI Metrics Cards Grid (100% Clickable Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          
          {/* Card 1: Total Traffic */}
          <Link
            to="/postbacks/day-logs"
            className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-accent/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Visits</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-fg tracking-tight">
                {loading ? '...' : totalVisits.toLocaleString()}
              </p>
              <p className="text-[11px] text-fg-muted mt-1 flex items-center justify-between">
                <span>Today live · older days from dump</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </div>
          </Link>

          {/* Card 2: Conversions */}
          <Link
            to={buildAnalyticsUrl({ eventType: 'SUBSCRIBE_SUCCESS' })}
            className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-500/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Conversions</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-fg tracking-tight">
                {loading ? '...' : totalConversions.toLocaleString()}
              </p>
              <p className="text-[11px] text-fg-muted mt-1 flex items-center justify-between">
                <span>Subscribe success (same source as visits)</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </div>
          </Link>

          {/* Card 3: Conversion Rate */}
          <Link
            to={buildAnalyticsUrl()}
            className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-purple-500/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Conv. Rate</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-fg tracking-tight">
                {loading ? '...' : conversionRate}
              </p>
              <p className="text-[11px] text-fg-muted mt-1 flex items-center justify-between">
                <span>Success ÷ visits</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </div>
          </Link>

          {/* Card 4: Active Markets */}
          <Link
            to="/markets"
            className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-amber-500/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Active Markets</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-fg tracking-tight">
                {loading ? '...' : markets.length}
              </p>
              <p className="text-[11px] text-fg-muted mt-1 flex items-center justify-between">
                <span>Countries / Operators</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </div>
          </Link>

          {/* Card 5: Campaigns */}
          <Link
            to="/markets"
            className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-sky-500/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Campaigns</span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-fg tracking-tight">
                {loading ? '...' : `${activeCampaignsCount} / ${campaigns.length}`}
              </p>
              <p className="text-[11px] text-fg-muted mt-1 flex items-center justify-between">
                <span>Active / Total</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </div>
          </Link>

          {/* Card 6: Vendors & Postbacks */}
          <Link
            to="/vendors"
            className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-indigo-500/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Vendors</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-fg tracking-tight">
                {loading ? '...' : `${vendors.length} Vendors`}
              </p>
              <p className="text-[11px] text-fg-muted mt-1 flex items-center justify-between">
                <span>Partners (postbacks below)</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </div>
          </Link>

        </div>

        {/* Operator HTTP callbacks + vendor queue — not campaign-log event types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-4 bg-emerald-500 rounded-full" />
                  <h2 className="text-sm font-bold text-fg">Operator HTTP callbacks</h2>
                </div>
                <p className="text-[11px] text-fg-muted mt-1">
                  Telco webhook hits in this date range — not visit-log CALLBACK_RECEIVED rows
                </p>
              </div>
              <Link
                to="/postbacks"
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 shrink-0"
              >
                Open postbacks <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-5">
              <p className="text-2xl font-black text-fg tracking-tight">
                {loading ? '...' : callbacksReceived.toLocaleString()}
              </p>
              <p className="text-[11px] text-fg-muted mt-1 mb-4">
                Mix of operator statuses (active, grace, parking, …)
              </p>
              {loading ? (
                <p className="text-xs text-fg-muted animate-pulse">Loading callback mix…</p>
              ) : operatorStatusBreakdown.length === 0 ? (
                <p className="text-xs text-fg-muted">No operator callbacks in this window.</p>
              ) : (
                <div className="space-y-2.5">
                  {operatorStatusBreakdown.map((row) => {
                    const pct =
                      callbacksReceived > 0
                        ? ((Number(row.count) / callbacksReceived) * 100).toFixed(1)
                        : 0
                    const barColor = operatorBarColor(row.status)
                    return (
                      <Link
                        key={row.status}
                        to={`/postbacks?operatorStatus=${encodeURIComponent(row.status)}`}
                        className="block group"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wide ${getOperatorStatusBadgeClass(row.status)}`}
                          >
                            {row.status}
                          </span>
                          <span className="font-mono text-fg-muted group-hover:text-accent">
                            {Number(row.count).toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-bg-muted h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(4, pct))}%`,
                              backgroundColor: barColor,
                            }}
                          />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-4 bg-indigo-500 rounded-full" />
                  <h2 className="text-sm font-bold text-fg">Vendor fire queue</h2>
                </div>
                <p className="text-[11px] text-fg-muted mt-1">
                  Each conversion row has one status. Created is the total; the rest do not add up with HTTP callbacks.
                </p>
              </div>
              <Link
                to="/postbacks"
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 shrink-0"
              >
                View queue <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Created', value: postbackStats?.postbacksCreated ?? totalPostbacks, hint: 'All queue rows', status: 'all' },
                { label: 'Pending', value: postbackStats?.pending ?? 0, hint: 'Waiting on operator', status: 'pending' },
                { label: 'Matched', value: postbackStats?.received ?? 0, hint: 'Callback matched, not fired', status: 'received' },
                { label: 'Sent to vendor', value: postbackStats?.sent ?? 0, hint: 'CPA URL fired', status: 'sent' },
                { label: 'Failed', value: postbackStats?.failed ?? 0, hint: 'Vendor fire error', status: 'failed' },
                { label: 'Skipped', value: postbackStats?.skipped ?? 0, hint: 'Not fired', status: 'skipped' },
              ].map((card) => (
                <Link
                  key={card.label}
                  to={card.status === 'all' ? '/postbacks' : `/postbacks?status=${card.status}`}
                  className="rounded-xl border border-border bg-bg-subtle/40 p-3 hover:border-accent/40 transition-colors"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                    {card.label}
                  </p>
                  <p className="text-xl font-black text-fg mt-1 tabular-nums">
                    {loading ? '…' : Number(card.value || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-fg-muted mt-1">{card.hint}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Traffic Trend Chart (Spans 2 cols) */}
          <div className="lg:col-span-2 bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-4 bg-accent rounded-full" />
                  <h2 className="text-sm font-bold text-fg">Visits by day</h2>
                </div>
                <p className="text-[11px] text-fg-muted mt-1">
                  Same Visits KPI — today from raw tables, past days from dump
                </p>
              </div>
              <Link
                to="/postbacks/day-logs"
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
              >
                View Full Logs <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-5 flex-1 min-h-[300px]">
              {loading ? (
                <div className="h-[280px] flex items-center justify-center text-xs text-fg-muted animate-pulse">
                  Loading trend data...
                </div>
              ) : timeSeriesData.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-center p-6">
                  <BarChart3 className="w-8 h-8 text-fg-muted/40 mb-2" />
                  <p className="text-xs text-fg-muted">No traffic data recorded for this date range.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={timeSeriesData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis
                      dataKey="label"
                      interval="preserveStartEnd"
                      minTickGap={28}
                      height={36}
                      tickMargin={8}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis
                      width={36}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip content={<CustomTooltip hourly={false} />} />
                    <Area
                      type="monotone"
                      dataKey="Visits"
                      name="Visits"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#trafficGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Event Breakdown / Funnel (1 col - Clickable Bars) */}
          <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-4 bg-emerald-500 rounded-full" />
                  <h2 className="text-sm font-bold text-fg">Funnel from stats</h2>
                </div>
                <p className="text-[11px] text-fg-muted mt-1">Today live · older days dumped</p>
              </div>
              <span className="text-[11px] text-fg-muted">Click to filter</span>
            </div>

            <div className="p-5 flex-1 space-y-3">
              {loading ? (
                <div className="h-[260px] flex items-center justify-center text-xs text-fg-muted animate-pulse">
                  Loading events...
                </div>
              ) : funnelBreakdown.length === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-center">
                  <Activity className="w-8 h-8 text-fg-muted/40 mb-2" />
                  <p className="text-xs text-fg-muted">No events logged in this window.</p>
                </div>
              ) : (
                funnelBreakdown.map((item) => {
                  const percentage = totalVisits > 0 ? ((item.count / totalVisits) * 100).toFixed(1) : 0
                  const color = item.color || '#64748b'

                  return (
                    <Link
                      key={item.key}
                      to={buildAnalyticsUrl({ eventType: item.key })}
                      className="group block p-2.5 rounded-xl border border-transparent hover:border-border hover:bg-bg-subtle transition-all"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-2 text-fg truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span className="font-mono text-fg-muted group-hover:text-accent transition-colors">
                          {item.count.toLocaleString()}
                          {item.key === 'VISIT' ? '' : ` (${percentage}% of visits)`}
                        </span>
                      </div>
                      <div className="w-full bg-bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(4, percentage))}%`, backgroundColor: color }}
                        />
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>

        </div>

        {/* Markets Overview Grid (Clickable Cards) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" />
              <h2 className="text-base font-bold text-fg">Active Markets</h2>
            </div>
            <Link to="/markets" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
              View All Markets <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {markets.length === 0 ? (
              <div className="col-span-full bg-bg-elevated p-6 rounded-2xl border border-border text-center text-xs text-fg-muted">
                No markets configured yet.
              </div>
            ) : (
              markets.map((market) => {
                const activeCamps = (market.operators || []).reduce(
                  (acc, op) => acc + (op.campaigns || []).filter((c) => c.active).length,
                  0,
                )
                const totalCamps = (market.operators || []).reduce(
                  (acc, op) => acc + (op.campaigns || []).length,
                  0,
                )
                const firstOpCode = market.operators?.[0]?.code || ''

                return (
                  <Link
                    key={`${market.countryCode}-${firstOpCode}`}
                    to={`/markets/${market.countryCode}/${firstOpCode}`}
                    className="group bg-bg-elevated p-4 rounded-2xl border border-border shadow-xs hover:border-accent/40 hover:-translate-y-1 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{market.flagEmoji || '🌐'}</span>
                          <h3 className="text-sm font-bold text-fg group-hover:text-accent transition-colors">
                            {market.countryName} ({market.countryCode})
                          </h3>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-fg-muted group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <p className="text-xs text-fg-muted mt-2">
                        Operators: {market.operators?.map((o) => o.name).join(', ') || '—'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-fg-muted">Campaigns</span>
                      <span className="font-semibold text-fg">
                        {activeCamps} Active / {totalCamps} Total
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Two Columns: Top Campaigns & Top Vendors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Top Campaigns List */}
          <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold text-fg">Top Campaigns</h2>
              </div>
              <Link to="/markets" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
                Manage Campaigns <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 flex-1 space-y-2">
              {campaigns.length === 0 ? (
                <div className="p-6 text-center text-xs text-fg-muted">No campaigns created yet.</div>
              ) : (
                campaigns.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    to={`/markets/${c.countryCode || 'IN'}/${c.operatorCode || 'ALL'}/campaigns/${c.id}`}
                    className="group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border hover:bg-bg-subtle transition-all"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-bold text-fg truncate group-hover:text-accent transition-colors">
                        {c.name}
                      </p>
                      <p className="text-[11px] text-fg-muted truncate mt-0.5">
                        {c.country} / {c.operator} &bull; ID: {c.trackingId || c.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                          c.active
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        }`}
                      >
                        {c.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-fg-muted group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Vendors & Partners Summary */}
          <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold text-fg">Active Vendors & Postbacks</h2>
              </div>
              <Link to="/vendors" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
                View Vendors <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 flex-1 space-y-2">
              {vendors.length === 0 ? (
                <div className="p-6 text-center text-xs text-fg-muted">No vendors registered yet.</div>
              ) : (
                vendors.slice(0, 5).map((v) => (
                  <Link
                    key={v.id}
                    to={`/vendors`}
                    className="group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border hover:bg-bg-subtle transition-all"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-bold text-fg truncate group-hover:text-accent transition-colors">
                        {v.name} ({v.code})
                      </p>
                      <p className="text-[11px] text-fg-muted truncate mt-0.5">
                        Postback URL: {v.postbackUrl ? 'Configured' : 'Not Configured'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                        {v.active ? 'Active' : 'Disabled'}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-fg-muted group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Live Recent Sessions Activity Stream Table */}
        <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-bold text-fg">Live Sessions Stream</h2>
            </div>
            <Link to={buildAnalyticsUrl()} className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
              View All Logs <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-subtle border-b border-border text-fg-muted font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Visit ID</th>
                  <th className="px-5 py-3">Country / Op</th>
                  <th className="px-5 py-3">Latest Event</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-fg-muted">
                      No recent session logs recorded.
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log) => (
                    <tr
                      key={log.visitId}
                      onClick={() => navigate(`/analytics/visits/${log.visitId}`)}
                      className="hover:bg-bg-subtle/70 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3 font-mono font-bold text-fg group-hover:text-accent">
                        #{log.visitId}
                      </td>
                      <td className="px-5 py-3 text-fg-muted">
                        {log.country || '—'} / {log.operator || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border ${getEventTypeBadgeClass(log.eventType)}`}>
                          {log.eventType || 'VISIT'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border ${getStatusBadgeClass(log.status)}`}>
                          {log.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-fg-muted">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-accent font-semibold flex items-center justify-end gap-1 group-hover:underline">
                          Inspect <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppShell>
  )
}

export default memo(DashboardPage)
