import { memo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  AlertTriangle,
  Activity,
  Clock,
  RotateCcw,
  Cpu,
  Globe,
  RefreshCw,
  ChevronRight,
  Radio,
  Send,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { listCampaigns, getOtpAnalytics } from '../services/api/campaigns'

function SuccessBar({ value = 0, variant = 'success' }) {
  const pct = Number(value) || 0
  const color = variant === 'danger' ? 'bg-danger' : variant === 'warning' ? 'bg-warning' : 'bg-success'
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-xs font-medium text-fg tabular-nums w-9 text-right shrink-0">{pct}%</span>
    </div>
  )
}

function fmtPct(value) {
  return `${Number(value) || 0}%`
}

function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-fg-muted">{label}</p>
          <p className={`text-2xl font-semibold mt-1 tabular-nums ${accent || 'text-fg'}`}>{value}</p>
          {sub && <p className="text-xs text-fg-subtle mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className="p-2 rounded-md bg-bg-muted text-fg-muted shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  )
}

function FunnelStep({ label, count, total, isLast = false }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const widthPct = total > 0 ? Math.max(8, (count / total) * 100) : 8

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-fg">{label}</span>
        <span className="text-xs text-fg-muted tabular-nums">
          {count.toLocaleString()}
          {!isLast && total > 0 && <span className="text-fg-subtle ml-1">({pct}%)</span>}
        </span>
      </div>
      <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isLast ? 'bg-accent' : 'bg-accent/60'}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  )
}

function SectionCard({ title, description, icon: Icon, children, action }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-accent shrink-0" />}
            {title}
          </h2>
          {description && <p className="text-xs text-fg-muted mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function TableEmpty({ message }) {
  return <div className="px-5 py-10 text-center text-sm text-fg-muted">{message}</div>
}

function renderTrendChart(trends, chartId) {
  if (!trends || trends.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-fg-muted">
        Not enough data to plot yet
      </div>
    )
  }

  const width = 600
  const height = 160
  const padding = 24
  const counts = trends.map((t) => t.count)
  const maxVal = Math.max(...counts, 1)

  const points = trends.map((t, idx) => {
    const x = padding + (idx / (trends.length - 1)) * (width - padding * 2)
    const y = height - padding - (t.count / maxVal) * (height - padding * 2)
    return { x, y }
  })

  const pathData = points.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
  const areaData = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        <defs>
          <linearGradient id={`area-${chartId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" strokeWidth="1" />
        <path d={areaData} fill={`url(#area-${chartId})`} />
        <path d={pathData} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r="3" fill="var(--accent)" stroke="white" strokeWidth="1.5">
            <title>{`${trends[idx].date || trends[idx].hour}: ${trends[idx].count}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-[11px] text-fg-subtle px-1">
        <span>{trends[0].date || trends[0].hour?.split(' ')[1] || trends[0].hour}</span>
        <span>{trends[trends.length - 1].date || trends[trends.length - 1].hour?.split(' ')[1] || trends[trends.length - 1].hour}</span>
      </div>
    </div>
  )
}

function OtpAnalyticsPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('all')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchCampaignList = async () => {
    try {
      const list = await listCampaigns()
      setCampaigns(list || [])
    } catch (err) {
      console.error('Failed to load campaigns list', err)
    }
  }

  const fetchAnalyticsData = async (campaignId, silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const targetId = campaignId === 'all' ? undefined : Number(campaignId)
      const data = await getOtpAnalytics(targetId)
      setAnalytics(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Failed to load OTP analytics data')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalyticsData(selectedCampaignId, true)
    setRefreshing(false)
  }

  useEffect(() => {
    fetchCampaignList()
  }, [])

  useEffect(() => {
    fetchAnalyticsData(selectedCampaignId)
  }, [selectedCampaignId])

  const selectedCampaign = campaigns.find((c) => String(c.id) === selectedCampaignId)
  const ownedCampaignIds = new Set(campaigns.map((c) => c.id))
  const hasData = analytics?.summary?.totalRequests > 0

  const goToCampaign = (campaignId) => {
    if (ownedCampaignIds.has(campaignId)) {
      navigate(`/campaigns/${campaignId}`)
    }
  }

  const pageActions = (
    <>
      <select
        value={selectedCampaignId}
        onChange={(e) => setSelectedCampaignId(e.target.value)}
        className="px-3 py-1.5 text-sm border border-border rounded-md bg-bg-elevated text-fg min-w-[180px]"
      >
        <option value="all">All campaigns</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.country} / {c.operator}
          </option>
        ))}
      </select>
      <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || loading}>
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </>
  )

  return (
    <AppShell actions={pageActions}>
      <div className="page-container">
        <div className="page-header">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="page-header-title">OTP Analytics</h1>
              <p className="page-header-description">
                {selectedCampaign
                  ? `${selectedCampaign.country} / ${selectedCampaign.operator} — SMS OTP performance`
                  : 'SMS delivery, verification, and subscription conversion across all campaigns'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="badge badge-muted flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Last 30 days
              </span>
              {lastUpdated && (
                <span className="text-xs text-fg-subtle">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-danger-muted border border-danger/20 text-danger text-sm mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-fg-muted">
            <RefreshCw className="w-6 h-6 animate-spin text-accent" />
            <span className="text-sm">Loading analytics...</span>
          </div>
        ) : !analytics ? (
          <div className="surface-card">
            <EmptyState title="No data available" description="Could not load analytics. Try refreshing." />
          </div>
        ) : !hasData ? (
          <div className="surface-card">
            <EmptyState
              icon={Activity}
              title="No OTP activity yet"
              description="Data appears here once users go through the OTP flow in your subscription funnels. Activate a campaign and run a test subscription to see metrics."
              action={
                <Button variant="primary" size="sm" onClick={() => navigate('/campaigns')}>
                  Go to campaigns
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard label="Total requests" value={analytics.summary.totalRequests.toLocaleString()} icon={Send} />
              <StatCard label="SMS sent" value={analytics.summary.sentRequests.toLocaleString()} icon={Activity} />
              <StatCard label="Verified" value={analytics.summary.verifiedRequests.toLocaleString()} icon={CheckCircle2} accent="text-success" />
              <StatCard label="Failed" value={analytics.summary.failedRequests.toLocaleString()} icon={XCircle} accent={analytics.summary.failedRequests > 0 ? 'text-danger' : 'text-fg'} />
              <StatCard label="Success rate" value={`${analytics.summary.successRate}%`} sub="Sent → verified" icon={TrendingUp} accent="text-success" />
              <StatCard label="Avg verify time" value={`${analytics.summary.avgVerificationTime}s`} sub={`${analytics.summary.avgResendCount} avg resends`} icon={Clock} />
            </div>

            {/* Funnel */}
            <SectionCard title="Conversion funnel" description="OTP request to subscription completion" icon={TrendingUp}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch gap-4 sm:gap-3">
                  <FunnelStep label="Requested" count={analytics.funnel.requested} total={analytics.funnel.requested} />
                  <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0 hidden sm:block self-center" />
                  <FunnelStep label="Sent" count={analytics.funnel.sent} total={analytics.funnel.requested} />
                  <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0 hidden sm:block self-center" />
                  <FunnelStep label="Verified" count={analytics.funnel.verified} total={analytics.funnel.requested} />
                  <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0 hidden sm:block self-center" />
                  <FunnelStep label="Subscribed" count={analytics.funnel.subscribed} total={analytics.funnel.requested} isLast />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border">
                  <div className="text-center p-3 rounded-md bg-bg-subtle">
                    <p className="text-xs text-fg-muted">Delivery rate</p>
                    <p className="text-lg font-semibold text-fg mt-0.5">
                      {analytics.funnel.requested > 0
                        ? Math.round((analytics.funnel.sent / analytics.funnel.requested) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-md bg-bg-subtle">
                    <p className="text-xs text-fg-muted">Verification rate</p>
                    <p className="text-lg font-semibold text-fg mt-0.5">
                      {analytics.funnel.sent > 0
                        ? Math.round((analytics.funnel.verified / analytics.funnel.sent) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-md bg-bg-subtle">
                    <p className="text-xs text-fg-muted">Checkout rate</p>
                    <p className="text-lg font-semibold text-fg mt-0.5">
                      {analytics.funnel.verified > 0
                        ? Math.round((analytics.funnel.subscribed / analytics.funnel.verified) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-md bg-bg-subtle">
                    <p className="text-xs text-fg-muted">Overall conversion</p>
                    <p className="text-lg font-semibold text-accent mt-0.5">
                      {analytics.funnel.requested > 0
                        ? Math.round((analytics.funnel.subscribed / analytics.funnel.requested) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Campaign breakdown — primary table */}
            <SectionCard
              title="Campaign breakdown"
              description="OTP performance by country and operator"
              icon={Globe}
            >
              {(analytics.campaignPerformance?.length ?? 0) === 0 ? (
                <TableEmpty message="Create a campaign to start tracking OTP performance." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="col-text">Campaign</th>
                        <th className="col-text">Country</th>
                        <th className="col-text">Operator</th>
                        <th className="col-num">Requests</th>
                        <th className="col-num">Sent</th>
                        <th className="col-num">Verified</th>
                        <th className="col-num">Failed</th>
                        <th className="col-num">Subscribed</th>
                        <th className="col-bar">Success rate</th>
                        <th className="col-num">Conversion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.campaignPerformance.map((row) => (
                        <tr
                          key={row.campaignId}
                          className={ownedCampaignIds.has(row.campaignId) ? 'cursor-pointer' : ''}
                          onClick={() => goToCampaign(row.campaignId)}
                        >
                          <td className="col-text font-medium">{row.campaignName}</td>
                          <td className="col-text text-fg-muted">{row.country}</td>
                          <td className="col-text text-fg-muted">{row.operator}</td>
                          <td className="col-num">{row.total}</td>
                          <td className="col-num text-fg-muted">{row.sent}</td>
                          <td className="col-num text-success">{row.verified}</td>
                          <td className="col-num">
                            {(row.failed ?? 0) > 0 ? (
                              <span className="text-danger">{row.failed}</span>
                            ) : (
                              <span className="text-fg-subtle">0</span>
                            )}
                          </td>
                          <td className="col-num font-medium">{row.subscribed ?? 0}</td>
                          <td className="col-bar">
                            {row.total > 0 ? (
                              <SuccessBar
                                value={row.successRate}
                                variant={row.successRate >= 70 ? 'success' : row.successRate >= 40 ? 'warning' : 'danger'}
                              />
                            ) : (
                              <span className="text-xs text-fg-subtle">—</span>
                            )}
                          </td>
                          <td className="col-num">
                            {row.verified > 0 ? (
                              <span className={`badge ${row.conversionRate >= 50 ? 'badge-success' : row.conversionRate > 0 ? 'badge-accent' : 'badge-muted'}`}>
                                {fmtPct(row.conversionRate)}
                              </span>
                            ) : (
                              <span className="text-xs text-fg-subtle">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* Operator breakdown */}
            <SectionCard
              title="Operator breakdown"
              description="Aggregated OTP stats grouped by mobile operator"
              icon={Radio}
            >
              {(analytics.operatorPerformance?.filter((row) => row.operator !== 'Unknown' && row.operator !== '—').length ?? 0) === 0 ? (
                <TableEmpty message="No operator-level data in this period." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="col-text">Operator</th>
                        <th className="col-text">Countries</th>
                        <th className="col-num">Requests</th>
                        <th className="col-num">Verified</th>
                        <th className="col-num">Failed</th>
                        <th className="col-bar">Success rate</th>
                        <th className="col-num">Failure rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.operatorPerformance
                        .filter((row) => row.operator !== 'Unknown' && row.operator !== '—')
                        .map((row) => (
                        <tr key={row.operator}>
                          <td className="col-text font-medium">{row.operator}</td>
                          <td className="col-text text-fg-muted text-xs">
                            {row.countries?.length > 0 ? row.countries.join(', ') : '—'}
                          </td>
                          <td className="col-num">{row.total}</td>
                          <td className="col-num text-success">{row.verified}</td>
                          <td className="col-num">
                            {(row.failed ?? 0) > 0 ? (
                              <span className="text-danger">{row.failed}</span>
                            ) : (
                              <span className="text-fg-subtle">0</span>
                            )}
                          </td>
                          <td className="col-bar">
                            <SuccessBar
                              value={row.successRate}
                              variant={row.successRate >= 70 ? 'success' : row.successRate >= 40 ? 'warning' : 'danger'}
                            />
                          </td>
                          <td className="col-num">
                            <span className={`text-xs font-medium ${(row.failureRate ?? 0) > 10 ? 'text-danger' : 'text-fg-muted'}`}>
                              {fmtPct(row.failureRate)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 surface-card p-5">
                <h3 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  Daily volume
                </h3>
                {renderTrendChart(analytics.dailyTrends, 'daily')}
              </div>
              <div className="surface-card p-5">
                <h3 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent" />
                  Hourly load (24h)
                </h3>
                {renderTrendChart(analytics.hourlyTrends, 'hourly')}
              </div>
            </div>

            {/* Infrastructure */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="SMS provider health" description="Gateway performance and circuit breaker status" icon={Cpu}>
                {(analytics.providerPerformance?.length ?? 0) === 0 ? (
                  <TableEmpty message="No provider data logged." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="col-text">Provider</th>
                          <th className="col-num">Requests</th>
                          <th className="col-num">Verified</th>
                          <th className="col-num">Failed</th>
                          <th className="col-bar">Success</th>
                          <th className="col-text">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.providerPerformance.map((p) => (
                          <tr key={p.provider}>
                            <td className="col-text font-medium uppercase text-xs">{p.provider}</td>
                            <td className="col-num">{p.total}</td>
                            <td className="col-num text-success">{p.verified}</td>
                            <td className="col-num">{p.failed || 0}</td>
                            <td className="col-bar">
                              <SuccessBar value={p.successRate} />
                            </td>
                            <td className="col-text">
                              {p.tripped ? (
                                <span className="badge badge-warning">Tripped</span>
                              ) : (
                                <span className="badge badge-success">Healthy</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Issues by campaign" description="Campaigns with highest OTP failure rates" icon={AlertTriangle}>
                {(analytics.topFailedCampaigns?.length ?? 0) === 0 ? (
                  <TableEmpty message="No failures recorded — all campaigns healthy." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="col-text">Campaign</th>
                          <th className="col-num">Total</th>
                          <th className="col-num">Failed</th>
                          <th className="col-bar">Failure rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.topFailedCampaigns.map((c) => (
                          <tr
                            key={c.campaignId}
                            className={ownedCampaignIds.has(c.campaignId) ? 'cursor-pointer' : ''}
                            onClick={() => goToCampaign(c.campaignId)}
                          >
                            <td className="col-text font-medium">{c.campaignName}</td>
                            <td className="col-num text-fg-muted">{c.total}</td>
                            <td className="col-num text-danger">{c.failed}</td>
                            <td className="col-bar">
                              <SuccessBar value={c.failureRate} variant="danger" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Country summary */}
            {(analytics.countryPerformance?.length ?? 0) > 0 && (
              <SectionCard title="Country summary" description="OTP stats grouped by country" icon={Users}>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="col-text">Country</th>
                        <th className="col-num">Requests</th>
                        <th className="col-num">Verified</th>
                        <th className="col-num">Failed</th>
                        <th className="col-bar">Success rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.countryPerformance.map((c) => (
                        <tr key={c.country}>
                          <td className="col-text font-medium">{c.country}</td>
                          <td className="col-num">{c.total}</td>
                          <td className="col-num text-success">{c.verified}</td>
                          <td className="col-num">{c.failed || 0}</td>
                          <td className="col-bar"><SuccessBar value={c.successRate} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default memo(OtpAnalyticsPage)
