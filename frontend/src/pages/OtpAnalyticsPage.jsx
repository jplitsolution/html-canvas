import { memo, useEffect, useState } from 'react'
import {
  TrendingUp,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  RotateCcw,
  Cpu,
  Globe,
  RefreshCw,
  ArrowDown,
  ChevronRight,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { listCampaigns, getOtpAnalytics } from '../services/api/campaigns'

function OtpAnalyticsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('all')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const fetchCampaignList = async () => {
    try {
      const list = await listCampaigns()
      setCampaigns(list || [])
    } catch (err) {
      console.error('Failed to load campaigns list', err)
    }
  }

  const fetchAnalyticsData = async (campaignId) => {
    setLoading(true)
    setError(null)
    try {
      const targetId = campaignId === 'all' ? undefined : Number(campaignId)
      const data = await getOtpAnalytics(targetId)
      setAnalytics(data)
    } catch (err) {
      setError(err.message || 'Failed to load OTP analytics data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const targetId = selectedCampaignId === 'all' ? undefined : Number(selectedCampaignId)
      const data = await getOtpAnalytics(targetId)
      setAnalytics(data)
    } catch (err) {
      console.error('Failed to refresh data', err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCampaignList()
  }, [])

  useEffect(() => {
    fetchAnalyticsData(selectedCampaignId)
  }, [selectedCampaignId])

  // Custom SVG line generator helper for trends
  const renderTrendChart = (trends) => {
    if (!trends || trends.length < 2) {
      return (
        <div className="flex items-center justify-center h-48 text-xs text-fg-subtle">
          Insufficient data points to plot chart.
        </div>
      )
    }

    const width = 600
    const height = 180
    const padding = 25

    const counts = trends.map((t) => t.count)
    const maxVal = Math.max(...counts, 5) // ensure no div by 0 and reasonable scale

    const points = trends.map((t, idx) => {
      const x = padding + (idx / (trends.length - 1)) * (width - padding * 2)
      const y = height - padding - (t.count / maxVal) * (height - padding * 2)
      return { x, y }
    })

    const pathData = points
      .map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(' ')

    const areaData = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`

    return (
      <div className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
          <defs>
            <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="line-color" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7C4DFF" />
              <stop offset="50%" stopColor="#00E5FF" />
              <stop offset="100%" stopColor="#7C4DFF" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" strokeWidth="0.5" />

          {/* Area Fill */}
          <path d={areaData} fill="url(#chart-glow)" />

          {/* Glowing Stroke Line */}
          <path
            d={pathData}
            fill="none"
            stroke="url(#line-color)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_2px_8px_rgba(124,77,255,0.4)]"
          />

          {/* Dot Markers */}
          {points.map((p, idx) => (
            <g key={idx} className="group/dot cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="var(--accent-fg)"
                stroke="#00E5FF"
                strokeWidth="2"
              />
              <title>{`${trends[idx].date || trends[idx].hour}: ${trends[idx].count} req`}</title>
            </g>
          ))}
        </svg>
        <div className="flex justify-between px-2 text-[10px] text-fg-subtle">
          <span>{trends[0].date || trends[0].hour.split(' ')[1] || trends[0].hour}</span>
          <span>{trends[Math.floor(trends.length / 2)].date || trends[Math.floor(trends.length / 2)].hour.split(' ')[1] || trends[Math.floor(trends.length / 2)].hour}</span>
          <span>{trends[trends.length - 1].date || trends[trends.length - 1].hour.split(' ')[1] || trends[trends.length - 1].hour}</span>
        </div>
      </div>
    )
  }

  return (
    <AppShell title="OTP Analytics Dashboard">
      <main className="page-container max-w-6xl pb-12">
        {/* Top Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-fg font-display tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-accent" />
              OTP Analytics
            </h1>
            <p className="text-sm text-fg-muted mt-1">
              Real-time monitoring of SMS delivery, conversion funnels, and gateway telemetry.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="px-3.5 py-1.5 text-sm font-medium border border-border rounded-lg bg-bg-elevated text-fg hover:border-accent transition-all duration-200"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.country} - {c.operator} ({c.name})
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || loading}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-danger-muted/10 border border-danger/20 text-danger text-sm mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-fg-muted">
            <RefreshCw className="w-8 h-8 animate-spin text-accent" />
            <span className="text-sm font-medium">Gathering telemetry metrics...</span>
          </div>
        ) : !analytics ? (
          <div className="surface-card p-12 text-center text-fg-subtle">
            No analytics data loaded.
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 relative overflow-hidden bg-bg-elevated/40 border border-border/80">
                <div className="text-fg-subtle text-xs font-semibold uppercase tracking-wider mb-2">Total Requests</div>
                <div className="text-2xl font-bold font-display text-fg">{analytics.summary.totalRequests}</div>
                <div className="text-[10px] text-fg-muted mt-1.5 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-accent" />
                  <span>OTP dispatch events</span>
                </div>
              </Card>

              <Card className="p-4 relative overflow-hidden bg-bg-elevated/40 border border-border/80">
                <div className="text-fg-subtle text-xs font-semibold uppercase tracking-wider mb-2">Success Rate</div>
                <div className="text-2xl font-bold font-display text-success">{analytics.summary.successRate}%</div>
                <div className="w-full bg-border rounded-full h-1 mt-2.5">
                  <div
                    className="bg-success h-1 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]"
                    style={{ width: `${Math.min(100, analytics.summary.successRate)}%` }}
                  />
                </div>
              </Card>

              <Card className="p-4 relative overflow-hidden bg-bg-elevated/40 border border-border/80">
                <div className="text-fg-subtle text-xs font-semibold uppercase tracking-wider mb-2">Avg Resends</div>
                <div className="text-2xl font-bold font-display text-fg">{analytics.summary.avgResendCount}</div>
                <div className="text-[10px] text-fg-muted mt-1.5 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-warning" />
                  <span>Requests per phone</span>
                </div>
              </Card>

              <Card className="p-4 relative overflow-hidden bg-bg-elevated/40 border border-border/80">
                <div className="text-fg-subtle text-xs font-semibold uppercase tracking-wider mb-2">Verification Speed</div>
                <div className="text-2xl font-bold font-display text-fg">{analytics.summary.avgVerificationTime}s</div>
                <div className="text-[10px] text-fg-muted mt-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-info" />
                  <span>Avg delay to match code</span>
                </div>
              </Card>
            </div>

            {/* 2. Funnel Visualizer & Top Failed Campaigns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Funnel Visualizer */}
              <Card className="lg:col-span-2 p-5 bg-bg-elevated/20 border border-border/80">
                <h3 className="text-sm font-bold text-fg mb-5 font-display flex items-center gap-2">
                  <TrendingUp className="w-4.5 h-4.5 text-accent" />
                  Conversion Funnel
                </h3>
                <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4">
                  {/* Step 1: Requested */}
                  <div className="flex-1 rounded-lg bg-bg-base/60 border border-border p-4 flex flex-col justify-between relative">
                    <div>
                      <div className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">Step 1</div>
                      <div className="text-xs font-semibold text-fg-subtle">Requested</div>
                    </div>
                    <div className="text-xl font-bold text-fg mt-4">{analytics.funnel.requested}</div>
                  </div>

                  <div className="flex items-center justify-center sm:self-center shrink-0">
                    <ChevronRight className="w-5 h-5 text-fg-subtle rotate-90 sm:rotate-0" />
                  </div>

                  {/* Step 2: Sent */}
                  <div className="flex-1 rounded-lg bg-bg-base/60 border border-border p-4 flex flex-col justify-between relative">
                    <div>
                      <div className="text-[10px] font-bold text-info uppercase tracking-wider mb-1">Step 2</div>
                      <div className="text-xs font-semibold text-fg-subtle">Sent</div>
                      {analytics.funnel.requested > 0 && (
                        <div className="text-[10px] text-success font-medium mt-0.5">
                          {Math.round((analytics.funnel.sent / analytics.funnel.requested) * 100)}% delivery
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-bold text-fg mt-4">{analytics.funnel.sent}</div>
                  </div>

                  <div className="flex items-center justify-center sm:self-center shrink-0">
                    <ChevronRight className="w-5 h-5 text-fg-subtle rotate-90 sm:rotate-0" />
                  </div>

                  {/* Step 3: Verified */}
                  <div className="flex-1 rounded-lg bg-bg-base/60 border border-border p-4 flex flex-col justify-between relative">
                    <div>
                      <div className="text-[10px] font-bold text-success uppercase tracking-wider mb-1">Step 3</div>
                      <div className="text-xs font-semibold text-fg-subtle">Verified</div>
                      {analytics.funnel.sent > 0 && (
                        <div className="text-[10px] text-success font-medium mt-0.5">
                          {Math.round((analytics.funnel.verified / analytics.funnel.sent) * 100)}% verified
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-bold text-fg mt-4">{analytics.funnel.verified}</div>
                  </div>

                  <div className="flex items-center justify-center sm:self-center shrink-0">
                    <ChevronRight className="w-5 h-5 text-fg-subtle rotate-90 sm:rotate-0" />
                  </div>

                  {/* Step 4: Subscribed */}
                  <div className="flex-1 rounded-lg bg-gradient-to-br from-accent/15 to-info/10 border border-accent/30 p-4 flex flex-col justify-between relative">
                    <div>
                      <div className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider mb-1">Final</div>
                      <div className="text-xs font-semibold text-fg">Subscribed</div>
                      {analytics.funnel.verified > 0 && (
                        <div className="text-[10px] text-success font-medium mt-0.5">
                          {Math.round((analytics.funnel.subscribed / analytics.funnel.verified) * 100)}% checkout
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-bold text-[#00E5FF] mt-4">{analytics.funnel.subscribed}</div>
                  </div>
                </div>
              </Card>

              {/* Top Failed Campaigns */}
              <Card className="p-5 bg-bg-elevated/20 border border-border/80">
                <h3 className="text-sm font-bold text-fg mb-4 font-display flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-danger" />
                  Top Failed Campaigns
                </h3>
                {analytics.topFailedCampaigns.length === 0 ? (
                  <div className="text-xs text-fg-subtle py-8 text-center">No failure telemetry logged.</div>
                ) : (
                  <div className="space-y-3">
                    {analytics.topFailedCampaigns.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-bg-base/40 border border-border">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-fg truncate">{c.campaignName}</p>
                          <p className="text-[10px] text-fg-subtle mt-0.5">{c.total} total requests</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-danger">{c.failureRate}%</span>
                          <p className="text-[9px] text-danger-muted mt-0.5">{c.failed} fails</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* 3. Trends & Timeline Graph */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-5 bg-bg-elevated/20 border border-border/80">
                <h3 className="text-sm font-bold text-fg mb-4 font-display flex items-center gap-2">
                  <TrendingUp className="w-4.5 h-4.5 text-accent" />
                  Daily Trends (Last 30 Days)
                </h3>
                {renderTrendChart(analytics.dailyTrends)}
              </Card>

              <Card className="p-5 bg-bg-elevated/20 border border-border/80">
                <h3 className="text-sm font-bold text-fg mb-4 font-display flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-info" />
                  Hourly Load (Last 24 Hours)
                </h3>
                {renderTrendChart(analytics.hourlyTrends)}
              </Card>
            </div>

            {/* 4. Provider Comparison & Target Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Provider Comparison */}
              <Card className="p-5 bg-bg-elevated/20 border border-border/80">
                <h3 className="text-sm font-bold text-fg mb-4 font-display flex items-center gap-2">
                  <Cpu className="w-4.5 h-4.5 text-accent" />
                  Provider Performance Comparison
                </h3>
                {analytics.providerPerformance.length === 0 ? (
                  <div className="text-xs text-fg-subtle py-8 text-center">No provider stats logged.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-fg-muted font-semibold">
                          <th className="py-2">Provider</th>
                          <th className="py-2 text-center">Total Req</th>
                          <th className="py-2 text-center">Success %</th>
                          <th className="py-2 text-center">Avg Latency</th>
                          <th className="py-2 text-center">Circuit Breaker</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {analytics.providerPerformance.map((p, idx) => (
                          <tr key={idx} className="text-fg-subtle hover:text-fg">
                            <td className="py-2.5 font-medium text-fg uppercase">{p.provider}</td>
                            <td className="py-2.5 text-center">{p.total}</td>
                            <td className="py-2.5 text-center text-success font-semibold">{p.successRate}%</td>
                            <td className="py-2.5 text-center">{p.avgLatencyMs ? `${p.avgLatencyMs}ms` : '-'}</td>
                            <td className="py-2.5 text-center">
                              {p.tripped ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-danger/10 text-danger border border-danger/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                                  TRIPPED
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                  CLOSED (HEALTHY)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Geographic / Country Performance */}
              <Card className="p-5 bg-bg-elevated/20 border border-border/80">
                <h3 className="text-sm font-bold text-fg mb-4 font-display flex items-center gap-2">
                  <Globe className="w-4.5 h-4.5 text-info" />
                  Country Performance Comparison
                </h3>
                {analytics.countryPerformance.length === 0 ? (
                  <div className="text-xs text-fg-subtle py-8 text-center">No geo stats logged.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-fg-muted font-semibold">
                          <th className="py-2">Country</th>
                          <th className="py-2 text-center">Total Req</th>
                          <th className="py-2 text-center">Verified</th>
                          <th className="py-2 text-center">Success %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {analytics.countryPerformance.map((c, idx) => (
                          <tr key={idx} className="text-fg-subtle hover:text-fg">
                            <td className="py-2.5 font-medium text-fg">{c.country}</td>
                            <td className="py-2.5 text-center">{c.total}</td>
                            <td className="py-2.5 text-center">{c.verified}</td>
                            <td className="py-2.5 text-center text-success font-semibold">{c.successRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  )
}

export default memo(OtpAnalyticsPage)
