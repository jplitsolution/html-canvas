import { memo, useEffect, useState } from 'react'
import Modal from '../common/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import useStore from '../../store/useStore'
import {
  testSendOtp,
  testVerifyOtp,
  checkOtpProviderHealth,
} from '../../services/api/campaigns'

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
}

function CampaignApiConfigModal({ isOpen, onClose, campaignId }) {
  const loadCampaignApiConfig = useStore((s) => s.loadCampaignApiConfig)
  const saveCampaignApiConfig = useStore((s) => s.saveCampaignApiConfig)
  const addToast = useStore((s) => s.addToast)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('billing')

  const [form, setForm] = useState({
    subscriptionApi: '',
    blocklistApi: '',
    subscribeApi: '',
    headersJson: '',
    resolveMsisdnUrl: '',
    heProvider: 'header',
    heConfigJson: '',
  })

  const [partnerConfig, setPartnerConfig] = useState(DEFAULT_PARTNER)

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

    loadCampaignApiConfig(campaignId)
      .then((config) => {
        setForm({
          subscriptionApi: config.subscriptionApi || '',
          blocklistApi: config.blocklistApi || '',
          subscribeApi: config.subscribeApi || '',
          headersJson: config.headersJson || '',
          resolveMsisdnUrl: config.resolveMsisdnUrl || '',
          heProvider: config.heProvider || 'header',
          heConfigJson: config.heConfigJson || '',
        })
        if (config.otpConfigJson) {
          try {
            const parsed = JSON.parse(config.otpConfigJson)
            // Ignore legacy failover / twilio blobs — only keep partner URL fields
            const source =
              parsed?.failover && parsed?.providers?.partner?.config
                ? parsed.providers.partner.config
                : parsed
            setPartnerConfig({
              ...DEFAULT_PARTNER,
              ...source,
              successKey: source.successKey || 'responseCode',
              successValue: source.successValue ?? '0',
            })
          } catch (e) {
            console.error('Failed to parse OTP config JSON', e)
            setPartnerConfig(DEFAULT_PARTNER)
          }
        } else {
          setPartnerConfig(DEFAULT_PARTNER)
        }
      })
      .catch((err) => addToast(err.message || 'Failed to load API config', 'error'))
      .finally(() => setLoading(false))
  }, [isOpen, campaignId, loadCampaignApiConfig, addToast])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveCampaignApiConfig(campaignId, {
        ...form,
        otpConfigJson: JSON.stringify(partnerConfig),
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
    const codeText =
      res.responseCode != null
        ? `${rule.key || 'code'}=${res.responseCode}`
        : 'no business code'
    return [
      res.ok || res.sent || res.verified
        ? `🟢 ${label} SUCCESS (${codeText})`
        : `🔴 ${label} FAILED (${codeText})`,
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
        setTestResult(
          `🟢 Health check OK\nSuccess when ${rule.key}=${rule.value}\n${res.message || ''}`,
        )
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Campaign Integration & Settings" size="lg">
      {loading ? (
        <p className="text-fg-muted text-sm py-4">Loading configurations...</p>
      ) : (
        <div className="space-y-4">
          <div className="flex border-b border-border mb-4">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'billing'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-fg-muted hover:text-fg'
              }`}
              onClick={() => setActiveTab('billing')}
            >
              Billing &amp; Blocklist APIs
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'he'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-fg-muted hover:text-fg'
              }`}
              onClick={() => setActiveTab('he')}
            >
              Detect phone (HE)
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'otp'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-fg-muted hover:text-fg'
              }`}
              onClick={() => setActiveTab('otp')}
            >
              Partner OTP APIs
            </button>
          </div>

          {activeTab === 'billing' ? (
            <div className="space-y-4">
              <p className="text-xs text-fg-subtle bg-bg-subtle border border-border rounded-lg px-3 py-2">
                Placeholders: <code>{'{{msisdn}}'}</code>, <code>{'{{serviceId}}'}</code>,{' '}
                <code>{'{{country}}'}</code>, <code>{'{{operator}}'}</code>,{' '}
                <code>{'{{subServiceId}}'}</code>. URLs with <code>?</code> use GET; otherwise POST.
              </p>
              <div>
                <label className="block text-sm font-medium text-fg mb-1.5">Subscription check URL</label>
                <Input
                  value={form.subscriptionApi}
                  onChange={(e) => setForm({ ...form, subscriptionApi: e.target.value })}
                  placeholder="https://wbilzss.tickhighs.com/sub/checksub?msisdn={{msisdn}}&serviceId=WELLNESS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1.5">Blocklist / DND URL</label>
                <Input
                  value={form.blocklistApi}
                  onChange={(e) => setForm({ ...form, blocklistApi: e.target.value })}
                  placeholder="(optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1.5">Subscribe URL</label>
                <Input
                  value={form.subscribeApi}
                  onChange={(e) => setForm({ ...form, subscribeApi: e.target.value })}
                  placeholder="(optional — Tick OTP validate already queues subscribe)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1.5">Headers (JSON)</label>
                <textarea
                  className="w-full min-h-[80px] rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-fg font-mono"
                  value={form.headersJson}
                  onChange={(e) => setForm({ ...form, headersJson: e.target.value })}
                  placeholder='{"Authorization":"Bearer ..."}'
                />
              </div>
            </div>
          ) : activeTab === 'he' ? (
            <div className="space-y-4">
              <p className="text-xs text-fg-subtle bg-bg-subtle border border-border rounded-lg px-3 py-2">
                <strong>Leave this empty for most operators.</strong> By default, the phone number
                is read from the carrier network header (<code>X-MSISDN</code>). A resolve URL is
                only needed when the operator does not send that header and provides a separate API
                (for example, Safaricom masked). In all other cases, the OTP path is used.
              </p>
              <div>
                <label className="block text-sm font-medium text-fg mb-1.5">
                  Phone detect mode
                </label>
                <select
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
                  value={form.heProvider}
                  onChange={(e) => setForm({ ...form, heProvider: e.target.value })}
                >
                  <option value="header">header — MSISDN from network (recommended default)</option>
                  <option value="none">none — disable auto-detect (OTP only)</option>
                  <option value="custom_http">custom_http — operator-provided resolve URL</option>
                  <option value="safaricom_masked">safaricom_masked — Safaricom token + masked API</option>
                </select>
              </div>
              {(form.heProvider === 'custom_http' || form.heProvider === 'safaricom_masked') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-fg mb-1.5">
                      Resolve URL (custom_http only)
                    </label>
                    <Input
                      value={form.resolveMsisdnUrl}
                      onChange={(e) => setForm({ ...form, resolveMsisdnUrl: e.target.value })}
                      placeholder="Only if provided by the operator"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg mb-1.5">
                      Extra HE config JSON (special operators only)
                    </label>
                    <textarea
                      className="w-full min-h-[100px] rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-fg font-mono"
                      value={form.heConfigJson}
                      onChange={(e) => setForm({ ...form, heConfigJson: e.target.value })}
                      placeholder='{"tokenUrl":"...","maskedUrl":"..."}'
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-fg-subtle bg-bg-subtle border border-border rounded-lg px-3 py-2">
                External partner OTP APIs only. There is no Twilio / MSG91 / local OTP store — the
                partner generates and verifies the OTP. Success is determined by a configured
                key/value in the response body (default <code>responseCode = 0</code>).
              </p>

              <div className="p-3 border border-border rounded-lg bg-bg-subtle/50 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-fg mb-1">Send URL</label>
                  <Input
                    value={partnerConfig.sendUrl}
                    onChange={(e) => setPartnerConfig({ ...partnerConfig, sendUrl: e.target.value })}
                    placeholder="https://wbilzss.tickhighs.com/otp/subscribe?msisdn={{msisdn}}&subServiceId={{subServiceId}}&serviceId=WELLNESS&cpId=100&channel=wap&country=SS&operator=ZAIN&reqType=1&language=_E"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg mb-1">Verify URL</label>
                  <Input
                    value={partnerConfig.verifyUrl}
                    onChange={(e) => setPartnerConfig({ ...partnerConfig, verifyUrl: e.target.value })}
                    placeholder="https://wbilzss.tickhighs.com/otp/validate_otp?msisdn={{msisdn}}&otp={{otp}}"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">Send method</label>
                    <Input
                      value={partnerConfig.method}
                      onChange={(e) => setPartnerConfig({ ...partnerConfig, method: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">Verify method</label>
                    <Input
                      value={partnerConfig.verifyMethod}
                      onChange={(e) =>
                        setPartnerConfig({ ...partnerConfig, verifyMethod: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-bg-base p-3 space-y-2">
                  <p className="text-xs font-semibold text-fg">Success rule</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Key</label>
                      <Input
                        value={partnerConfig.successKey || 'responseCode'}
                        onChange={(e) =>
                          setPartnerConfig({ ...partnerConfig, successKey: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Value</label>
                      <Input
                        value={partnerConfig.successValue ?? '0'}
                        onChange={(e) =>
                          setPartnerConfig({ ...partnerConfig, successValue: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg mb-1">Headers (JSON)</label>
                  <textarea
                    className="w-full min-h-[60px] rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-xs text-fg font-mono"
                    value={partnerConfig.headersJson}
                    onChange={(e) =>
                      setPartnerConfig({ ...partnerConfig, headersJson: e.target.value })
                    }
                    placeholder="{}"
                  />
                </div>
              </div>

              <div className="p-3 border border-dashed border-border rounded-lg bg-bg-subtle space-y-3">
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  OTP API Testing Hub
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">Test phone</label>
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="e.g. 211911961169"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">OTP from SMS</label>
                    <Input
                      value={testOtp}
                      onChange={(e) => setTestOtp(e.target.value)}
                      placeholder="e.g. 4827"
                    />
                  </div>
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
                  <div className="mt-2 text-xs font-mono p-2 bg-bg-base border border-border rounded-lg max-h-[180px] overflow-y-auto whitespace-pre-wrap">
                    {testResult}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
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
