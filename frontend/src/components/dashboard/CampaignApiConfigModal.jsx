import { memo, useEffect, useMemo, useState } from 'react'
import { Check, Download, Smartphone, WifiOff } from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Tabs from '../ui/Tabs'
import useStore from '../../store/useStore'
import {
  testSendOtp,
  testVerifyOtp,
  checkOtpProviderHealth,
  PAGE_TYPES,
  PAGE_TYPE_LABELS,
} from '../../services/api/campaigns'
import {
  DEFAULT_DCB_CONFIG,
  buildDcbApiGuide,
  parseDcbConfig,
  previewConfirmPayload,
  previewPincodePayload,
  serializeDcbConfig,
} from './dcbConfig'
import { downloadTextFile } from '../../utils/download'
import { normalizeModeId } from '../flow/verificationModes'

const DEFAULT_ORANGE_BF_CONFIG = {
  baseUrl: 'http://103.153.58.55',
  serviceId: 'Health Portal Livliness',
  subServiceId: 'Health Portal Livliness pass jour',
  cpId: '100',
  channel: 'ussd',
  country: 'BF',
  operator: 'ORG',
  language: '_E',
  successKey: 'responseCode',
  successValue: '0',
}

const DEFAULT_PARTNER = {
  sendUrl: '',
  verifyUrl: '',
  method: 'GET',
  verifyMethod: 'GET',
  headersJson: '',
  bodyJson: '',
  verifyBodyJson: '',
  successKey: 'responseCode',
  successValue: '0',
  payoutPercent: 100,
}

function clampPayoutPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 100
  return Math.min(100, Math.max(0, Math.round(n)))
}

const DEFAULT_CHECKSUB = {
  statusField: 'currentStatus',
  rules: [],
  missGo: 'continue',
  missPage: 'ERROR',
  missUrl: '',
}

const CHECKSUB_PAGE_OPTIONS = PAGE_TYPES.filter((id) =>
  ['THANKYOU', 'INPROGRESS', 'LOW_BALANCE', 'BLOCKED', 'ERROR', 'HOME', 'OTP', 'CONFIRM'].includes(id)
)

function parseChecksubConfig(raw) {
  if (!raw) return { ...DEFAULT_CHECKSUB, rules: [] }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_CHECKSUB, rules: [] }
    }
    const rules = Array.isArray(parsed.rules)
      ? parsed.rules.map((r) => ({
          value: r?.value != null ? String(r.value) : '',
          go: r?.go === 'page' || r?.go === 'external' ? r.go : 'continue',
          page: r?.page || 'THANKYOU',
          url: r?.url || '',
        }))
      : []
    return {
      statusField: parsed.statusField || 'currentStatus',
      rules,
      missGo: parsed.missGo === 'page' || parsed.missGo === 'external' ? parsed.missGo : 'continue',
      missPage: parsed.missPage || 'ERROR',
      missUrl: parsed.missUrl || '',
    }
  } catch {
    return { ...DEFAULT_CHECKSUB, rules: [] }
  }
}

function serializeChecksubConfig(cfg) {
  if (!cfg) return null
  const rules = (cfg.rules || [])
    .map((r) => ({
      value: String(r.value || '').trim(),
      go: r.go === 'page' || r.go === 'external' ? r.go : 'continue',
      page: r.page || 'THANKYOU',
      url: String(r.url || '').trim(),
    }))
    .filter((r) => r.value)
  const statusField = String(cfg.statusField || 'currentStatus').trim() || 'currentStatus'
  const missGo = cfg.missGo === 'page' || cfg.missGo === 'external' ? cfg.missGo : 'continue'
  const isDefault = rules.length === 0 && statusField === 'currentStatus' && missGo === 'continue'
  if (isDefault) return null
  return JSON.stringify({
    statusField,
    rules,
    missGo,
    missPage: cfg.missPage || 'ERROR',
    missUrl: String(cfg.missUrl || '').trim(),
  })
}

const HE_MODES = [
  {
    id: 'header',
    title: 'Network header',
    subtitle: 'X-MSISDN from carrier (default)',
  },
  {
    id: 'none',
    title: 'Off',
    subtitle: 'OTP only — no auto-detect',
  },
  {
    id: 'custom_http',
    title: 'Custom API',
    subtitle: 'Operator resolve URL',
  },
  {
    id: 'safaricom_masked',
    title: 'Token + MSISDN',
    subtitle: 'Token API then masked number',
  },
]

const EMPTY_HE_FIELDS = {
  tokenUrl: '',
  maskedUrl: '',
  resolveUrl: '',
  failMessage: '',
  failRedirectUrl: '',
  successRedirectUrl: '',
}

function parseHeConfig(raw) {
  if (!raw) return { ...EMPTY_HE_FIELDS }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_HE_FIELDS }
    return {
      tokenUrl: parsed.tokenUrl || parsed.heTokenUrl || '',
      maskedUrl: parsed.maskedUrl || parsed.maskedMsisdnUrl || '',
      resolveUrl: parsed.url || parsed.resolveUrl || '',
      failMessage: parsed.failMessage || '',
      failRedirectUrl: parsed.failRedirectUrl || parsed.heFailRedirectUrl || '',
      successRedirectUrl: parsed.successRedirectUrl || parsed.heSuccessRedirectUrl || '',
    }
  } catch {
    return { ...EMPTY_HE_FIELDS }
  }
}

function buildHeConfigJson(provider, fields, resolveMsisdnUrl) {
  if (provider === 'header' || provider === 'none') return ''

  const out = {}
  if (provider === 'safaricom_masked') {
    if (fields.tokenUrl.trim()) out.tokenUrl = fields.tokenUrl.trim()
    if (fields.maskedUrl.trim()) out.maskedUrl = fields.maskedUrl.trim()
  }
  if (provider === 'custom_http') {
    const url = (fields.resolveUrl || resolveMsisdnUrl || '').trim()
    if (url) out.url = url
  }
  if (fields.failMessage.trim()) out.failMessage = fields.failMessage.trim()
  if (fields.failRedirectUrl.trim()) {
    out.failRedirectUrl = fields.failRedirectUrl.trim()
  }
  if (fields.successRedirectUrl.trim()) {
    out.successRedirectUrl = fields.successRedirectUrl.trim()
  }
  return Object.keys(out).length ? JSON.stringify(out, null, 2) : ''
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-fg">{label}</label>
        {hint ? <span className="text-[11px] text-fg-subtle">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

function CampaignApiConfigModal({ isOpen, onClose, campaignId, campaign }) {
  const loadCampaignApiConfig = useStore((s) => s.loadCampaignApiConfig)
  const saveCampaignApiConfig = useStore((s) => s.saveCampaignApiConfig)
  const addToast = useStore((s) => s.addToast)

  const mode = useMemo(() => normalizeModeId(campaign?.verificationMode), [campaign?.verificationMode])

  const availableTabs = useMemo(() => {
    if (mode === 'ORANGE_BF') {
      return [
        { id: 'orange_bf', label: 'Orange BF API' },
        { id: 'billing', label: 'Checksub Rules' },
      ]
    }
    if (mode === 'UNIVERSE_DCB') {
      return [
        { id: 'dcb', label: 'Universe DCB' },
      ]
    }
    if (mode === 'OTP_ONLY') {
      return [
        { id: 'otp', label: 'Partner OTP' },
        { id: 'billing', label: 'Checksub' },
      ]
    }
    if (mode === 'HEADER_INJECTION') {
      return [
        { id: 'he', label: 'Detect phone (HE)' },
        { id: 'billing', label: 'Checksub' },
      ]
    }
    if (mode === 'NONE' || mode === 'CG_HOME') {
      return [
        { id: 'billing', label: 'Campaign Settings' },
      ]
    }
    // Default / BOTH
    return [
      { id: 'billing', label: 'Checksub' },
      { id: 'he', label: 'Detect phone' },
      { id: 'otp', label: 'Partner OTP' },
    ]
  }, [mode])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState(() => availableTabs[0]?.id || 'billing')

  const [form, setForm] = useState({
    subscriptionApi: '',
    subscribeApi: '',
    blocklistApi: '',
    headersJson: '',
    resolveMsisdnUrl: '',
    heProvider: 'header',
  })
  const [heFields, setHeFields] = useState(EMPTY_HE_FIELDS)
  const [partnerConfig, setPartnerConfig] = useState(DEFAULT_PARTNER)
  const [orangeBfConfig, setOrangeBfConfig] = useState(DEFAULT_ORANGE_BF_CONFIG)
  const [dcbConfig, setDcbConfig] = useState(() => parseDcbConfig(null))
  const [checksubConfig, setChecksubConfig] = useState(() => ({
    ...DEFAULT_CHECKSUB,
    rules: [],
  }))

  const [testPhone, setTestPhone] = useState('')
  const [testOtp, setTestOtp] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [lastProviderRequestId, setLastProviderRequestId] = useState('')

  useEffect(() => {
    if (!isOpen || !campaignId) return
    setLoading(true)
    setTestResult('')
    setTestPhone('')
    setTestOtp('')

    const initialTab = mode === 'ORANGE_BF' ? 'orange_bf' : (availableTabs[0]?.id || 'billing')
    setActiveTab(initialTab)

    loadCampaignApiConfig(campaignId)
      .then((config = {}) => {
        const isOrangeBf = mode === 'ORANGE_BF'
        const provider = config?.heProvider || 'header'
        const parsedHe = parseHeConfig(config?.heConfigJson)

        const defaultSubscriptionApi = isOrangeBf
          ? 'http://103.153.58.55/subapi/checksub?msisdn={{msisdn}}&serviceId=Health Portal Livliness'
          : ''

        setForm({
          subscriptionApi: config?.subscriptionApi || defaultSubscriptionApi,
          subscribeApi: config?.subscribeApi || '',
          blocklistApi: config?.blocklistApi || '',
          headersJson: config?.headersJson || '',
          resolveMsisdnUrl: config?.resolveMsisdnUrl || parsedHe.resolveUrl || '',
          heProvider: provider,
        })
        setChecksubConfig(parseChecksubConfig(config?.checksubConfigJson))
        setDcbConfig(parseDcbConfig(config?.dcbConfigJson || config?.dcb_config_json))
        setHeFields({
          ...parsedHe,
          resolveUrl: config?.resolveMsisdnUrl || parsedHe.resolveUrl || '',
        })

        if (config?.headersJson) {
          try {
            const parsed = JSON.parse(config.headersJson)
            if (parsed && typeof parsed === 'object') {
              setOrangeBfConfig({
                ...DEFAULT_ORANGE_BF_CONFIG,
                ...parsed,
                baseUrl: config?.sendUrl ? new URL(config.sendUrl).origin : (parsed.baseUrl || DEFAULT_ORANGE_BF_CONFIG.baseUrl),
                successKey: config?.successKey || parsed.successKey || 'responseCode',
                successValue: config?.successValue ?? parsed.successValue ?? '0',
              })
            }
          } catch {
            setOrangeBfConfig(DEFAULT_ORANGE_BF_CONFIG)
          }
        } else {
          setOrangeBfConfig(DEFAULT_ORANGE_BF_CONFIG)
        }

        if (config?.otpConfigJson) {
          try {
            const parsed = JSON.parse(config.otpConfigJson)
            const source =
              parsed?.failover && parsed?.providers?.partner?.config ? parsed.providers.partner.config : parsed
            setPartnerConfig({
              ...DEFAULT_PARTNER,
              ...source,
              successKey: source.successKey || 'responseCode',
              successValue: source.successValue ?? '0',
              payoutPercent: clampPayoutPercent(source.payoutPercent ?? DEFAULT_PARTNER.payoutPercent),
            })
          } catch (e) {
            console.error('Failed to parse OTP config JSON', e)
            setPartnerConfig(DEFAULT_PARTNER)
          }
        } else if (isOrangeBf) {
          setPartnerConfig({
            ...DEFAULT_PARTNER,
            sendUrl: 'http://103.153.58.55/subapi/auth/otp/generate?msisdn={{msisdn}}&language=_E',
            verifyUrl: 'http://103.153.58.55/subapi/auth/otp/validate?msisdn={{msisdn}}&otp={{otp}}',
            successKey: 'responseCode',
            successValue: '0',
            payoutPercent: 100,
          })
        } else {
          setPartnerConfig(DEFAULT_PARTNER)
        }
      })
      .catch((err) => addToast(err.message || 'Failed to load API config', 'error'))
      .finally(() => setLoading(false))
  }, [isOpen, campaignId, mode, availableTabs, loadCampaignApiConfig, addToast])

  const heConfigPreview = useMemo(
    () => buildHeConfigJson(form.heProvider, heFields, form.resolveMsisdnUrl),
    [form.heProvider, heFields, form.resolveMsisdnUrl]
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      const isOrangeBf = mode === 'ORANGE_BF'
      const baseClean = (orangeBfConfig.baseUrl || 'http://103.153.58.55').replace(/\/$/, '')
      const heConfigJson = buildHeConfigJson(form.heProvider, heFields, form.resolveMsisdnUrl)
      const resolveMsisdnUrl =
        form.heProvider === 'custom_http'
          ? (heFields.resolveUrl || form.resolveMsisdnUrl || '').trim()
          : form.resolveMsisdnUrl || null

      await saveCampaignApiConfig(campaignId, {
        ...form,
        subscriptionApi: isOrangeBf ? `${baseClean}/subapi/checksub` : form.subscriptionApi,
        headersJson: isOrangeBf ? JSON.stringify(orangeBfConfig) : form.headersJson,
        resolveMsisdnUrl: resolveMsisdnUrl || null,
        heConfigJson: heConfigJson || null,
        subscribeApi: (form.subscribeApi || '').trim() || null,
        sendUrl: isOrangeBf ? `${baseClean}/subapi/auth/otp/generate` : partnerConfig.sendUrl,
        verifyUrl: isOrangeBf ? `${baseClean}/subapi/auth/otp/validate` : partnerConfig.verifyUrl,
        successKey: isOrangeBf ? (orangeBfConfig.successKey || 'responseCode') : partnerConfig.successKey,
        successValue: isOrangeBf ? (orangeBfConfig.successValue || '0') : partnerConfig.successValue,
        otpConfigJson: JSON.stringify(
          isOrangeBf
            ? {
                sendUrl: `${baseClean}/subapi/auth/otp/generate`,
                verifyUrl: `${baseClean}/subapi/auth/otp/validate`,
                method: 'GET',
                verifyMethod: 'GET',
                successKey: orangeBfConfig.successKey || 'responseCode',
                successValue: orangeBfConfig.successValue || '0',
                payoutPercent: 100,
              }
            : {
                ...partnerConfig,
                payoutPercent: clampPayoutPercent(partnerConfig.payoutPercent),
              }
        ),
        checksubConfigJson: serializeChecksubConfig(checksubConfig),
        dcbConfigJson: serializeDcbConfig(dcbConfig),
      })
      onClose()
    } catch {
      // toast in slice
    } finally {
      setSaving(false)
    }
  }

  const formatTestResult = (label, res) => {
    const rule = res.successRule || {}
    const ruleText = rule.key ? `Success rule: ${rule.key} = ${rule.value}` : ''
    const codeText = res.responseCode != null ? `${rule.key || 'code'}=${res.responseCode}` : 'no business code'
    return [
      res.ok || res.sent || res.verified ? `🟢 ${label} SUCCESS (${codeText})` : `🔴 ${label} FAILED (${codeText})`,
      ruleText,
      res.message || res.error || '',
      res.providerRequestId ? `transactionId: ${res.providerRequestId}` : '',
      res.httpStatus != null ? `HTTP: ${res.httpStatus}` : '',
      res.rawResponse ? `Response: ${JSON.stringify(res.rawResponse, null, 2)}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  const handleHealthCheck = async () => {
    setTesting(true)
    setTestResult('')
    try {
      const res = await checkOtpProviderHealth({
        provider: 'partner',
        config: JSON.stringify(partnerConfig),
      })
      if (res.ok) {
        const rule = res.successRule || {}
        setTestResult(`🟢 Health check OK\nSuccess when ${rule.key}=${rule.value}\n${res.message || ''}`)
      } else {
        setTestResult(`🔴 Health check failed: ${res.error || 'Unknown error'}`)
      }
    } catch (err) {
      setTestResult(`🔴 Connection error: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const handleTestSend = async () => {
    if (!testPhone) {
      alert('Please enter a phone number for testing')
      return
    }
    setTesting(true)
    setTestResult('')
    try {
      const res = await testSendOtp({
        phone: testPhone,
        provider: 'partner',
        config: JSON.stringify(partnerConfig),
        campaignId,
      })
      if (res.providerRequestId) setLastProviderRequestId(res.providerRequestId)
      setTestResult(formatTestResult('SEND', res))
    } catch (err) {
      setTestResult(`🔴 Dispatch error: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const handleTestVerify = async () => {
    if (!testPhone) {
      alert('Please enter a phone number for testing')
      return
    }
    if (!testOtp) {
      alert('Please enter the OTP received on the phone')
      return
    }
    setTesting(true)
    setTestResult('')
    try {
      const res = await testVerifyOtp({
        phone: testPhone,
        otp: testOtp,
        provider: 'partner',
        config: JSON.stringify(partnerConfig),
        providerRequestId: lastProviderRequestId || undefined,
        campaignId,
      })
      setTestResult(formatTestResult('VERIFY', res))
    } catch (err) {
      setTestResult(`🔴 Verify error: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const setHeField = (key, value) => {
    setHeFields((prev) => ({ ...prev, [key]: value }))
  }

  const renderHeTab = () => (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-bg-subtle/60 px-4 py-3">
        <p className="text-sm font-medium text-fg">How phone detection works</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
          Most campaigns need nothing here — the carrier sends the number in a network header. Use Token + MSISDN only
          when the operator gives you two APIs (token, then number). If the number is missing, users go to the campaign
          CG URL (or an optional fail URL below).
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-fg">Detection mode</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HE_MODES.map((mode) => {
            const active = form.heProvider === mode.id
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setForm({ ...form, heProvider: mode.id })}
                className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                  active
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-border-focus hover:bg-bg-subtle/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      active ? 'border-accent bg-accent text-white' : 'border-border bg-bg-elevated'
                    }`}
                  >
                    {active ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-fg">{mode.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-fg-muted">{mode.subtitle}</span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {form.heProvider === 'header' && (
        <div className="flex gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-xs leading-relaxed text-fg-muted">
            Recommended default. On operator mobile data the gateway injects{' '}
            <code className="rounded bg-bg-subtle px-1 py-0.5 font-mono text-[11px]">X-MSISDN</code>. No extra URLs
            needed.
          </p>
        </div>
      )}

      {form.heProvider === 'none' && (
        <div className="flex gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
          <p className="text-xs leading-relaxed text-fg-muted">
            Auto-detect is off. Users enter their number via OTP (or your page flow). No HE token calls on HOME.
          </p>
        </div>
      )}

      {form.heProvider === 'custom_http' && (
        <div className="space-y-4 rounded-xl border border-border bg-bg-elevated p-4">
          <div>
            <p className="text-sm font-semibold text-fg">Operator resolve API</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              One URL that returns MSISDN. Used when the carrier does not send a header.
            </p>
          </div>
          <Field label="Resolve URL" hint="required">
            <Input
              value={heFields.resolveUrl}
              onChange={(e) => {
                setHeField('resolveUrl', e.target.value)
                setForm({ ...form, resolveMsisdnUrl: e.target.value })
              }}
              placeholder="https://operator.example/resolve-msisdn"
            />
          </Field>
          <Field label="Fail message" hint="optional">
            <Input
              value={heFields.failMessage}
              onChange={(e) => setHeField('failMessage', e.target.value)}
              placeholder="Please use mobile data"
            />
          </Field>
          <div className="rounded-lg border border-border bg-bg-subtle/50 p-3 space-y-3">
            <p className="text-xs font-semibold text-fg">After HE resolve</p>
            <p className="text-[11px] text-fg-muted leading-relaxed">
              Success/fail filled → HOME skip (silent redirect). Both empty → show HOME after detect; MSISDN still used
              on Subscribe / OTP.
            </p>
            <Field label="Success redirect" hint="optional — empty = stay on HOME. {click_id} filled if present.">
              <Input
                value={heFields.successRedirectUrl}
                onChange={(e) => setHeField('successRedirectUrl', e.target.value)}
                placeholder="https://…/next?ext_id={click_id}"
              />
            </Field>
            <Field label="Fail redirect" hint="optional — else campaign CG. {click_id} filled if present.">
              <Input
                value={heFields.failRedirectUrl}
                onChange={(e) => setHeField('failRedirectUrl', e.target.value)}
                placeholder="https://cg.example/fallback?ext_id={click_id}"
              />
            </Field>
          </div>
        </div>
      )}

      {form.heProvider === 'safaricom_masked' && (
        <div className="space-y-4 rounded-xl border border-border bg-bg-elevated p-4">
          <div>
            <p className="text-sm font-semibold text-fg">Token → MSISDN APIs</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Safaricom Kenya: POST token with <code className="font-mono text-[11px]">X-Session-ID</code>, then GET
              masked MSISDN with Bearer + partner headers.
            </p>
          </div>

          <div className="relative space-y-4 pl-4 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:bg-border">
            <div className="relative space-y-1.5">
              <span className="absolute -left-4 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                1
              </span>
              <Field label="Token URL" hint="required — POST + X-Session-ID">
                <Input
                  value={heFields.tokenUrl}
                  onChange={(e) => setHeField('tokenUrl', e.target.value)}
                  placeholder="https://evisaf.wellnesss360.com/safcom/hetoken"
                />
              </Field>
            </div>
            <div className="relative space-y-1.5">
              <span className="absolute -left-4 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                2
              </span>
              <Field label="Masked / MSISDN URL" hint="required — Bearer + X-App">
                <Input
                  value={heFields.maskedUrl}
                  onChange={(e) => setHeField('maskedUrl', e.target.value)}
                  placeholder="https://identity.safaricom.com/partner/api/v2/fetchMaskedMsisdn"
                />
              </Field>
            </div>
          </div>

          <Field label="Fail message" hint="optional">
            <Input
              value={heFields.failMessage}
              onChange={(e) => setHeField('failMessage', e.target.value)}
              placeholder="Please use Safaricom Mobile Data"
            />
          </Field>

          <div className="rounded-lg border border-border bg-bg-subtle/50 p-3 space-y-3">
            <p className="text-xs font-semibold text-fg">After HE resolve</p>
            <p className="text-[11px] text-fg-muted leading-relaxed">
              <strong>Success/fail filled</strong> → HOME never shown; loading then redirect (MSISDN → success, missing
              → fail/CG).
              <br />
              <strong>Both empty</strong> → show HOME after detect (funnel). Number still used later on Subscribe / OTP
              / Priority.
            </p>
            <Field label="Success redirect" hint="optional — {click_id} filled if present, else empty = stay on HOME">
              <Input
                value={heFields.successRedirectUrl}
                onChange={(e) => setHeField('successRedirectUrl', e.target.value)}
                placeholder="https://dsdp-cg.safaricom.com/consent-gateway/300002437?ext_id={click_id}"
              />
            </Field>
            <Field label="Fail redirect" hint="optional — {click_id} filled if present, else campaign CG">
              <Input
                value={heFields.failRedirectUrl}
                onChange={(e) => setHeField('failRedirectUrl', e.target.value)}
                placeholder="https://dsdp-cg.safaricom.com/consent-gateway/300002437?ext_id={click_id}"
              />
            </Field>
          </div>

          {heConfigPreview ? (
            <details className="rounded-lg border border-border bg-bg-subtle/50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-fg-muted">
                Advanced — saved JSON preview
              </summary>
              <pre className="mt-2 max-h-36 overflow-auto rounded-md bg-bg-base p-2 font-mono text-[11px] text-fg-muted">
                {heConfigPreview}
              </pre>
            </details>
          ) : null}
        </div>
      )}
    </div>
  )

  const renderDcbTab = () => {
    const setDcbField = (key, value) => {
      setDcbConfig((current) => ({ ...current, [key]: value }))
    }
    const setResponsePath = (key, value) => {
      setDcbConfig((current) => ({
        ...current,
        responsePaths: { ...current.responsePaths, [key]: value },
      }))
    }
    const setEndpoint = (key, value) => {
      setDcbConfig((current) => ({
        ...current,
        endpoints: { ...current.endpoints, [key]: value },
      }))
    }
    const setRequestField = (key, value) => {
      setDcbConfig((current) => ({
        ...current,
        request: { ...current.request, [key]: value },
      }))
    }
    const pincodePreview = JSON.stringify(previewPincodePayload(dcbConfig), null, 2)
    const confirmPreview = JSON.stringify(previewConfirmPayload(dcbConfig), null, 2)
    const setMapping = (index, key, value) => {
      setDcbConfig((current) => ({
        ...current,
        purchaseTypeMappings: current.purchaseTypeMappings.map((mapping, mappingIndex) =>
          mappingIndex === index ? { ...mapping, [key]: value } : mapping
        ),
      }))
    }

    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-bg-subtle/60 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">Universe Telecom DCB</p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                These settings are used by the backend proxy for entitlement checks, PIN confirmation, and activation
                polling. Provider request IDs are never saved in the browser. Field names / endpoints yahan change
                karo — Download guide usi se regenerate hota hai.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                downloadTextFile(
                  `dcb-api-guide-campaign-${campaignId || 'draft'}.md`,
                  buildDcbApiGuide(dcbConfig),
                  'text/markdown;charset=utf-8',
                )
                useStore.getState().addToast('DCB API guide downloaded', 'success')
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Download API guide
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Base URL">
              <Input
                value={dcbConfig.baseUrl}
                onChange={(event) => setDcbField('baseUrl', event.target.value)}
                placeholder={DEFAULT_DCB_CONFIG.baseUrl}
              />
            </Field>
          </div>
          <Field label="Merchant ID">
            <Input value={dcbConfig.merchantId} onChange={(event) => setDcbField('merchantId', event.target.value)} />
          </Field>
          <Field label="Service ID">
            <Input value={dcbConfig.serviceId} onChange={(event) => setDcbField('serviceId', event.target.value)} />
          </Field>
          <Field label="Operator code">
            <Input
              value={dcbConfig.operatorCode}
              onChange={(event) => setDcbField('operatorCode', event.target.value)}
            />
          </Field>
          <Field label="Poll interval (ms)">
            <Input
              type="number"
              min={250}
              value={dcbConfig.pollIntervalMs}
              onChange={(event) => setDcbField('pollIntervalMs', event.target.value)}
            />
          </Field>
          <Field label="Poll timeout (ms)">
            <Input
              type="number"
              min={1000}
              value={dcbConfig.pollTimeoutMs}
              onChange={(event) => setDcbField('pollTimeoutMs', event.target.value)}
            />
          </Field>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-bg-elevated p-4">
          <div>
            <p className="text-sm font-semibold text-fg">PIN request API</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
              Pack select ke baad ye call hoti hai. Path ya full URL dono chalenge. Neeche wale names Universe body
              ke field names hain — API change ho to yahin rename karo.
            </p>
          </div>
          <Field label="PIN API path" hint="POST">
            <Input
              value={dcbConfig.endpoints.pincode}
              onChange={(event) => setEndpoint('pincode', event.target.value)}
              placeholder="/api/dcb/pincode"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="merchantId field">
              <Input
                value={dcbConfig.request.merchantIdField}
                onChange={(event) => setRequestField('merchantIdField', event.target.value)}
              />
            </Field>
            <Field label="serviceId field">
              <Input
                value={dcbConfig.request.serviceIdField}
                onChange={(event) => setRequestField('serviceIdField', event.target.value)}
              />
            </Field>
            <Field label="purchaseTypeId field">
              <Input
                value={dcbConfig.request.purchaseTypeIdField}
                onChange={(event) => setRequestField('purchaseTypeIdField', event.target.value)}
              />
            </Field>
            <Field label="msisdn field">
              <Input
                value={dcbConfig.request.msisdnField}
                onChange={(event) => setRequestField('msisdnField', event.target.value)}
              />
            </Field>
            <Field label="transactionChannel field">
              <Input
                value={dcbConfig.request.transactionChannelField}
                onChange={(event) => setRequestField('transactionChannelField', event.target.value)}
              />
            </Field>
            <Field label="operator field">
              <Input
                value={dcbConfig.request.operatorField}
                onChange={(event) => setRequestField('operatorField', event.target.value)}
              />
            </Field>
            <Field label="subscription field">
              <Input
                value={dcbConfig.request.subscriptionField}
                onChange={(event) => setRequestField('subscriptionField', event.target.value)}
              />
            </Field>
          </div>
          <details className="rounded-lg border border-border bg-bg-subtle/50 px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-fg-muted">Example PIN body with these fields</summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-bg-base p-2 font-mono text-[11px] text-fg-muted">
              {pincodePreview}
            </pre>
          </details>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-bg-elevated p-4">
          <div>
            <p className="text-sm font-semibold text-fg">PIN confirm / verify API</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
              PIN submit par ye call hoti hai. Path se PIN response ka ID nikalta hai
              (jaise <code className="font-mono">data.PinInfo.ID</code>), field us ID ko
              confirm body mein bhejta hai (jaise <code className="font-mono">id</code>).
              User sirf SMS PIN type karta hai.
            </p>
          </div>
          <Field label="Confirm API path" hint="POST">
            <Input
              value={dcbConfig.endpoints.confirm}
              onChange={(event) => setEndpoint('confirm', event.target.value)}
              placeholder="/api/dcb/confirm"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Confirm body ID field" hint="verify payload key">
              <Input
                value={dcbConfig.request.requestIdField}
                onChange={(event) => setRequestField('requestIdField', event.target.value)}
                placeholder="id"
              />
            </Field>
            <Field label="Confirm body PIN field">
              <Input
                value={dcbConfig.request.pinField}
                onChange={(event) => setRequestField('pinField', event.target.value)}
                placeholder="pinCode"
              />
            </Field>
            <Field label="PIN response ID path" hint="read from pincode JSON">
              <Input
                value={dcbConfig.responsePaths.requestId}
                onChange={(event) => setResponsePath('requestId', event.target.value)}
                placeholder="data.PinInfo.ID"
              />
            </Field>
          </div>
          <details className="rounded-lg border border-border bg-bg-subtle/50 px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-fg-muted">Example confirm body with these fields</summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-bg-base p-2 font-mono text-[11px] text-fg-muted">
              {confirmPreview}
            </pre>
          </details>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-bg-elevated p-4">
          <div>
            <p className="text-sm font-semibold text-fg">Other Universe endpoints</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              Public config packs ke IDs verify karta hai. Subscriptions confirm ke baad 2s polling ke liye.
            </p>
          </div>
          <Field label="Public config path" hint="GET">
            <Input
              value={dcbConfig.endpoints.publicConfig}
              onChange={(event) => setEndpoint('publicConfig', event.target.value)}
              placeholder="/api/dcb/config/public"
            />
          </Field>
          <Field label="Subscriptions path" hint="GET">
            <Input
              value={dcbConfig.endpoints.subscriptions}
              onChange={(event) => setEndpoint('subscriptions', event.target.value)}
              placeholder="/api/dcb/subscriptions"
            />
          </Field>
          <Field label="current query field">
            <Input
              value={dcbConfig.request.currentField}
              onChange={(event) => setRequestField('currentField', event.target.value)}
            />
          </Field>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-bg-elevated p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-fg">Purchase type mappings</p>
              <p className="mt-0.5 text-[11px] text-fg-muted">
                Map each canvas pack key to the Universe purchaseTypeId.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-fg-muted hover:bg-bg-subtle"
              onClick={() =>
                setDcbConfig((current) => ({
                  ...current,
                  purchaseTypeMappings: [
                    ...current.purchaseTypeMappings,
                    { packKey: '', label: '', purchaseTypeId: '' },
                  ],
                }))
              }
            >
              + Add mapping
            </button>
          </div>
          {dcbConfig.purchaseTypeMappings.map((mapping, index) => (
            <div
              key={`${mapping.packKey}-${index}`}
              className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-bg-subtle/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <Input
                aria-label={`Pack key ${index + 1}`}
                value={mapping.packKey}
                onChange={(event) => setMapping(index, 'packKey', event.target.value)}
                placeholder="daily"
              />
              <Input
                aria-label={`Plan label ${index + 1}`}
                value={mapping.label}
                onChange={(event) => setMapping(index, 'label', event.target.value)}
                placeholder="Daily"
              />
              <Input
                aria-label={`Purchase type ID ${index + 1}`}
                value={mapping.purchaseTypeId}
                onChange={(event) => setMapping(index, 'purchaseTypeId', event.target.value)}
                placeholder="purchaseTypeId"
              />
              <button
                type="button"
                className="rounded-lg border border-red-200 px-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                onClick={() =>
                  setDcbConfig((current) => ({
                    ...current,
                    purchaseTypeMappings: current.purchaseTypeMappings.filter(
                      (_, mappingIndex) => mappingIndex !== index
                    ),
                  }))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <details className="rounded-xl border border-border bg-bg-elevated p-4">
          <summary className="cursor-pointer text-sm font-semibold text-fg">Response paths</summary>
          <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
            Dot/bracket paths used by the backend response normalizer. Invalid paths never grant entitlement.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(dcbConfig.responsePaths).map(([key, value]) => (
              <Field key={key} label={key}>
                <Input value={value} onChange={(event) => setResponsePath(key, event.target.value)} />
              </Field>
            ))}
          </div>
        </details>
      </div>
    )
  }

  const renderOrangeBfTab = () => {
    const handleOrangeBfTestSend = async () => {
      if (!testPhone) {
        alert('Please enter a phone number (+226...) for testing')
        return
      }
      setTesting(true)
      setTestResult('')
      try {
        const baseClean = (orangeBfConfig.baseUrl || 'http://103.153.58.55').replace(/\/$/, '')
        const res = await testSendOtp({
          phone: testPhone,
          provider: 'partner',
          config: JSON.stringify({
            sendUrl: `${baseClean}/subapi/auth/otp/generate?msisdn={{msisdn}}&language=${orangeBfConfig.language || '_E'}`,
            method: 'GET',
            successKey: orangeBfConfig.successKey || 'responseCode',
            successValue: orangeBfConfig.successValue || '0',
          }),
          campaignId,
        })
        if (res.providerRequestId) setLastProviderRequestId(res.providerRequestId)
        setTestResult(formatTestResult('SEND OTP', res))
      } catch (err) {
        setTestResult(`🔴 Dispatch error: ${err.message}`)
      } finally {
        setTesting(false)
      }
    }

    const handleOrangeBfTestVerify = async () => {
      if (!testPhone || !testOtp) {
        alert('Please enter phone and OTP code')
        return
      }
      setTesting(true)
      setTestResult('')
      try {
        const baseClean = (orangeBfConfig.baseUrl || 'http://103.153.58.55').replace(/\/$/, '')
        const res = await testVerifyOtp({
          phone: testPhone,
          otp: testOtp,
          provider: 'partner',
          config: JSON.stringify({
            verifyUrl: `${baseClean}/subapi/auth/otp/validate?msisdn={{msisdn}}&otp={{otp}}`,
            verifyMethod: 'GET',
            successKey: orangeBfConfig.successKey || 'responseCode',
            successValue: orangeBfConfig.successValue || '0',
          }),
          providerRequestId: lastProviderRequestId || undefined,
          campaignId,
        })
        setTestResult(formatTestResult('VERIFY OTP', res))
      } catch (err) {
        setTestResult(`🔴 Verify error: ${err.message}`)
      } finally {
        setTesting(false)
      }
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#ff7900] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">Orange BF</span>
            <p className="text-xs font-semibold text-fg">Orange Burkina Faso — Subscription REST API v1.0.0</p>
          </div>
          <p className="mt-1 text-xs text-fg-muted">
            Configured endpoints: Generate OTP (<code className="font-mono text-[11px]">/subapi/auth/otp/generate</code>), Validate OTP (<code className="font-mono text-[11px]">/subapi/auth/otp/validate</code>), CheckSub (<code className="font-mono text-[11px]">/subapi/checksub</code>), Unsub (<code className="font-mono text-[11px]">/subapi/unsub</code>), and Engine Sync.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="API Base URL" hint="Carrier API Host">
              <Input
                value={orangeBfConfig.baseUrl}
                onChange={(e) => setOrangeBfConfig((s) => ({ ...s, baseUrl: e.target.value }))}
                placeholder="http://103.153.58.55"
              />
            </Field>
          </div>

          <Field label="Parent Service ID (serviceId)" hint="e.g. Health Portal Livliness">
            <Input
              value={orangeBfConfig.serviceId}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, serviceId: e.target.value }))}
              placeholder="Health Portal Livliness"
            />
          </Field>

          <Field label="Sub-Service Plan ID (subServiceId)" hint="e.g. Health Portal Livliness pass jour">
            <Input
              value={orangeBfConfig.subServiceId}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, subServiceId: e.target.value }))}
              placeholder="Health Portal Livliness pass jour"
            />
          </Field>

          <Field label="Content Provider ID (cpId)" hint="Default: 100">
            <Input
              value={orangeBfConfig.cpId}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, cpId: e.target.value }))}
              placeholder="100"
            />
          </Field>

          <Field label="Channel" hint="Default: ussd">
            <Input
              value={orangeBfConfig.channel}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, channel: e.target.value }))}
              placeholder="ussd"
            />
          </Field>

          <Field label="Country Code" hint="Default: BF">
            <Input
              value={orangeBfConfig.country}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, country: e.target.value }))}
              placeholder="BF"
            />
          </Field>

          <Field label="Operator Code" hint="Default: ORG">
            <Input
              value={orangeBfConfig.operator}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, operator: e.target.value }))}
              placeholder="ORG"
            />
          </Field>

          <Field label="SMS Language" hint="_E (English) or _A (Arabic)">
            <select
              className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-fg outline-none focus:border-primary"
              value={orangeBfConfig.language}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, language: e.target.value }))}
            >
              <option value="_E">English (_E)</option>
              <option value="_A">Arabic (_A)</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Success Key" hint="default: responseCode">
              <Input
                value={orangeBfConfig.successKey}
                onChange={(e) => setOrangeBfConfig((s) => ({ ...s, successKey: e.target.value }))}
                placeholder="responseCode"
              />
            </Field>
            <Field label="Success Value" hint="default: 0">
              <Input
                value={orangeBfConfig.successValue}
                onChange={(e) => setOrangeBfConfig((s) => ({ ...s, successValue: e.target.value }))}
                placeholder="0"
              />
            </Field>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-dashed border-border bg-bg-subtle/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Orange BF Live OTP Test</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Test Phone (+226...)">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="e.g. 56864685"
              />
            </Field>
            <Field label="OTP from SMS">
              <Input value={testOtp} onChange={(e) => setTestOtp(e.target.value)} placeholder="e.g. 4827" />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={handleOrangeBfTestSend} disabled={testing}>
              {testing ? 'Sending...' : 'Send Orange BF OTP'}
            </Button>
            <Button variant="primary" size="sm" onClick={handleOrangeBfTestVerify} disabled={testing}>
              Verify Orange BF OTP
            </Button>
          </div>
          {testResult && (
            <div className="mt-2 max-h-[180px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-bg-base p-2 font-mono text-xs">
              {testResult}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Campaign Integration & Settings" size="lg">
      {loading ? (
        <p className="py-4 text-sm text-fg-muted">Loading configurations...</p>
      ) : (
        <div className="space-y-4">
          <Tabs
            tabs={availableTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === 'orange_bf' ? (
            renderOrangeBfTab()
          ) : activeTab === 'billing' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-bg-subtle/60 px-4 py-3">
                <p className="text-xs leading-relaxed text-fg-muted">
                  Checksub / blocklist / optional Confirm subscribe live here. OTP send/verify is on the Partner OTP
                  tab. Placeholders: <code className="font-mono text-[11px]">{'{{msisdn}}'}</code>,{' '}
                  <code className="font-mono text-[11px]">{'{{serviceId}}'}</code>,{' '}
                  <code className="font-mono text-[11px]">{'{{country}}'}</code>,{' '}
                  <code className="font-mono text-[11px]">{'{{operator}}'}</code>.
                </p>
              </div>
              <Field label="Subscription check URL (checksub)">
                <Input
                  value={form.subscriptionApi}
                  onChange={(e) => setForm({ ...form, subscriptionApi: e.target.value })}
                  placeholder="https://…/checksub?msisdn={{msisdn}}&serviceId=WELLNESS"
                />
              </Field>

              <div className="rounded-xl border border-border bg-bg-elevated p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-fg">Checksub status mapping</p>
                    <p className="text-[11px] text-fg-muted mt-0.5 leading-relaxed">
                      When a number is found, map the partner response to continue the funnel, a campaign page, or an
                      external website. Works with plain-text body (e.g. <code className="font-mono">INACTIVE</code>) or
                      JSON fields. Leave empty to keep the built-in active/parking/pending mapping.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-border text-fg-muted hover:bg-bg-subtle"
                      onClick={() =>
                        setChecksubConfig({
                          statusField: 'currentStatus',
                          rules: [
                            { value: 'active', go: 'page', page: 'THANKYOU', url: '' },
                            { value: 'parking', go: 'page', page: 'LOW_BALANCE', url: '' },
                            { value: 'grace', go: 'page', page: 'LOW_BALANCE', url: '' },
                            { value: 'pending', go: 'page', page: 'INPROGRESS', url: '' },
                            { value: 'new', go: 'continue', page: 'THANKYOU', url: '' },
                          ],
                          missGo: 'continue',
                          missPage: 'ERROR',
                          missUrl: '',
                        })
                      }
                    >
                      JSON preset
                    </button>
                    <button
                      type="button"
                      className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-border text-fg-muted hover:bg-bg-subtle"
                      onClick={() =>
                        setChecksubConfig({
                          statusField: 'body',
                          rules: [
                            { value: 'ACTIVE', go: 'page', page: 'THANKYOU', url: '' },
                            { value: 'INACTIVE', go: 'continue', page: 'THANKYOU', url: '' },
                          ],
                          missGo: 'continue',
                          missPage: 'ERROR',
                          missUrl: '',
                        })
                      }
                    >
                      Plain-text preset
                    </button>
                  </div>
                </div>

                <Field label="Status field" hint="body = whole response text; otherwise JSON key">
                  <Input
                    value={checksubConfig.statusField}
                    onChange={(e) =>
                      setChecksubConfig({
                        ...checksubConfig,
                        statusField: e.target.value,
                      })
                    }
                    placeholder="body | currentStatus | status"
                    list="checksub-status-fields"
                  />
                  <datalist id="checksub-status-fields">
                    <option value="body" />
                    <option value="currentStatus" />
                    <option value="subscriptionStatus" />
                    <option value="status" />
                  </datalist>
                </Field>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-fg">Rules (first match wins)</p>
                    <button
                      type="button"
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50"
                      onClick={() =>
                        setChecksubConfig({
                          ...checksubConfig,
                          rules: [
                            ...checksubConfig.rules,
                            {
                              value: '',
                              go: 'continue',
                              page: 'THANKYOU',
                              url: '',
                            },
                          ],
                        })
                      }
                    >
                      + Add status
                    </button>
                  </div>

                  {checksubConfig.rules.length === 0 ? (
                    <p className="text-[11px] text-fg-muted rounded-lg border border-dashed border-border px-3 py-2">
                      No rules yet — built-in mapping is used (active → thank you, parking → low balance, …).
                    </p>
                  ) : null}

                  {checksubConfig.rules.map((rule, idx) => (
                    <div key={idx} className="rounded-lg border border-border bg-bg-subtle/40 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-indigo-600">Rule {idx + 1}</span>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() =>
                            setChecksubConfig({
                              ...checksubConfig,
                              rules: checksubConfig.rules.filter((_, i) => i !== idx),
                            })
                          }
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Field label="Equals">
                          <Input
                            value={rule.value}
                            onChange={(e) => {
                              const rules = [...checksubConfig.rules]
                              rules[idx] = { ...rules[idx], value: e.target.value }
                              setChecksubConfig({ ...checksubConfig, rules })
                            }}
                            placeholder="ACTIVE / inactive / parking"
                          />
                        </Field>
                        <Field label="Then">
                          <select
                            className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg"
                            value={rule.go || 'continue'}
                            onChange={(e) => {
                              const rules = [...checksubConfig.rules]
                              rules[idx] = { ...rules[idx], go: e.target.value }
                              setChecksubConfig({ ...checksubConfig, rules })
                            }}
                          >
                            <option value="continue">Continue funnel</option>
                            <option value="page">Campaign page</option>
                            <option value="external">External website</option>
                          </select>
                        </Field>
                      </div>
                      {rule.go === 'page' ? (
                        <Field label="Page">
                          <select
                            className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg"
                            value={rule.page || 'THANKYOU'}
                            onChange={(e) => {
                              const rules = [...checksubConfig.rules]
                              rules[idx] = { ...rules[idx], page: e.target.value }
                              setChecksubConfig({ ...checksubConfig, rules })
                            }}
                          >
                            {CHECKSUB_PAGE_OPTIONS.map((id) => (
                              <option key={id} value={id}>
                                {PAGE_TYPE_LABELS[id] || id}
                              </option>
                            ))}
                          </select>
                        </Field>
                      ) : null}
                      {rule.go === 'external' ? (
                        <Field label="Website URL">
                          <Input
                            value={rule.url || ''}
                            onChange={(e) => {
                              const rules = [...checksubConfig.rules]
                              rules[idx] = { ...rules[idx], url: e.target.value }
                              setChecksubConfig({ ...checksubConfig, rules })
                            }}
                            placeholder="https://example.com"
                          />
                        </Field>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-border bg-bg-subtle/40 p-3 space-y-2">
                  <Field label="If nothing matches">
                    <select
                      className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg"
                      value={checksubConfig.missGo || 'continue'}
                      onChange={(e) =>
                        setChecksubConfig({
                          ...checksubConfig,
                          missGo: e.target.value,
                        })
                      }
                    >
                      <option value="continue">Continue funnel</option>
                      <option value="page">Campaign page</option>
                      <option value="external">External website</option>
                    </select>
                  </Field>
                  {checksubConfig.missGo === 'page' ? (
                    <Field label="Page">
                      <select
                        className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg"
                        value={checksubConfig.missPage || 'ERROR'}
                        onChange={(e) =>
                          setChecksubConfig({
                            ...checksubConfig,
                            missPage: e.target.value,
                          })
                        }
                      >
                        {CHECKSUB_PAGE_OPTIONS.map((id) => (
                          <option key={id} value={id}>
                            {PAGE_TYPE_LABELS[id] || id}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}
                  {checksubConfig.missGo === 'external' ? (
                    <Field label="Website URL">
                      <Input
                        value={checksubConfig.missUrl || ''}
                        onChange={(e) =>
                          setChecksubConfig({
                            ...checksubConfig,
                            missUrl: e.target.value,
                          })
                        }
                        placeholder="https://example.com"
                      />
                    </Field>
                  ) : null}
                </div>
              </div>

              <Field
                label="Subscribe URL (Confirm / pack click)"
                hint="Template for every pack button. Use {{msisdn}}, {{pack}}, {{planId}}, {{serviceId}}, {{subServiceId}}. Buttons only override pack / service / sub-service — not the full URL."
              >
                <Input
                  value={form.subscribeApi}
                  onChange={(e) => setForm({ ...form, subscribeApi: e.target.value })}
                  placeholder="https://…/subscribe?msisdn={{msisdn}}"
                />
              </Field>
              <Field label="Blocklist / DND URL" hint="optional">
                <Input
                  value={form.blocklistApi}
                  onChange={(e) => setForm({ ...form, blocklistApi: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Headers (JSON)" hint="optional">
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 font-mono text-sm text-fg"
                  value={form.headersJson}
                  onChange={(e) => setForm({ ...form, headersJson: e.target.value })}
                  placeholder='{"Authorization":"Bearer ..."}'
                />
              </Field>
            </div>
          ) : activeTab === 'he' ? (
            renderHeTab()
          ) : activeTab === 'dcb' ? (
            renderDcbTab()
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-bg-subtle/60 px-4 py-3">
                <p className="text-xs leading-relaxed text-fg-muted">
                  Partner generates and verifies OTP. Success when the response key matches the value below (default{' '}
                  <code className="font-mono text-[11px]">responseCode = 0</code>
                  ).
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-bg-elevated p-4">
                <Field label="Send URL">
                  <Input
                    value={partnerConfig.sendUrl}
                    onChange={(e) => setPartnerConfig({ ...partnerConfig, sendUrl: e.target.value })}
                    placeholder="https://…/otp/subscribe?msisdn={{msisdn}}"
                  />
                </Field>
                <Field label="Verify URL">
                  <Input
                    value={partnerConfig.verifyUrl}
                    onChange={(e) => setPartnerConfig({ ...partnerConfig, verifyUrl: e.target.value })}
                    placeholder="https://…/otp/validate_otp?msisdn={{msisdn}}&otp={{otp}}"
                  />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Send method">
                    <Input
                      value={partnerConfig.method}
                      onChange={(e) => setPartnerConfig({ ...partnerConfig, method: e.target.value })}
                    />
                  </Field>
                  <Field label="Verify method">
                    <Input
                      value={partnerConfig.verifyMethod}
                      onChange={(e) =>
                        setPartnerConfig({
                          ...partnerConfig,
                          verifyMethod: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="rounded-lg border border-border bg-bg-subtle/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-fg">Success rule</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Key">
                      <Input
                        value={partnerConfig.successKey || 'responseCode'}
                        onChange={(e) =>
                          setPartnerConfig({
                            ...partnerConfig,
                            successKey: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Value">
                      <Input
                        value={partnerConfig.successValue ?? '0'}
                        onChange={(e) =>
                          setPartnerConfig({
                            ...partnerConfig,
                            successValue: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-bg-subtle/50 p-3 space-y-2">
                  <Field label="Default payout %" hint="Fallback if vendor assignment has none · 100 = show all">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={partnerConfig.payoutPercent ?? 100}
                      onChange={(e) =>
                        setPartnerConfig({
                          ...partnerConfig,
                          payoutPercent: e.target.value,
                        })
                      }
                      onBlur={() =>
                        setPartnerConfig({
                          ...partnerConfig,
                          payoutPercent: clampPayoutPercent(partnerConfig.payoutPercent),
                        })
                      }
                    />
                  </Field>
                  <p className="text-[11px] leading-relaxed text-fg-muted">
                    Prefer payout % on each vendor assignment. This campaign default is used only
                    when the assignment has no percent. After partner verify succeeds, that percent
                    is returned as success to the vendor; the rest get invalid OTP (HELD in logs).
                  </p>
                </div>
                <Field label="Headers (JSON)" hint="optional">
                  <textarea
                    className="min-h-[60px] w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 font-mono text-xs text-fg"
                    value={partnerConfig.headersJson}
                    onChange={(e) =>
                      setPartnerConfig({
                        ...partnerConfig,
                        headersJson: e.target.value,
                      })
                    }
                    placeholder="{}"
                  />
                </Field>
              </div>

              <div className="space-y-3 rounded-xl border border-dashed border-border bg-bg-subtle/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">OTP API testing</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="Test phone">
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="e.g. 211911961169"
                    />
                  </Field>
                  <Field label="OTP from SMS">
                    <Input value={testOtp} onChange={(e) => setTestOtp(e.target.value)} placeholder="e.g. 4827" />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleHealthCheck} disabled={testing}>
                    Health Check
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleTestSend} disabled={testing}>
                    {testing ? 'Processing...' : 'Send Test OTP'}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleTestVerify} disabled={testing}>
                    Verify Test OTP
                  </Button>
                </div>
                {testResult && (
                  <div className="mt-2 max-h-[180px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-bg-base p-2 font-mono text-xs">
                    {testResult}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || testing}>
              {saving ? 'Saving...' : 'Save API Settings'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default memo(CampaignApiConfigModal)
