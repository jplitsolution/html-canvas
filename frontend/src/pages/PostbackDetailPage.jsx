import { memo, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  XCircle,
  ExternalLink,
  Phone,
  Store,
  Clock,
  Zap,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import { formatDate } from '../utils/date'
import { firePostback, getPostback } from '../services/api/partners'
import useStore from '../store/useStore'

function Step({ done, failed, title, subtitle, children }) {
  let Icon = Circle
  let iconClass = 'text-gray-300'
  if (failed) {
    Icon = XCircle
    iconClass = 'text-rose-500'
  } else if (done) {
    Icon = CheckCircle2
    iconClass = 'text-emerald-500'
  }
  return (
    <div className="flex gap-3">
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconClass}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
        {children ? <div className="mt-2 text-sm text-gray-700">{children}</div> : null}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 break-all">{children || '—'}</dd>
    </div>
  )
}

function PostbackDetailPage() {
  const { postbackId } = useParams()
  const navigate = useNavigate()
  const addToast = useStore((s) => s.addToast)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [firing, setFiring] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setError('')
    return getPostback(postbackId)
      .then((res) => setData(res))
      .catch((err) => {
        setError(err?.message || 'Failed to load postback')
      })
  }, [postbackId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getPostback(postbackId)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load postback')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [postbackId])

  const fireVendorPostback = async () => {
    if (!data || firing) return
    const alreadySent = String(data.status || '').toLowerCase() === 'sent'
    const ok = window.confirm(
      alreadySent
        ? 'This postback was already sent to the vendor. Fire it again?'
        : 'Fire this vendor CPA postback now?',
    )
    if (!ok) return
    setFiring(true)
    try {
      const result = await firePostback(postbackId, { force: alreadySent })
      if (result?.skipped || result?.vendorSkipped) {
        addToast(result.reason || 'Postback was not sent', 'error')
      } else if (result?.success === false) {
        addToast(result.error || result.errorMessage || 'Vendor postback failed', 'error')
      } else {
        addToast('Vendor postback fired', 'success')
      }
      await load()
    } catch (err) {
      addToast(err?.message || 'Failed to fire postback', 'error')
    } finally {
      setFiring(false)
    }
  }

  const life = data?.lifecycle || {}
  const fireFailed = life.vendorFireStatus === 'failed'
  const lastFiredUrl = [...(data?.relatedLogs || [])]
    .reverse()
    .find((l) => l.callType === 'vendor_postback' && l.requestUrl)?.requestUrl

  return (
    <AppShell
      actions={
        <div className="flex items-center gap-2">
          {data ? (
            <Button
              variant="primary"
              size="sm"
              onClick={fireVendorPostback}
              disabled={firing || loading}
            >
              <Zap className={`w-4 h-4 ${firing ? 'animate-pulse' : ''}`} />
              {firing ? 'Firing…' : 'Fire postback'}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => navigate('/postbacks')}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      }
    >
      <div className="page-container space-y-6 max-w-4xl">
        <div className="page-header">
          <h1 className="page-header-title">Postback #{postbackId}</h1>
          <p className="page-header-description">
            Create → billing callback (or manual fire) → vendor CPA
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3">
            {error}
          </div>
        ) : data ? (
          <>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Lifecycle</h2>
              <div className="space-y-5">
                <Step
                  done={life.created}
                  title="Postback created"
                  subtitle={life.createdAt ? formatDate(life.createdAt) : null}
                >
                  Queued in conversion_postbacks. Some flows (no operator billing
                  callback) stay pending until you fire vendor CPA from this page.
                  Funnel subscribe click can also create pending; HE detect does not.
                </Step>
                <Step
                  done={life.billingReceived}
                  title="Billing callback received"
                  subtitle={
                    life.billingReceived
                      ? life.billingReceivedAt
                        ? formatDate(life.billingReceivedAt)
                        : 'Yes'
                      : 'Not received yet'
                  }
                >
                  {life.billingReceived
                    ? life.vendorFireSkipReason ||
                    `Operator hit /api/flow/callback — status ${life.operatorStatus || data.operatorStatus || 'received'}.`
                    : 'Not required for every flow. If no operator callback arrives, use Fire postback to send vendor CPA.'}
                </Step>
                <Step
                  done={life.vendorFired && !fireFailed}
                  failed={fireFailed}
                  title={
                    fireFailed
                      ? 'Vendor fire failed'
                      : life.vendorFired
                        ? 'Vendor CPA fired'
                        : 'Vendor CPA not fired'
                  }
                  subtitle={
                    life.vendorName
                      ? `Sent to: ${life.vendorName}${life.vendorCode ? ` (${life.vendorCode})` : ''}`
                      : null
                  }
                >
                  {life.vendorFired ? (
                    <div className="space-y-1 text-xs font-mono text-gray-600">
                      <div>status: {life.vendorFireStatus}</div>
                      {data.httpStatus != null ? <div>HTTP: {data.httpStatus}</div> : null}
                      {data.sentAt ? <div>sentAt: {formatDate(data.sentAt)}</div> : null}
                      {data.errorMessage ? (
                        <div className="text-rose-600 whitespace-pre-wrap">{data.errorMessage}</div>
                      ) : null}
                    </div>
                  ) : life.vendorFireSkipReason ? (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                      {life.vendorFireSkipReason}
                      {life.allowedStatuses || life.receivedStatus ? (
                        <span className="block font-mono mt-1">
                          allowed: {life.allowedStatuses || '—'} · received:{' '}
                          {life.receivedStatus || life.operatorStatus || '—'}
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Waiting for a billable operator status, or fire it manually above.
                    </p>
                  )}
                </Step>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Attribution</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="MSISDN">
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {data.msisdn}
                  </span>
                </Field>
                <Field label="Operator callback">
                  <span className="font-medium">{data.operatorStatus || '—'}</span>
                </Field>
                <Field label="Vendor postback">
                  <span className="font-medium">{data.status}</span>
                </Field>
                <Field label="Vendor">
                  <span className="inline-flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-gray-400" />
                    {data.vendorName || '—'}
                    {data.vendorCode ? (
                      <span className="text-xs text-gray-400 font-mono">({data.vendorCode})</span>
                    ) : null}
                  </span>
                </Field>
                <Field label="Visit">
                  {data.visitId ? (
                    <Link
                      to={`/analytics/visits/${data.visitId}`}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      #{data.visitId}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : (
                    '—'
                  )}
                </Field>
                <Field label="click_id">
                  <span className="font-mono text-xs">{data.clickId}</span>
                </Field>
                <Field label="rcid">
                  <span className="font-mono text-xs">{data.rcid}</span>
                </Field>
                <Field label="campid (vendor)">
                  <span className="font-mono text-xs">{data.campid}</span>
                </Field>
                <Field label="tracking_campid">
                  <span className="font-mono text-xs">{data.trackingCampid}</span>
                </Field>
                <Field label="campaignId">{data.campaignId}</Field>
                <Field label="Updated">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(data.updatedAt)}
                  </span>
                </Field>
              </dl>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-semibold text-gray-800">Vendor postback URL / response</h2>
              <Field label="postback_url (template)">
                <span className="font-mono text-xs whitespace-pre-wrap">{data.postbackUrl}</span>
              </Field>
              {lastFiredUrl ? (
                <Field label="last fired URL">
                  <span className="font-mono text-xs whitespace-pre-wrap text-indigo-800">
                    {lastFiredUrl}
                  </span>
                </Field>
              ) : null}
              {data.responseBody ? (
                <Field label="response_body">
                  <pre className="mt-1 text-xs font-mono bg-gray-50 rounded-lg p-3 overflow-x-auto max-h-48">
                    {data.responseBody}
                  </pre>
                </Field>
              ) : null}
            </div>

            {data.relatedLogs?.length > 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">Related API logs</h2>
                <ul className="space-y-2">
                  {data.relatedLogs.map((l) => (
                    <li
                      key={l.id}
                      className="text-xs border border-gray-100 rounded-lg px-3 py-2 flex flex-wrap gap-x-4 gap-y-1"
                    >
                      <span className="font-mono font-medium text-indigo-700">{l.callType}</span>
                      <span className="text-gray-500">{formatDate(l.createdAt)}</span>
                      {l.responseStatus != null ? (
                        <span className="text-gray-600">HTTP {l.responseStatus}</span>
                      ) : null}
                      {l.success === false ? (
                        <span className="text-rose-600">{l.errorMessage || 'failed'}</span>
                      ) : null}
                      {l.requestUrl ? (
                        <span className="font-mono text-gray-700 break-all">{l.requestUrl}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </AppShell>
  )
}

export default memo(PostbackDetailPage)
