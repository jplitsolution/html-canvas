import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Eye,
  Globe,
  KeyRound,
  MousePointerClick,
  Phone,
  Terminal,
  User,
  XCircle,
  Code2,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import { getVisitDetail } from '../services/api/logs'
import { formatDate } from '../utils/date'

function getEventIcon(eventType) {
  const t = String(eventType || '').toUpperCase()
  if (t.startsWith('API_')) return <Code2 className="w-4 h-4 text-sky-600" />
  if (t.includes('SUBSCRIBED') || t.includes('SUCCESS')) {
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  }
  if (t.includes('FAILED') || t.includes('LIMIT') || t.includes('BRUTE') || t.includes('BLOCKED')) {
    return <XCircle className="w-4 h-4 text-rose-500" />
  }
  if (t.includes('OTP_VERIFY') || t.includes('OTP_EXPOSE_VERIFY')) return <KeyRound className="w-4 h-4 text-violet-500" />
  if (
    t.includes('OTP_SEND') ||
    t.includes('OTP_EXPOSE_SEND') ||
    t.includes('OTP_VIEW') ||
    t.includes('OTP_SHOWN')
  ) {
    return <Phone className="w-4 h-4 text-amber-500" />
  }
  if (t.includes('CLICK')) return <MousePointerClick className="w-4 h-4 text-indigo-500" />
  if (t.includes('VISIT')) return <Compass className="w-4 h-4 text-blue-500" />
  if (t.includes('VIEW') || t.includes('SHOWN')) return <Eye className="w-4 h-4 text-gray-500" />
  return <Clock className="w-4 h-4 text-gray-400" />
}

function statusClass(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'ACTIVE' || s.includes('SUCCESS') || s.includes('SUBSCRIBED')) {
    return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  }
  if (s === 'NEW' || s === 'INACTIVE' || s === 'PENDING' || s === 'GRACE' || s === 'PARKING' || s === 'HELD') {
    return 'text-amber-700 bg-amber-50 border-amber-200'
  }
  if (s.includes('FAILED') || s.includes('BLOCKED')) {
    return 'text-rose-700 bg-rose-50 border-rose-200'
  }
  return 'text-gray-600 bg-gray-50 border-gray-200'
}

function eventPack(metadata) {
  if (!metadata || typeof metadata !== 'object') return ''
  const raw = metadata.pack || metadata.planId
  return String(raw || '').trim().toLowerCase()
}

function eventChip(metadata, key) {
  if (!metadata || typeof metadata !== 'object') return ''
  return String(metadata[key] || '').trim()
}

function eventDescription(eventType) {
  switch (eventType) {
    case 'VISIT':
      return 'Visitor landed on the campaign URL.'
    case 'HOME_VIEW':
      return 'Home page displayed to user.'
    case 'SUBSCRIBE_CLICK':
      return 'User clicked a subscribe / billing button.'
    case 'CONFIRM_CLICK':
      return 'User confirmed a pack and hit the billing subscribe API.'
    case 'OTP_VIEW':
      return 'OTP page displayed.'
    case 'OTP_SEND':
      return 'OTP dispatched to subscriber device.'
    case 'OTP_VERIFY':
      return 'User submitted OTP for verification.'
    case 'SUBSCRIBE_SUCCESS':
      return 'Subscription confirmed or already subscribed.'
    case 'SUBSCRIBE_FAILED':
      return 'Subscription failed or rejected by partner gateway.'
    case 'API_CHECKSUB':
      return 'Partner subscription status check (checksub).'
    case 'API_PRIORITY':
      return 'Priority Chain API check (page actions).'
    case 'API_SUBSCRIBE':
      return 'Partner subscribe / billing API call.'
    case 'API_BLOCKLIST':
      return 'Partner blocklist check.'
    case 'API_RESOLVE_MSISDN':
      return 'Partner MSISDN resolve call.'
    case 'API_HE_TOKEN':
      return 'HE token exchange.'
    case 'API_HE_MSISDN':
      return 'HE masked MSISDN fetch.'
    case 'API_HE_RESOLVE':
      return 'HE custom MSISDN resolve.'
    case 'API_HE_REDIRECT':
      return 'HE success/fail redirect decision.'
    case 'API_BILLING_CALLBACK':
      return 'Billing / operator callback received on our endpoint.'
    case 'API_VENDOR_POSTBACK':
      return 'Outbound vendor / affiliate CPA postback we fired.'
    case 'API_OTP_SEND':
      return 'Outbound partner OTP send API call.'
    case 'API_OTP_VERIFY':
      return 'Outbound partner OTP verify API call.'
    case 'API_OTP_EXPOSE_SEND_IN':
      return 'Inbound OTP expose send request (mediator).'
    case 'API_OTP_EXPOSE_VERIFY_IN':
      return 'Inbound OTP expose verify request (mediator).'
    case 'API_DCB_CONFIG':
      return 'Outbound Universe DCB public config fetch.'
    case 'API_DCB_SUBSCRIPTIONS':
      return 'Outbound Universe DCB subscriptions / status check.'
    case 'API_DCB_PINCODE':
      return 'Outbound Universe DCB PIN request to the operator.'
    case 'API_DCB_CONFIRM':
      return 'Outbound Universe DCB PIN confirm to the operator.'
    case 'API_DCB_EXPOSE_CONFIG_IN':
      return 'Inbound DCB expose pack list (vendor hit).'
    case 'API_DCB_EXPOSE_PINCODE_IN':
      return 'Inbound DCB expose PIN request (vendor hit).'
    case 'API_DCB_EXPOSE_CONFIRM_IN':
      return 'Inbound DCB expose PIN confirm (vendor hit).'
    case 'API_DCB_EXPOSE_STATUS_IN':
      return 'Inbound DCB expose status poll (vendor hit).'
    case 'CALLBACK_RECEIVED':
      return 'Billing callback hit our server — operator status is stored; vendor postback fires only for billable statuses (active / success).'
    case 'POSTBACK_PENDING':
      return 'Vendor CPA postback queued, waiting for billing confirmation.'
    case 'POSTBACK_SENT':
      return 'Vendor / affiliate postback fired successfully.'
    case 'POSTBACK_FAILED':
      return 'Vendor / affiliate postback failed or returned an error.'
    default:
      return null
  }
}

function JsonBlock({ value, label }) {
  if (value == null || value === '') return null
  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return (
    <div className="mt-3">
      {label && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
          {label}
        </p>
      )}
      <pre className="text-[11px] font-mono leading-relaxed bg-gray-950 text-gray-100 rounded-lg p-3 overflow-x-auto max-h-80 whitespace-pre-wrap break-all">
        {text}
      </pre>
    </div>
  )
}

function ApiCallCard({ call, defaultOpen }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const summary = call.summary || {}

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50/80"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <span className="text-xs font-black uppercase tracking-wide text-gray-800">
            {call.eventType?.replace(/_/g, ' ')}
          </span>
          {call.statusLabel && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusClass(call.statusLabel)}`}
            >
              {call.statusLabel}
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-gray-400 shrink-0">
          {call.createdAt ? formatDate(call.createdAt) : '—'}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {(call.callType === 'checksub' ||
            call.callType === 'priority' ||
            call.callType === 'subscribe') && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {call.callType === 'priority' && summary.priority != null && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">priority</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">
                    #{summary.priority}
                    {summary.pageType ? ` · ${summary.pageType}` : ''}
                  </p>
                </div>
              )}
              {call.callType === 'subscribe' && summary.pack ? (
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">pack</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">
                    {summary.pack}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">currentStatus</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">
                  {summary.currentStatus || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">subscriptionStatus</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">
                  {summary.subscriptionStatus || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">serviceId</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">
                  {summary.serviceId || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">responseCode</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">
                  {summary.responseCode != null ? String(summary.responseCode) : '—'}
                </p>
              </div>
            </div>
          )}

          {summary.responseMessage && (
            <p className="text-xs text-gray-600 mt-2">{summary.responseMessage}</p>
          )}

          {call.msisdn && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                MSISDN
              </p>
              <p className="text-[11px] font-mono text-gray-800">{call.msisdn}</p>
            </div>
          )}

          {call.requestUrl && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Request URL
              </p>
              <p className="text-[11px] font-mono text-indigo-700 break-all bg-indigo-50/50 rounded-lg px-3 py-2 border border-indigo-100">
                {call.requestUrl}
              </p>
            </div>
          )}

          {call.errorMessage && (
            <p className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {call.errorMessage}
            </p>
          )}

          <JsonBlock value={call.requestBody} label="Request body" />
          <JsonBlock value={call.responseBody} label="Response body" />
        </div>
      )}
    </div>
  )
}

function SessionDetailPage() {
  const { visitId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detail, setDetail] = useState(null)

  const load = useCallback(async () => {
    if (!visitId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getVisitDetail(visitId)
      setDetail(data)
    } catch (err) {
      setError(err.message || 'Failed to load session detail')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [visitId])

  useEffect(() => {
    load()
  }, [load])

  const visit = detail?.visit
  const apiById = useMemo(() => {
    const map = new Map()
    for (const c of detail?.apiCalls || []) map.set(c.id, c)
    return map
  }, [detail?.apiCalls])

  return (
    <AppShell
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/analytics')}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to logs
        </Button>
      }
    >
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Session detail
          </p>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            {visit?.clickId ? (
              <span className="font-mono">{visit.clickId}</span>
            ) : (
              <>Visit #{visitId}</>
            )}
            {visit?.campaignName ? (
              <span className="text-gray-400 font-medium"> · {visit.campaignName}</span>
            ) : null}
          </h1>
          {visit?.clickId ? (
            <p className="text-xs text-gray-400 mt-1 font-mono">Visit #{visitId}</p>
          ) : null}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs font-semibold text-gray-500">Loading session…</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-2 text-sm text-rose-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={load}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Subscriber
                </span>
                <p className="font-mono font-semibold text-gray-800 mt-1">
                  {visit?.phone || visit?.phoneMasked || 'Anonymous'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Geo &amp; Carrier
                </span>
                <p className="font-semibold text-gray-800 mt-1">
                  {visit?.country || '—'} / {visit?.operator || '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Traffic origin
                </span>
                <p className="font-semibold text-gray-800 mt-1 truncate">
                  {visit?.vidRaw ? `Vendor: ${visit.vidRaw}` : 'Direct'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Status
                </span>
                <p className="mt-1">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusClass(visit?.visitStatus)}`}
                  >
                    {visit?.visitStatus || '—'}
                  </span>
                </p>
              </div>
              {visit?.ipAddress && (
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5" /> Network IP
                  </span>
                  <p className="font-mono text-gray-700 mt-1">{visit.ipAddress}</p>
                </div>
              )}
              {visit?.clickId && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Click ID
                  </span>
                  <p className="font-mono text-indigo-600 mt-1 break-all">{visit.clickId}</p>
                </div>
              )}
              {visit?.rcid && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    RCID
                  </span>
                  <p className="font-mono text-gray-700 mt-1 break-all">{visit.rcid}</p>
                </div>
              )}
              {visit?.campid && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Campid
                  </span>
                  <p className="font-mono text-gray-700 mt-1 break-all">{visit.campid}</p>
                </div>
              )}
              {visit?.trackingCampid && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Tracking ID
                  </span>
                  <p className="font-mono text-gray-700 mt-1 break-all">{visit.trackingCampid}</p>
                </div>
              )}
              {visit?.userAgent && (
                <div className="col-span-2 md:col-span-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    User Agent
                  </span>
                  <p className="text-gray-600 mt-1 break-all">{visit.userAgent}</p>
                </div>
              )}
            </div>

            {(detail?.pagePath || []).length > 0 ? (
              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Funnel pages</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {detail.pagePath.map((page, idx) => (
                    <div key={`${page}-${idx}`} className="flex items-center gap-2">
                      <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-100 bg-indigo-50 text-indigo-700">
                        {page}
                      </span>
                      {idx < detail.pagePath.length - 1 ? (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-sm font-bold text-gray-900">API calls</h2>
              {(detail?.apiCalls || []).length === 0 ? (
                <p className="text-xs text-gray-400 italic">No partner API calls logged for this visit.</p>
              ) : (
                <div className="space-y-3">
                  {detail.apiCalls.map((call, idx) => (
                    <ApiCallCard
                      key={call.id}
                      call={call}
                      defaultOpen={
                        call.callType === 'checksub' ||
                        call.callType === 'priority' ||
                        call.callType === 'vendor_postback' ||
                        call.callType === 'billing_callback' ||
                        idx === 0
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold text-gray-900">Session timeline</h2>
              <div className="relative pl-8 py-2">
                <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-200" />
                <div className="space-y-5">
                  {(detail?.timeline || []).map((item) => {
                    const apiCall =
                      item.kind === 'api' ? apiById.get(item.apiCallId) : null
                    const label =
                      item.kind === 'api'
                        ? apiCall?.statusLabel || item.metadata?.statusLabel
                        : item.metadata?.held
                          ? 'HELD'
                          : visit?.visitStatus
                    const desc = eventDescription(item.eventType)
                    const pack = eventPack(item.metadata)
                    const serviceId = eventChip(item.metadata, 'serviceId')
                    const subServiceId = eventChip(item.metadata, 'subServiceId')
                    return (
                      <div key={`${item.id}-${item.eventType}`} className="relative">
                        <div className="absolute -left-8 top-0.5 w-8 h-8 rounded-full border bg-white flex items-center justify-center shadow-sm">
                          {getEventIcon(item.eventType)}
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wide text-gray-800">
                                {(item.eventType || '—').replace(/_/g, ' ')}
                              </span>
                              {label && (
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusClass(label)}`}
                                >
                                  {label}
                                </span>
                              )}
                              {pack && (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border text-indigo-700 bg-indigo-50 border-indigo-200">
                                  {pack}
                                </span>
                              )}
                              {serviceId && (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border text-slate-700 bg-slate-50 border-slate-200">
                                  {serviceId}
                                </span>
                              )}
                              {subServiceId && (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border text-violet-700 bg-violet-50 border-violet-200">
                                  {subServiceId}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {item.createdAt ? formatDate(item.createdAt) : '—'}
                            </span>
                          </div>
                          {desc && (
                            <p className="text-xs text-gray-500 mt-1.5">{desc}</p>
                          )}
                          {(apiCall?.callType === 'checksub' ||
                            apiCall?.callType === 'priority') &&
                            apiCall.summary && (
                            <p className="text-xs text-gray-700 mt-1.5 font-medium">
                              {apiCall.callType === 'priority' &&
                                apiCall.summary.priority != null && (
                                  <>priority=#{apiCall.summary.priority} · </>
                                )}
                              currentStatus={apiCall.summary.currentStatus || '—'}
                              {' · '}
                              subscriptionStatus={apiCall.summary.subscriptionStatus || '—'}
                            </p>
                          )}
                          {item.kind === 'event' && item.metadata?.info && (
                            <p className="text-xs text-gray-600 mt-1">{item.metadata.info}</p>
                          )}
                          {item.kind === 'event' && item.metadata?.url && (
                            <p className="text-[11px] font-mono text-sky-700 mt-1 break-all">
                              {item.metadata.url}
                              {item.metadata.httpStatus != null
                                ? ` · HTTP ${item.metadata.httpStatus}`
                                : ''}
                            </p>
                          )}
                          {item.kind === 'event' && item.metadata?.responseBody != null && (
                            <JsonBlock
                              label="Response"
                              value={item.metadata.responseBody}
                            />
                          )}
                          {item.kind === 'api' && apiCall?.requestUrl && (
                            <p className="text-[11px] font-mono text-sky-700 mt-1 break-all">
                              {apiCall.requestUrl}
                              {apiCall.responseStatus != null
                                ? ` · HTTP ${apiCall.responseStatus}`
                                : ''}
                            </p>
                          )}
                          {item.kind === 'api' && apiCall?.requestBody != null && (
                            <JsonBlock
                              label="Request"
                              value={apiCall.requestBody}
                            />
                          )}
                          {item.kind === 'api' && apiCall?.responseBody != null && (
                            <JsonBlock
                              label="Response"
                              value={apiCall.responseBody}
                            />
                          )}
                          {item.kind === 'api' && apiCall?.errorMessage && (
                            <p className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                              {apiCall.errorMessage}
                            </p>
                          )}
                          {item.kind === 'event' &&
                            (item.metadata?.inboundUrl ||
                              item.metadata?.partnerUrl) && (
                              <div className="mt-1 space-y-1">
                                {item.metadata.inboundUrl && (
                                  <p className="text-[11px] font-mono text-sky-700 break-all">
                                    in: {item.metadata.inboundUrl}
                                  </p>
                                )}
                                {item.metadata.partnerUrl && (
                                  <p className="text-[11px] font-mono text-indigo-700 break-all">
                                    partner: {item.metadata.partnerUrl}
                                  </p>
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            <div className="pt-2">
              <Link
                to="/analytics"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                ← Back to Campaign Logs
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

export default memo(SessionDetailPage)
