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
import { RefreshCw, Search, Database, AlertCircle } from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import useStore from '../store/useStore'
import { listCampaigns } from '../services/api/campaigns'
import {
  getLogsStatus,
  searchCampaignLogs,
  getCampaignLogAggregations,
} from '../services/api/logs'

const PIE_COLORS = ['#7c4dff', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7']
const PAGE_SIZE = 25

function SectionCard({ title, children, actions }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="text-2xl font-semibold text-fg mt-1">{value}</p>
    </div>
  )
}

function CampaignLogsPage() {
  const addToast = useStore((s) => s.addToast)
  const [campaigns, setCampaigns] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [esEnabled, setEsEnabled] = useState(true)

  const [filters, setFilters] = useState({ eventType: '', clickId: '', q: '', from: '', to: '' })
  const [page, setPage] = useState(1)

  const [aggs, setAggs] = useState(null)
  const [logs, setLogs] = useState({ items: [], total: 0, page: 1, size: PAGE_SIZE })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getLogsStatus()
      .then((res) => setEsEnabled(Boolean(res?.enabled)))
      .catch(() => setEsEnabled(false))
    listCampaigns()
      .then((res) => {
        setCampaigns(res || [])
        if (res && res.length > 0) setSelectedId(res[0].id)
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
      <div className="page-container">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-header-title">Campaign Logs</h1>
            <p className="page-header-description">
              Searchable event stream with vendor / affiliate attribution and analytics.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {!esEnabled && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-fg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <span>
              Elasticsearch is not configured (set <code className="font-mono">ELASTICSEARCH_NODE</code>). Logs
              search and charts are empty until it is enabled and data is indexed.
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="surface-card p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-fg-muted mb-1">Campaign</label>
              <select
                className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-bg-base"
                value={selectedId}
                onChange={(e) => {
                  setPage(1)
                  setSelectedId(e.target.value)
                }}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.country} / {c.operator} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-muted mb-1">Event type</label>
              <input
                className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-bg-base"
                value={filters.eventType}
                onChange={(e) => updateFilter('eventType', e.target.value)}
                placeholder="e.g. OTP_VERIFY"
              />
            </div>
            <div>
              <label className="block text-xs text-fg-muted mb-1">From</label>
              <input
                type="date"
                className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-bg-base"
                value={filters.from}
                onChange={(e) => updateFilter('from', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-fg-muted mb-1">To</label>
              <input
                type="date"
                className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-bg-base"
                value={filters.to}
                onChange={(e) => updateFilter('to', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-fg-muted mb-1">Search</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-fg-subtle absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  className="w-full text-sm border border-border rounded-md pl-8 pr-2.5 py-1.5 bg-bg-base"
                  value={filters.q}
                  onChange={(e) => updateFilter('q', e.target.value)}
                  placeholder="click id, phone…"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total events" value={totalEvents} />
          <StatCard label="Log rows" value={logs.total || 0} />
          <StatCard label="Vendors seen" value={(aggs?.byVendor || []).length} />
          <StatCard label="Affiliates seen" value={(aggs?.byAffiliate || []).length} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SectionCard title="Events over time">
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <AreaChart data={aggs?.timeSeries || []}>
                  <defs>
                    <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c4dff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7c4dff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="key" tick={{ fontSize: 11 }} tickFormatter={(v) => String(v).slice(0, 10)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#7c4dff" fill="url(#evGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Events by type">
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={aggs?.byEventType || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="key" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="By status">
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={aggs?.byStatus || []}
                    dataKey="count"
                    nameKey="key"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {(aggs?.byStatus || []).map((entry, i) => (
                      <Cell key={entry.key} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="By affiliate">
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={aggs?.byAffiliate || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="key" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Log table */}
        <SectionCard title="Event log">
          {loading ? (
            <p className="text-center text-xs text-fg-muted py-6">Loading...</p>
          ) : logs.items.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-7 h-7 text-fg-subtle mx-auto mb-2" />
              <p className="text-sm text-fg-muted">No log events found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Event</th>
                      <th>Page</th>
                      <th>Status</th>
                      <th>Vendor</th>
                      <th>Affiliate</th>
                      <th>Click ID</th>
                      <th>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.items.map((row, idx) => (
                      <tr key={`${row.visitId}-${idx}`}>
                        <td className="text-xs font-mono text-fg-muted">
                          {row.timestamp ? new Date(row.timestamp).toLocaleString() : '—'}
                        </td>
                        <td className="text-xs font-medium">{row.eventType || '—'}</td>
                        <td className="text-xs">{row.pageType || '—'}</td>
                        <td className="text-xs">{row.status || '—'}</td>
                        <td className="text-xs">{row.vidRaw || row.vendorId || '—'}</td>
                        <td className="text-xs">{row.affRaw || row.affiliateId || '—'}</td>
                        <td className="text-xs font-mono">{row.clickId || '—'}</td>
                        <td className="text-xs font-mono">{row.phoneMasked || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-fg-muted">
                  Page {logs.page} of {totalPages} · {logs.total} events
                </p>
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
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
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
