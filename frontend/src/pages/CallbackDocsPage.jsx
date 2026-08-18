import { memo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Globe,
  Link2,
  Radio,
  Server,
  Store,
  Webhook,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'

const STEPS = [
  {
    n: '1',
    title: 'User lands on tracking URL',
    body: 'Vendor traffic hits /subscription with tracking_campid (ours), campid (vendor), vid, and click_id. We create a visit, keep the network click as rcid, and issue our own click_id. Vendor campid is stored for CPA postback {campid}.',
  },
  {
    n: '2',
    title: 'Subscribe / confirm (or CG redirect)',
    body: 'When we already have MSISDN (confirm, HE success, or CG with a number), we queue a pending vendor CPA row in conversion_postbacks. If HE never resolved the number, we only keep click_id on the visit — no pending row yet.',
  },
  {
    n: '3',
    title: 'Operator / billing calls us',
    body: 'After successful billing, the operator hits our public callback with msisdn, click_id (or ext_id), or both. Same role as SAFWAP GET /v1/callback. click_id + msisdn is the HE-fail case: user subscribed on CG, number was not resolved here.',
  },
  {
    n: '4',
    title: 'We fire the vendor postback',
    body: 'We match pending by MSISDN, or the visit by click_id, fill the vendor postback_url placeholders, GET that URL, and mark the row sent or failed. Events show on Campaign Logs / Session detail.',
  },
]

const PLACEHOLDERS = [
  { key: '{{msisdn}}', meaning: 'Subscriber MSISDN (digits)' },
  { key: '{{click_id}}', meaning: 'Our generated click id for the visit' },
  { key: '{{rcid}}', meaning: 'Network / vendor original click id' },
  { key: '{{campid}} / {{camp}}', meaning: 'Vendor / network campid from tracking URL (?campid=)' },
  { key: '{{tracking_campid}}', meaning: 'Our tracking id (BF-OBF-11) from ?tracking_campid=' },
  { key: '{{offer_code}}', meaning: 'Optional offer code if provided' },
  { key: '{{visit_id}}', meaning: 'Internal visit id' },
  { key: '{{vendor}}', meaning: 'Vendor code (e.g. ADM01)' },
]

function CodeBlock({ children }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-bg-muted/60 px-3.5 py-3 text-[12px] font-mono text-fg leading-relaxed whitespace-pre-wrap break-all">
      {children}
    </pre>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted text-accent">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
      </div>
      <div className="px-5 py-5 space-y-4 text-sm text-fg-muted leading-relaxed">{children}</div>
    </section>
  )
}

function CallbackDocsPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
  const callbackUrl = `${origin}/api/flow/callback`

  return (
    <AppShell>
      <div className="page-container max-w-3xl">
        <div className="page-header mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle mb-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Integration guide
          </p>
          <h1 className="page-header-title">Billing callback &amp; vendor postbacks</h1>
          <p className="page-header-description mt-2">
            How operators notify us after a successful subscribe, and how we then fire the vendor
            (CPA) postback — SAFWAP <code className="font-mono text-xs">/v1/callback</code> parity.
            Callback may send MSISDN, our click_id / ext_id, or both.
          </p>
        </div>

        <div className="space-y-6">
          <Section icon={Radio} title="End-to-end flow">
            <ol className="space-y-4">
              {STEPS.map((step) => (
                <li key={step.n} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fg text-bg-elevated text-xs font-bold">
                    {step.n}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-fg">{step.title}</p>
                    <p className="text-sm text-fg-muted mt-0.5">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-medium text-fg-subtle">
              <span className="rounded-md border border-border px-2 py-1">Tracking land</span>
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="rounded-md border border-border px-2 py-1">Pending CPA queued</span>
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="rounded-md border border-border px-2 py-1">Operator callback</span>
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="rounded-md border border-accent/30 bg-accent-muted/40 text-accent px-2 py-1">
                Vendor GET postback
              </span>
            </div>
          </Section>

          <Section icon={Webhook} title="How the operator should call us">
            <p>
              After billing succeeds, call our <strong className="text-fg">public</strong> callback
              endpoint. No auth token. GET or POST both work; query string and JSON body are merged.
              Send <strong className="text-fg">msisdn</strong>,{' '}
              <strong className="text-fg">click_id</strong>, or both — at least one is required.
            </p>
            <CodeBlock>{`GET  ${callbackUrl}?msisdn=966512345678&status=active
GET  ${callbackUrl}?click_id=HBA52IzFOZexXCRtFuTvIf&status=active
GET  ${callbackUrl}?ext_id=HBA52IzFOZexXCRtFuTvIf&msisdn=966512345678&status=active
POST ${callbackUrl}
Content-Type: application/json

{ "msisdn": "966512345678", "click_id": "HBA52IzFOZexXCRtFuTvIf", "status": "active" }`}</CodeBlock>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-bg-muted/50 border-b border-border">
                    <th className="px-3 py-2.5 font-semibold text-fg">Parameter</th>
                    <th className="px-3 py-2.5 font-semibold text-fg">Required</th>
                    <th className="px-3 py-2.5 font-semibold text-fg">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-3 py-2.5 font-mono text-fg">msisdn</td>
                    <td className="px-3 py-2.5">One of</td>
                    <td className="px-3 py-2.5">
                      Or <code className="font-mono">phone</code>. Non-digits stripped. Required
                      unless <code className="font-mono">click_id</code> is sent.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-mono text-fg">click_id</td>
                    <td className="px-3 py-2.5">One of</td>
                    <td className="px-3 py-2.5">
                      Also <code className="font-mono">clickId</code> or{' '}
                      <code className="font-mono">ext_id</code> (Safaricom CG). Our visit click id
                      that we put on the CG URL when the config has{' '}
                      <code className="font-mono">{'{click_id}'}</code>.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-mono text-fg">status</td>
                    <td className="px-3 py-2.5">No</td>
                    <td className="px-3 py-2.5">
                      Default <code className="font-mono">active</code>. Accepted:{' '}
                      <code className="font-mono">active</code>,{' '}
                      <code className="font-mono">success</code>,{' '}
                      <code className="font-mono">ok</code>,{' '}
                      <code className="font-mono">subscribed</code>,{' '}
                      <code className="font-mono">1</code>,{' '}
                      <code className="font-mono">true</code>. Other values are ignored (no postback).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-fg-subtle">
              SAFWAP equivalent: <code className="font-mono">GET /v1/callback?msisdn=&amp;status=</code>
              . Prefer sending both <code className="font-mono">click_id</code> (or{' '}
              <code className="font-mono">ext_id</code>) and <code className="font-mono">msisdn</code>{' '}
              when the user subscribed on CG after HE failed to resolve the number.
            </p>
          </Section>

          <Section icon={Server} title="What we do after the callback">
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Check <code className="font-mono text-fg">status</code>. Need{' '}
                <code className="font-mono text-fg">msisdn</code> or{' '}
                <code className="font-mono text-fg">click_id</code> /{' '}
                <code className="font-mono text-fg">ext_id</code>.
              </li>
              <li>
                <strong className="text-fg">click_id + msisdn</strong> — find the visit by{' '}
                <code className="font-mono text-fg">click_id</code>, insert/upsert{' '}
                <code className="font-mono text-fg">conversion_postbacks</code> with the subscribe
                number from the callback (HE-fail / CG subscribe), then fire. Duplicate MSISDN updates{' '}
                <code className="font-mono text-fg">click_id</code> on that row.
              </li>
              <li>
                <strong className="text-fg">msisdn only</strong> — find the latest pending row for
                that MSISDN. If none, fall back to the latest visit for that phone that has
                attribution (<code className="font-mono text-fg">rcid</code> /{' '}
                <code className="font-mono text-fg">click_id</code>), register pending, then fire.
              </li>
              <li>
                <strong className="text-fg">click_id only</strong> — find the visit by click_id and
                use <code className="font-mono text-fg">visit.phone</code>. Skip if the visit has no
                number (cannot unique-insert without MSISDN).
              </li>
              <li>
                Load the vendor&apos;s <code className="font-mono text-fg">postback_url</code>, fill
                placeholders, and <strong className="text-fg">HTTP GET</strong> it (10s timeout).
              </li>
              <li>
                Mark the row <code className="font-mono text-fg">sent</code> (HTTP 2xx) or{' '}
                <code className="font-mono text-fg">failed</code>, and log{' '}
                <code className="font-mono text-fg">POSTBACK_SENT</code> /{' '}
                <code className="font-mono text-fg">POSTBACK_FAILED</code> on the visit.
              </li>
            </ol>
            <p className="flex items-start gap-2 text-xs rounded-lg border border-border bg-bg-muted/40 px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span>
                Inspect a visit with the Eye button on{' '}
                <Link to="/analytics" className="text-accent hover:underline">
                  Campaign Logs
                </Link>{' '}
                — you will see pending → sent/failed plus the filled URL in session detail.
              </span>
            </p>
          </Section>

          <Section icon={Store} title="Vendor (CPA) postback URL">
            <p>
              Set the URL on{' '}
              <Link to="/vendors" className="text-accent hover:underline font-medium">
                Vendors
              </Link>
              . When billing callback arrives, we GET this template with values filled in. Single-brace
              SAFWAP style (<code className="font-mono">{'{rcid}'}</code>) also works.
            </p>
            <CodeBlock>
              {`https://partner.example/pb?click={{click_id}}&rcid={{rcid}}&msisdn={{msisdn}}&camp={{campid}}`}
            </CodeBlock>
            <p className="text-xs text-fg-muted">
              <code className="font-mono">{'{{campid}}'}</code> is the <strong>vendor</strong> campid
              from the tracking URL (<code className="font-mono">?campid=</code>), not our{' '}
              <code className="font-mono">tracking_campid</code> (BF-OBF-11).
            </p>
            <p className="text-xs text-fg-muted mt-2">
              Shareable tracking URL shape:
            </p>
            <CodeBlock>
              {`/subscription?country=…&operator=…&tracking_campid=BF-OBF-11&vid=MB02&click_id={}&campid={}`}
            </CodeBlock>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-bg-muted/50 border-b border-border">
                    <th className="px-3 py-2.5 font-semibold text-fg">Placeholder</th>
                    <th className="px-3 py-2.5 font-semibold text-fg">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PLACEHOLDERS.map((row) => (
                    <tr key={row.key}>
                      <td className="px-3 py-2.5 font-mono text-fg whitespace-nowrap">{row.key}</td>
                      <td className="px-3 py-2.5">{row.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-fg-subtle">
              No postback URL on the vendor → callback is accepted but CPA is skipped (
              <code className="font-mono">no postback_url on vendor</code>).
            </p>
          </Section>

          <Section icon={Link2} title="When a pending CPA is created">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-fg">Confirm click</strong> — user completes confirm in the
                funnel; we queue pending before partner APIs continue.
              </li>
              <li>
                <strong className="text-fg">CG / null-flow</strong> — landing redirects to CG and we
                already have MSISDN; pending is queued then. If HE did not resolve a number, we do
                not queue — the billing callback with <code className="font-mono">click_id</code> +
                msisdn creates the row.
              </li>
              <li>
                <strong className="text-fg">Optional pre-register</strong> (SAFWAP{' '}
                <code className="font-mono">getredirecturl</code> parity):
                <CodeBlock>{`POST ${origin}/api/flow/register-postback
{ "msisdn": "966512345678", "visitId": 123, "rcid": "...", "click_id": "..." }`}</CodeBlock>
              </li>
            </ul>
            <p>
              The vendor postback is <strong className="text-fg">not</strong> fired at confirm time.
              It waits for the operator callback (same idea as SAFWAP{' '}
              <code className="font-mono">callback_manage.sendcallback = 0</code> until billing hits).
            </p>
          </Section>

          <Section icon={Globe} title="Quick reference">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Operator → us
                </p>
                <p className="font-mono text-xs text-fg mt-1.5 break-all">{callbackUrl}</p>
              </div>
              <div className="rounded-lg border border-border px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Us → vendor
                </p>
                <p className="text-xs text-fg mt-1.5">
                  GET vendor <code className="font-mono">postback_url</code> after callback
                </p>
              </div>
            </div>
            <p className="text-xs text-fg-subtle pt-1">
              Configure vendors on{' '}
              <Link to="/vendors" className="text-accent hover:underline">
                Vendors
              </Link>
              , assign them on the campaign detail page, then share the tracking URL that includes{' '}
              <code className="font-mono">vid</code>.
            </p>
          </Section>
        </div>
      </div>
    </AppShell>
  )
}

export default memo(CallbackDocsPage)
