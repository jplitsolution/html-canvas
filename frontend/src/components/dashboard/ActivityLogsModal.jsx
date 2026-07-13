import { memo, useEffect, useState, useCallback, Fragment } from 'react'
import { 
  X, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Compass, 
  Eye, 
  MousePointerClick, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Clock, 
  AlertTriangle,
  FileText,
  User,
  Globe,
  Terminal,
  Activity,
  Phone,
  KeyRound,
} from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Badge from '../ui/Badge'
import { getCampaignActivityLogs } from '../../services/api/campaigns'
import { getVisitPagePath } from '../../utils/visitPagePath'

// Map visitStatus to Badge variants
const STATUS_BADGE_VARIANTS = {
  VISIT: 'default',
  BLOCKED: 'warning',
  SUBSCRIBED: 'primary',
  HOME_SHOWN: 'default',
  OTP_SHOWN: 'default',
  PLAN_SHOWN: 'default',
  CONFIRM_SHOWN: 'default',
  SUCCESS: 'success',
  FAILED: 'warning'
}

// Format event names nicely
function formatEventName(eventType) {
  return eventType
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const getStatusBadgeClass = (status) => {
  const s = String(status).toUpperCase();
  if (s.includes('SUCCESS') || s.includes('SUBSCRIBED')) {
    return 'text-emerald-600';
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

// Get icon for specific timeline events
function getEventIcon(eventType) {
  switch (eventType) {
    case 'VISIT':
      return <Compass className="w-4 h-4 text-blue-500" />
    case 'HOME_VIEW':
    case 'PLAN_VIEW':
    case 'CONFIRM_VIEW':
      return <Eye className="w-4 h-4 text-fg-muted" />
    case 'OTP_VIEW':
      return <Phone className="w-4 h-4 text-sky-500" />
    case 'OTP_SEND':
      return <Phone className="w-4 h-4 text-blue-500" />
    case 'OTP_VERIFY':
      return <KeyRound className="w-4 h-4 text-emerald-500" />
    case 'SUBSCRIBE_CLICK':
      return <MousePointerClick className="w-4 h-4 text-amber-500" />
    case 'SUBSCRIBE_SUCCESS':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    case 'SUBSCRIBE_FAILED':
      return <XCircle className="w-4 h-4 text-rose-500" />
    case 'BLOCKED':
    case 'BLOCKED_REQUEST':
      return <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
    case 'RATE_LIMIT_HIT':
    case 'BRUTE_FORCE_ATTEMPT':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />
    default:
      return <Clock className="w-4 h-4 text-fg-subtle" />
  }
}

function ActivityLogsModal({ isOpen, onClose, campaignId, campaignName }) {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Filters
  const [phoneSearch, setPhoneSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Expanded rows state
  const [expandedVisits, setExpandedVisits] = useState({})

  const fetchLogs = useCallback(async (targetPage = 1) => {
    if (!campaignId) return
    setLoading(true)
    try {
      const res = await getCampaignActivityLogs(campaignId, {
        page: targetPage,
        limit: 15,
        phone: phoneSearch,
        status: statusFilter
      })
      
      setLogs(res.data || [])
      setTotal(res.total || 0)
      setPage(res.page || 1)
      setTotalPages(res.totalPages || 1)
    } catch (err) {
      console.error('Failed to load activity logs:', err)
    } finally {
      setLoading(false)
    }
  }, [campaignId, phoneSearch, statusFilter])

  // Initial fetch and trigger on filter change
  useEffect(() => {
    if (isOpen) {
      fetchLogs(1)
      setExpandedVisits({})
    }
  }, [isOpen, fetchLogs])

  const toggleExpand = (visitId) => {
    setExpandedVisits((prev) => ({
      ...prev,
      [visitId]: !prev[visitId]
    }))
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchLogs(1)
  }

  const handleResetFilters = () => {
    setPhoneSearch('')
    setStatusFilter('all')
    setPage(1)
    // Wait for state updates to trigger useEffect
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Activity Logs — ${campaignName || 'Campaign'}`} size="xl">
      <div className="flex flex-col space-y-4">
        {/* Filter Controls Bar */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-bg-subtle/50">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* MSISDN Search */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
              <Input
                type="text"
                placeholder="Search MSISDN / Phone..."
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-fg outline-none focus:border-border-focus"
              >
                <option value="all">All Outcomes</option>
                <option value="SUCCESS">SUCCESS (Subscribed)</option>
                <option value="SUBSCRIBED">ALREADY SUBSCRIBED</option>
                <option value="FAILED">FAILED (Subscription Error)</option>
                <option value="BLOCKED">BLOCKED (Blacklist/Rule)</option>
                <option value="VISIT">VISIT (Opened Only)</option>
              </select>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button variant="primary" type="submit" size="sm" disabled={loading}>
                Apply
              </Button>
              {(phoneSearch || statusFilter !== 'all') && (
                <Button variant="outline" size="sm" onClick={handleResetFilters} type="button">
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs text-fg-muted font-medium">
              Total logs: <span className="text-fg font-semibold">{total}</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => fetchLogs(page)} title="Refresh logs" disabled={loading} type="button" className="p-2 aspect-square">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </form>

        {/* Main Logs Table */}
        <div className="border border-border rounded-xl bg-bg-elevated overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-subtle border-b border-border">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fg-muted w-10"></th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">Time</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">MSISDN (Phone)</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">Page Progress</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">Outcome Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-fg-muted">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                        <span>Loading activity logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                        <div className="p-3 rounded-full bg-accent-muted mb-3">
                          <FileText className="w-6 h-6 text-accent" />
                        </div>
                        <h4 className="font-semibold text-fg text-sm">No activity logs found</h4>
                        <p className="text-xs text-fg-muted mt-1">
                          {phoneSearch || statusFilter !== 'all' 
                            ? 'Try refining your search terms or filters.'
                            : 'No user interactions have been recorded for this campaign yet.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((visit) => {
                    const isExpanded = !!expandedVisits[visit.id]
                    return (
                      <Fragment key={visit.id}>
                        {/* Summary Row */}
                        <tr 
                          onClick={() => toggleExpand(visit.id)}
                          className="hover:bg-bg-subtle/40 transition-colors cursor-pointer select-none border-b border-border"
                        >
                          <td className="px-4 py-3 text-center">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-fg-muted" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-fg-muted" />
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-fg-muted font-mono text-xs">
                            {formatDateTime(visit.createdAt)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-fg">
                            {visit.phone ? (
                              <span className="inline-flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-fg-subtle" />
                                {visit.phone}
                              </span>
                            ) : (
                              <span className="text-fg-subtle italic text-xs font-normal">Anonymous</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1 max-w-xs">
                              {getVisitPagePath(visit).map((page, idx, pages) => (
                                <Fragment key={`${visit.id}-${page}-${idx}`}>
                                  <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-bg-subtle text-fg-muted font-mono font-medium">
                                    /{page}
                                  </span>
                                  {idx < pages.length - 1 && (
                                    <span className="text-fg-subtle text-[10px]">→</span>
                                  )}
                                </Fragment>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`font-bold tracking-wide text-[11px] ${getStatusBadgeClass(visit.visitStatus)}`}>
                              {visit.visitStatus}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {isExpanded && (
                          <tr className="bg-bg-subtle/20 border-b border-border">
                            <td colSpan="5" className="p-4 pl-12 bg-bg-subtle/10">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                
                                {/* Left side: Connection Metadata */}
                                <div className="space-y-3 lg:col-span-1 border-r border-border/60 pr-4">
                                  <h4 className="text-xs font-bold text-fg uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Globe className="w-3.5 h-3.5 text-accent" />
                                    Connection Details
                                  </h4>
                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <span className="text-fg-subtle block">IP Address</span>
                                      <code className="text-fg font-medium font-mono">{visit.ipAddress || '127.0.0.1'}</code>
                                    </div>
                                    <div>
                                      <span className="text-fg-subtle block">Landing Page URL</span>
                                      <span className="text-fg break-all font-mono text-[10px] block max-w-xs">{visit.landingUrl || '/'}</span>
                                    </div>
                                    <div>
                                      <span className="text-fg-subtle block">User Agent</span>
                                      <span className="text-fg-muted text-[10px] leading-relaxed block max-w-xs" title={visit.userAgent}>
                                        {visit.userAgent || 'Unknown Browser'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right side: Timeline Flow events */}
                                <div className="lg:col-span-2 space-y-3">
                                  <h4 className="text-xs font-bold text-fg uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-accent" />
                                    Funnel Action Timeline
                                  </h4>
                                  
                                  {visit.events && visit.events.length > 0 ? (
                                    <div className="relative pl-6 border-l border-border space-y-4 py-1">
                                      {visit.events.map((event, idx) => (
                                        <div key={event.id} className="relative">
                                          {/* Bullet point icon */}
                                          <div className="absolute -left-[34px] top-0.5 p-1 rounded-full bg-bg-elevated border border-border flex items-center justify-center">
                                            {getEventIcon(event.eventType)}
                                          </div>
                                          
                                          {/* Event content */}
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                            <div>
                                              <span className="font-semibold text-xs text-fg">
                                                {formatEventName(event.eventType)}
                                              </span>
                                              {event.metadata && Object.keys(event.metadata).length > 0 && (
                                                <div className="mt-1 p-1.5 rounded bg-bg-subtle/50 text-[10px] text-fg-muted font-mono flex items-center gap-1 max-w-md">
                                                  <Terminal className="w-3 h-3 flex-shrink-0 text-accent" />
                                                  <span className="break-all">{JSON.stringify(event.metadata)}</span>
                                                </div>
                                              )}
                                            </div>
                                            <span className="text-[10px] text-fg-subtle font-mono whitespace-nowrap">
                                              {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-fg-subtle italic">No granular timeline events logged.</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-fg-muted">
              Page <span className="text-fg font-semibold">{page}</span> of <span className="text-fg font-semibold">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(page - 1)}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default memo(ActivityLogsModal)
