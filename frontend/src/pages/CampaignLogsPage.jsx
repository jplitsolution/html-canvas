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
  Layers,
  Users,
  UserCheck,
  Calendar,
  Filter,
  Phone,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import useStore from '../store/useStore'
import { formatDate } from '../utils/date'
import { listCampaigns } from '../services/api/campaigns'
import { useSearchParams } from 'react-router-dom'
import {
  getLogsStatus,
  searchCampaignLogs,
  getCampaignLogAggregations,
} from '../services/api/logs'
import SessionTimelineModal from '../components/dashboard/SessionTimelineModal'

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']
const PAGE_SIZE = 25

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

function StatCard({ label, value, icon: Icon, colorClass = "from-indigo-500 to-indigo-600" }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm">
      <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${colorClass}`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">{value}</p>
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/95 p-3 text-white shadow-xl backdrop-blur-md">
        <p className="text-[10px] font-mono text-gray-400">{label}</p>
        <p className="text-xs font-bold mt-1.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          {payload[0].name || 'Events'}: <span className="font-mono text-indigo-300">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const getEventBadgeClass = (type) => {
  const t = String(type).toUpperCase();
  if (t.includes('SUCCESS')) return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
  if (t.includes('FAILED') || t.includes('LIMIT') || t.includes('BRUTE')) return 'bg-rose-50 text-rose-700 border-rose-200/50';
  if (t.includes('OTP_VERIFY')) return 'bg-violet-50 text-violet-700 border-violet-200/50';
  if (t.includes('OTP_SEND') || t.includes('OTP_VIEW')) return 'bg-amber-50 text-amber-700 border-amber-200/50';
  if (t.includes('VISIT')) return 'bg-blue-50 text-blue-700 border-blue-200/50';
   if (t.includes('CONFIRM_VIEW'))
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/50';
    if (t.includes('HOME_VIEW'))
    return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (t.includes('SUBSCRIBE_CLICK'))
    return 'bg-violet-50 text-violet-700 border-violet-200/50';
  return 'bg-gray-50 text-gray-700 border-gray-200/50';
  
}

const getPageBadgeClass = (page) => {
  const p = String(page).toUpperCase();
  if (p.includes('THANK') || p.includes('SUCCESS')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (p.includes('CONFIRM')) return 'bg-indigo-50 text-indigo-600 border-indigo-100';
  if (p.includes('OTP')) return 'bg-amber-50 text-amber-600 border-amber-100';
  if (p.includes('HOME')) return 'bg-teal-50 text-teal-600 border-teal-100';
  if (p.includes('PLAN')) return 'bg-sky-50 text-sky-600 border-sky-100';
  if (p.includes('ERROR') || p.includes('BLOCK')) return 'bg-rose-50 text-rose-600 border-rose-100';
  return 'bg-gray-50 text-gray-500 border-gray-100';
}

function CampaignLogsPage() {
  const addToast = useStore((s) => s.addToast)
  const [searchParams] = useSearchParams()
  const campaignIdParam = searchParams.get('campaignId')

  const [timelineVisitId, setTimelineVisitId] = useState(null)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)

  const [campaigns, setCampaigns] = useState([])
  const [selectedId, setSelectedId] = useState(campaignIdParam || 'all')
  const [esEnabled, setEsEnabled] = useState(true)

  const [filters, setFilters] = useState({ eventType: '', clickId: '', q: '', from: '', to: '' })
  const [page, setPage] = useState(1)

  const [aggs, setAggs] = useState(null)
  const [logs, setLogs] = useState({ items: [], total: 0, page: 1, size: PAGE_SIZE })
  const [loading, setLoading] = useState(false)
  const [datePreset, setDatePreset] = useState('custom')

  useEffect(() => {
    if (campaignIdParam) {
      setSelectedId(campaignIdParam)
    } else {
      setSelectedId('all')
    }
  }, [campaignIdParam])

  useEffect(() => {
    if (datePreset === 'custom') return
    const now = new Date()
    let from = ''
    let to = now.toISOString().slice(0, 10)
    if (datePreset === 'today') {
      from = to
    } else if (datePreset === 'week') {
      const w = new Date(now)
      w.setDate(now.getDate() - 7)
      from = w.toISOString().slice(0, 10)
    } else if (datePreset === 'month') {
      const m = new Date(now)
      m.setMonth(now.getMonth() - 1)
      from = m.toISOString().slice(0, 10)
    }
    setFilters((f) => ({ ...f, from, to }))
    setPage(1)
  }, [datePreset])

  useEffect(() => {
    getLogsStatus()
      .then((res) => setEsEnabled(Boolean(res?.enabled)))
      .catch(() => setEsEnabled(false))
    listCampaigns()
      .then((res) => {
        setCampaigns(res || [])
      })
      .catch((err) => addToast(err.message || 'Failed to load campaigns', 'error'))
  }, [addToast])

  const fetchData = useCallback(async () => {
    if (!selectedId) return
    setLoading(true)
    try {
      const params = { ...filters, page, size: PAGE_SIZE }
      const [aggRes, logRes] = await Promise.all([
        getCampaignLogAggregations(selectedId, filters),
        searchCampaignLogs(selectedId, params),
      ])
      setAggs(aggRes)
      setLogs(logRes)
    } catch (err) {
      addToast(err.message || 'Failed to load logs', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedId, filters, page, addToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalEvents = useMemo(
    () => (aggs?.byEventType || []).reduce((sum, b) => sum + b.count, 0),
    [aggs],
  )
  const totalPages = Math.max(1, Math.ceil((logs.total || 0) / PAGE_SIZE))

  const updateFilter = (key, value) => {
    setPage(1)
    setFilters((f) => ({ ...f, [key]: value }))
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
              Searchable event stream with real-time vendor / affiliate attribution telemetry.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 self-start sm:self-center border-gray-200/80 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs font-semibold px-4 py-2 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <option value="all">All Campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.country} / {c.operator} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Event Type</label>
              <div className="relative">
                <input
                  className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 bg-gray-50/40 text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                  value={filters.eventType}
                  onChange={(e) => updateFilter('eventType', e.target.value)}
                  placeholder="e.g. OTP_VERIFY"
                />
                <Layers className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Date Range</label>
              <div className="relative">
                <select
                  className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
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
                  placeholder="Click ID, phone..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Summary Widgets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Event Count" value={totalEvents} icon={Activity} colorClass="from-indigo-500 to-purple-500" />
          <StatCard label="Loaded Log Rows" value={logs.total || 0} icon={Database} colorClass="from-blue-500 to-indigo-500" />
          <StatCard label="Unique Vendors" value={(aggs?.byVendor || []).length} icon={Users} colorClass="from-teal-500 to-emerald-500" />
          <StatCard label="Unique Affiliates" value={(aggs?.byAffiliate || []).length} icon={UserCheck} colorClass="from-amber-500 to-orange-500" />
        </div>

        {/* Charts Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SectionCard title="Events over time">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={aggs?.timeSeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="key" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} tickFormatter={(v) => formatDate(v, 'YYYY-MM-DD (Date only)')} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip isDate />} />
                  <Area type="monotone" name="Events Count" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#evGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border text-sm">
              <div>
                <p className="text-xs text-fg-muted">Total Events</p>
                <p className="font-semibold text-fg">{totalEvents}</p>
              </div>
              <div>
                <p className="text-xs text-fg-muted">Avg / Day</p>
                <p className="font-semibold text-fg">
                  {aggs?.timeSeries?.length > 0 ? Math.round(totalEvents / aggs.timeSeries.length) : 0}
                </p>
              </div>
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
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border text-sm">
              <span className="text-xs text-fg-muted">Top Event Types</span>
              <div className="flex items-center flex-wrap gap-4">
                {(aggs?.byEventType || []).slice(0, 3).map((agg) => (
                  <div key={agg.key} className="flex flex-col px-3 border-l border-border first:border-l-0 first:pl-0">
                    <span className="font-semibold text-fg">{agg.key || '—'}</span>
                    <span className="text-xs text-fg-muted">{agg.count} events</span>
                  </div>
                ))}
              </div>
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
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border text-sm">
              <span className="text-xs text-fg-muted">Top Statuses</span>
              <div className="flex items-center flex-wrap gap-4">
                {(aggs?.byStatus || []).slice(0, 3).map((agg) => (
                  <div key={agg.key} className="flex flex-col px-3 border-l border-border first:border-l-0 first:pl-0">
                    <span className="font-semibold text-fg">{agg.key || '—'}</span>
                    <span className="text-xs text-fg-muted">{agg.count} events</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Affiliate Traffic Volumes">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={aggs?.byAffiliate || []} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="key" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Total Events" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border text-sm">
              <span className="text-xs text-fg-muted">Top Affiliates</span>
              <div className="flex items-center flex-wrap gap-4">
                {(aggs?.byAffiliate || []).slice(0, 3).map((agg) => (
                  <div key={agg.key} className="flex flex-col px-3 border-l border-border first:border-l-0 first:pl-0">
                    <span className="font-semibold text-fg">{agg.key || '—'}</span>
                    <span className="text-xs text-fg-muted">{agg.count} events</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Log Viewer Table */}
        <SectionCard title="Real-Time Event Stream Log">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-semibold text-gray-500">Retrieving campaign logs telemetry...</p>
            </div>
          ) : logs.items.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">No telemetry log events match these filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="min-w-full divide-y divide-gray-100 text-left">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-100">
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Event Name</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Funnel Page</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Session Status</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Affiliate</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Click ID ID</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> MSISDN</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {logs.items.map((row, idx) => (
                      <tr
                        key={`${row.visitId}-${idx}`}
                        className="hover:bg-gray-50/80 transition-colors duration-150 cursor-pointer"
                        onClick={() => {
                          setTimelineVisitId(row.visitId)
                          setIsTimelineOpen(true)
                        }}
                      >
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                          {row.timestamp ? formatDate(row.timestamp) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium" onClick={(e) => {
                          e.stopPropagation()
                          if (row.eventType) updateFilter('eventType', row.eventType)
                        }}>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border hover:underline ${getEventBadgeClass(row.eventType)}`} title="Click to filter by event type">
                            {row.eventType || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap" onClick={(e) => {
                          e.stopPropagation()
                          if (row.pageType) updateFilter('q', row.pageType)
                        }}>
                          {row.pageType ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border hover:underline ${getPageBadgeClass(row.pageType)}`} title="Click to search by page">
                              {row.pageType}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                          {row.status || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700" onClick={(e) => {
                          e.stopPropagation()
                          const val = row.vidRaw || String(row.vendorId || '')
                          if (val) updateFilter('q', val)
                        }}>
                          {row.vidRaw || row.vendorId ? (
                            <span className="font-semibold text-gray-800 hover:text-indigo-650 hover:underline" title="Click to search by vendor">
                              {row.vidRaw || row.vendorId}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700" onClick={(e) => {
                          e.stopPropagation()
                          const val = row.affRaw || String(row.affiliateId || '')
                          if (val) updateFilter('q', val)
                        }}>
                          {row.affRaw || row.affiliateId ? (
                            <span className="font-semibold text-gray-800 hover:text-indigo-650 hover:underline" title="Click to search by affiliate">
                              {row.affRaw || row.affiliateId}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-indigo-600 font-medium whitespace-nowrap" onClick={(e) => {
                          e.stopPropagation()
                          if (row.clickId) updateFilter('clickId', row.clickId)
                        }}>
                          {row.clickId ? (
                            <span className="hover:underline" title="Click to filter by click ID">
                              {row.clickId}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap" onClick={(e) => {
                          e.stopPropagation()
                          if (row.phoneMasked) updateFilter('q', row.phoneMasked)
                        }}>
                          {row.phoneMasked ? (
                            <span className="flex items-center gap-1 hover:text-indigo-650 hover:underline" title="Click to search by phone">
                              <Shield className="w-3 h-3 text-emerald-500" />
                              {row.phoneMasked}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setTimelineVisitId(row.visitId)
                              setIsTimelineOpen(true)
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold border-indigo-100 text-indigo-600 bg-indigo-50/40 hover:bg-indigo-50 px-2 py-1 rounded-lg"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            Timeline
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-5 bg-gray-50/50 p-4 border border-gray-100 rounded-xl">
                <p className="text-xs font-medium text-gray-500">
                  Page <span className="font-bold text-gray-800">{logs.page}</span> of <span className="font-bold text-gray-800">{totalPages}</span> · Total <span className="font-bold text-indigo-600">{logs.total}</span> events
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

      <SessionTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => {
          setIsTimelineOpen(false)
          setTimelineVisitId(null)
        }}
        visitId={timelineVisitId}
        campaignId={selectedId}
      />
    </AppShell>
  )
}

export default memo(CampaignLogsPage)
