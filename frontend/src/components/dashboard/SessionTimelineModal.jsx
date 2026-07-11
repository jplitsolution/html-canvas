import { memo, useEffect, useState, useCallback } from 'react'
import {
  X,
  Compass,
  Eye,
  Phone,
  KeyRound,
  MousePointerClick,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  AlertTriangle,
  Clock,
  User,
  Globe,
  Terminal,
  Activity,
  Calendar,
} from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../ui/Button'
import { searchCampaignLogs } from '../../services/api/logs'
import { formatDate } from '../../utils/date'

// Icon selector for timeline event types
function getEventIcon(eventType) {
  const t = String(eventType).toUpperCase()
  if (t.includes('SUBSCRIBED') || t.includes('SUCCESS')) {
    return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
  }
  if (t.includes('FAILED') || t.includes('LIMIT') || t.includes('BRUTE') || t.includes('BLOCKED')) {
    return <XCircle className="w-5 h-5 text-rose-500" />
  }
  if (t.includes('OTP_VERIFY')) {
    return <KeyRound className="w-5 h-5 text-violet-500" />
  }
  if (t.includes('OTP_SEND') || t.includes('OTP_VIEW') || t.includes('OTP_SHOWN')) {
    return <Phone className="w-5 h-5 text-amber-500" />
  }
  if (t.includes('CLICK')) {
    return <MousePointerClick className="w-5 h-5 text-indigo-500" />
  }
  if (t.includes('VISIT')) {
    return <Compass className="w-5 h-5 text-blue-500" />
  }
  if (t.includes('VIEW') || t.includes('SHOWN')) {
    return <Eye className="w-5 h-5 text-gray-500" />
  }
  return <Clock className="w-5 h-5 text-gray-400" />
}

// Background colors for the timeline circles
function getEventIconBg(eventType) {
  const t = String(eventType).toUpperCase()
  if (t.includes('SUBSCRIBED') || t.includes('SUCCESS')) return 'bg-emerald-50 border-emerald-200'
  if (t.includes('FAILED') || t.includes('LIMIT') || t.includes('BRUTE') || t.includes('BLOCKED')) return 'bg-rose-50 border-rose-200'
  if (t.includes('OTP_VERIFY')) return 'bg-violet-50 border-violet-200'
  if (t.includes('OTP_SEND') || t.includes('OTP_VIEW') || t.includes('OTP_SHOWN')) return 'bg-amber-50 border-amber-200'
  if (t.includes('CLICK')) return 'bg-indigo-50 border-indigo-200'
  if (t.includes('VISIT')) return 'bg-blue-50 border-blue-200'
  return 'bg-gray-50 border-gray-200'
}

function SessionTimelineModal({ isOpen, onClose, visitId, campaignId }) {
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)

  const fetchSessionEvents = useCallback(async () => {
    if (!visitId) return
    setLoading(true)
    setError(null)
    try {
      // Query events for this specific visit session, large page size to capture the full flow
      const res = await searchCampaignLogs(campaignId, { visitId, page: 1, size: 150 })
      // Sort in chronological order (oldest first)
      const sorted = (res.items || []).sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      )
      setEvents(sorted)
    } catch (err) {
      setError(err.message || 'Failed to fetch session flow logs')
    } finally {
      setLoading(false)
    }
  }, [visitId, campaignId])

  useEffect(() => {
    if (isOpen && visitId) {
      fetchSessionEvents()
    } else {
      setEvents([])
    }
  }, [isOpen, visitId, fetchSessionEvents])

  // Retrieve general visit context info from the first event in the session
  const sessionInfo = events[0] || {}

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Session Flow Timeline`} size="lg">
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* Session Metadata Header */}
        {visitId && (
          <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-6 font-sans">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Visit Session ID</span>
              <span className="font-mono font-bold text-gray-800 text-[11px]">#{visitId}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><User className="w-3.5 h-3.5" /> Subscriber</span>
              <span className="font-mono font-medium text-gray-700 text-[11px]">
                {sessionInfo.phoneMasked ? (
                  <span className="text-emerald-750 font-semibold">{sessionInfo.phoneMasked}</span>
                ) : (
                  <span className="text-gray-450 italic">Anonymous</span>
                )}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Geo &amp; Carrier</span>
              <span className="font-semibold text-gray-750 text-[11px]">
                {sessionInfo.country || '—'} / {sessionInfo.operator || '—'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 col-span-2 md:col-span-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Traffic Origin</span>
              <span className="text-gray-750 font-semibold truncate text-[11px]">
                {sessionInfo.vidRaw || sessionInfo.affRaw ? (
                  `Vendor: ${sessionInfo.vidRaw || '—'} (Aff: ${sessionInfo.affRaw || '—'})`
                ) : (
                  <span className="text-gray-450 italic">Direct Traffic</span>
                )}
              </span>
            </div>
            {sessionInfo.ip && (
              <div className="flex flex-col gap-0.5 col-span-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Terminal className="w-3.5 h-3.5" /> Network IP</span>
                <span className="font-mono text-gray-600 text-[11px]">{sessionInfo.ip}</span>
              </div>
            )}
            {sessionInfo.userAgent && (
              <div className="flex flex-col gap-0.5 col-span-2 md:col-span-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">User Agent</span>
                <span className="text-gray-550 truncate text-[11px]" title={sessionInfo.userAgent}>
                  {sessionInfo.userAgent}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto px-1 min-h-[300px] font-sans">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-semibold text-gray-500">Tracing visitor session events...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-105 bg-red-50/50 p-4 text-center text-sm text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-650 shrink-0" />
              <span>{error}</span>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold">No event history found for this session ID.</p>
            </div>
          ) : (
            <div className="relative pl-8 pr-2 py-4">
              {/* Connecting vertical line */}
              <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gray-200 border-l border-dashed border-gray-350" />

              <div className="space-y-8">
                {events.map((event, idx) => (
                  <div key={`${event.timestamp}-${idx}`} className="relative flex flex-col md:flex-row md:items-start gap-4">
                    {/* Event Type Icon Badge */}
                    <div className={`absolute -left-8 top-0.5 w-8 h-8 rounded-full border flex items-center justify-center z-10 shadow-3xs ${getEventIconBg(event.eventType)}`}>
                      {getEventIcon(event.eventType)}
                    </div>

                    {/* Timestamp Info */}
                    <div className="md:w-36 shrink-0 pt-1 flex items-center gap-1.5 text-xs text-gray-450 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-gray-300" />
                      <span className="font-mono text-[11px] whitespace-nowrap">
                        {event.timestamp ? formatDate(event.timestamp) : '—'}
                      </span>
                    </div>

                    {/* Event Description Card */}
                    <div className="flex-1 rounded-xl border border-gray-150 bg-white p-3 shadow-4xs hover:border-gray-300/80 transition-all duration-200">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black text-gray-800 tracking-wide uppercase">
                          {event.eventType ? event.eventType.replace(/_/g, ' ') : '—'}
                        </span>
                        {event.pageType && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-150">
                            /{event.pageType}
                          </span>
                        )}
                      </div>

                      {/* Dynamic Detail Messages based on event type */}
                      <div className="text-xs text-gray-550 mt-2 leading-relaxed">
                        {event.eventType === 'VISIT' && 'Visitor landed on the campaign URL.'}
                        {event.eventType === 'HOME_VIEW' && 'Home Page displayed to user.'}
                        {event.eventType === 'SUBSCRIBE_CLICK' && 'User clicked the billing subscription/confirm button.'}
                        {event.eventType === 'OTP_VIEW' && 'OTP Input Field page displayed.'}
                        {event.eventType === 'OTP_SEND' && 'Verification OTP code dispatched successfully to subscriber device.'}
                        {event.eventType === 'OTP_VERIFY' && 'User submitted verification OTP for verification.'}
                        {event.eventType === 'SUBSCRIBE_SUCCESS' && (
                          <span className="text-emerald-750 font-bold">
                            Billing session subscription confirmed! User registered successfully.
                          </span>
                        )}
                        {event.eventType === 'SUBSCRIBE_FAILED' && (
                          <span className="text-rose-750 font-bold">
                            Subscription failed or rejected by partner gateway.
                          </span>
                        )}
                        {event.status && (
                          <div className="mt-1 text-[10px] text-gray-400 font-mono">
                            Session Status: <span className="font-bold">{event.status}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 font-sans">
          <Button variant="outline" onClick={onClose} className="px-5 py-2 rounded-xl text-gray-600 bg-white border-gray-250 hover:bg-gray-50">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default memo(SessionTimelineModal)
