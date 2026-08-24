import { memo, useEffect, useState } from 'react'
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
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import { formatDate } from '../utils/date'
import { getPostback } from '../services/api/partners'

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
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const life = data?.lifecycle || {}
  const fireFailed = life.vendorFireStatus === 'failed'

  return (
    <AppShell
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate('/postbacks')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      }
    >
      <div className="page-container space-y-6 max-w-4xl">
        <div className="page-header">
          <h1 className="page-header-title">Postback #{postbackId}</h1>
          <p className="page-header-description">
            Create → billing callback → vendor CPA fire
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
                  Queued in conversion_postbacks — waiting for operator billing callback.
                  Funnel subscribe click can create pending; HE detect does not.
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
                    ? `Operator hit /api/flow/callback — status ${life.operatorStatus || data.operatorStatus || 'received'}. Vendor fire only if billable (active/success).`
                    : 'Still pending — vendor CPA has not been fired from billing yet.'}
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
                  ) : null}
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
              <Field label="postback_url">
                <span className="font-mono text-xs whitespace-pre-wrap">{data.postbackUrl}</span>
              </Field>
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
