import { memo, useEffect, useState } from 'react'
import Modal from '../common/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import useStore from '../../store/useStore'
import {
  testSendOtp,
  checkOtpProviderHealth,
} from '../../services/api/campaigns'

function CampaignApiConfigModal({ isOpen, onClose, campaignId }) {
  const loadCampaignApiConfig = useStore((s) => s.loadCampaignApiConfig)
  const saveCampaignApiConfig = useStore((s) => s.saveCampaignApiConfig)
  const addToast = useStore((s) => s.addToast)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('billing') // 'billing', 'otp'
  
  const [form, setForm] = useState({
    subscriptionApi: '',
    blocklistApi: '',
    subscribeApi: '',
    headersJson: '',
  })

  // OTP Provider specific states
  const [otpProvider, setOtpProvider] = useState('local')
  const [twilioConfig, setTwilioConfig] = useState({ accountSid: '', authToken: '', from: '', messageTemplate: '' })
  const [msg91Config, setMsg91Config] = useState({ authKey: '', templateId: '', sender: '' })
  const [kaleyraConfig, setKaleyraConfig] = useState({ apiKey: '', sender: '', messageTemplate: '', region: 'global' })
  const [partnerConfig, setPartnerConfig] = useState({ sendUrl: '', verifyUrl: '', method: 'POST', verifyMethod: 'POST', headersJson: '', bodyJson: '', verifyBodyJson: '' })
  const [customConfig, setCustomConfig] = useState({ url: '', method: 'POST', headersJson: '', bodyJson: '' })

  // Testing tool states
  const [testPhone, setTestPhone] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    if (!isOpen || !campaignId) return
    setLoading(true)
    setTestResult('')
    setTestPhone('')
    
    loadCampaignApiConfig(campaignId)
      .then((config) => {
        setForm({
          subscriptionApi: config.subscriptionApi || '',
          blocklistApi: config.blocklistApi || '',
          subscribeApi: config.subscribeApi || '',
          headersJson: config.headersJson || '',
        })
        const provider = config.otpProvider || 'local'
        setOtpProvider(provider)
        if (config.otpConfigJson) {
          try {
            const parsed = JSON.parse(config.otpConfigJson)
            if (provider === 'twilio') setTwilioConfig((c) => ({ ...c, ...parsed }))
            else if (provider === 'msg91') setMsg91Config((c) => ({ ...c, ...parsed }))
            else if (provider === 'kaleyra') setKaleyraConfig((c) => ({ ...c, ...parsed }))
            else if (provider === 'partner') setPartnerConfig((c) => ({ ...c, ...parsed }))
            else if (provider === 'custom' || provider === 'custom_http') setCustomConfig((c) => ({ ...c, ...parsed }))
          } catch (e) {
            console.error('Failed to parse OTP config JSON', e)
          }
        }
      })
      .catch((err) => addToast(err.message || 'Failed to load API config', 'error'))
      .finally(() => setLoading(false))
  }, [isOpen, campaignId, loadCampaignApiConfig, addToast])

  const getActiveConfig = () => {
    if (otpProvider === 'twilio') return twilioConfig
    if (otpProvider === 'msg91') return msg91Config
    if (otpProvider === 'kaleyra') return kaleyraConfig
    if (otpProvider === 'partner') return partnerConfig
    if (otpProvider === 'custom' || otpProvider === 'custom_http') return customConfig
    return {}
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const activeConfig = getActiveConfig()
      const payload = {
        ...form,
        otpProvider,
        otpConfigJson: JSON.stringify(activeConfig),
      }
      await saveCampaignApiConfig(campaignId, payload)
      onClose()
    } catch {
      // toast in slice
    } finally {
      setSaving(false)
    }
  }

  const handleHealthCheck = async () => {
    setTesting(true)
    setTestResult('')
    try {
      const activeConfig = getActiveConfig()
      const res = await checkOtpProviderHealth({
        provider: otpProvider,
        config: JSON.stringify(activeConfig),
      })
      if (res.ok) {
        setTestResult('🟢 Health check succeeded! Configurations and connectivity verified.')
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
      const activeConfig = getActiveConfig()
      const res = await testSendOtp({
        phone: testPhone,
        provider: otpProvider,
        config: JSON.stringify(activeConfig),
        campaignId,
      })
      if (res.sent) {
        setTestResult(`🟢 Test SMS sent successfully!${res.otp ? ` (Mock Code: ${res.otp})` : ' (Provider API triggered)'}`)
      } else {
        setTestResult(`🔴 Send failed: ${res.error || 'Unknown error'}`)
      }
    } catch (err) {
      setTestResult(`🔴 Dispatch error: ${err.message}`)
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
          {/* Tab Navigation */}
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
                activeTab === 'otp'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-fg-muted hover:text-fg'
              }`}
              onClick={() => setActiveTab('otp')}
            >
              OTP &amp; SMS Settings
            </button>
          </div>

          {activeTab === 'billing' ? (
            <div className="space-y-4">
              <p className="text-xs text-fg-subtle bg-bg-subtle border border-border rounded-lg px-3 py-2">
                Placeholders supported: <code>{'{{msisdn}}'}</code>, <code>{'{{serviceId}}'}</code>, <code>{'{{country}}'}</code>, <code>{'{{operator}}'}</code>, <code>{'{{subServiceId}}'}</code> (pack). URL me <code>?query</code> ho to <strong>GET</strong>, warna JSON body ke saath <strong>POST</strong> jaata hai.
              </p>
              <div>
                <label className="block text-sm font-medium text-fg mb-1.5">Subscription check URL</label>
                <Input
                  value={form.subscriptionApi}
                  onChange={(e) => setForm({ ...form, subscriptionApi: e.target.value })}
                  placeholder="https://wbilzss.tickhighs.com/sub/checksub?msisdn={{msisdn}}&serviceId=WELLNESS"
                />
                <p className="mt-1 text-xs text-fg-subtle">GET. Success = <code>responseCode:"0"</code> aur <code>data.subscriptionStatus:"active"</code> ho to already subscribed.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1.5">Blocklist / DND URL</label>
                <Input
                  value={form.blocklistApi}
                  onChange={(e) => setForm({ ...form, blocklistApi: e.target.value })}
                  placeholder="(optional) https://your-partner.com/dnd/check?msisdn={{msisdn}}"
                />
                <p className="mt-1 text-xs text-fg-subtle">Optional. Response me <code>blocked</code> / <code>dnd</code> = true ho to user block ho jaata hai.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1.5">Subscribe URL</label>
                <Input
                  value={form.subscribeApi}
                  onChange={(e) => setForm({ ...form, subscribeApi: e.target.value })}
                  placeholder="(SubOTP me khaali chhodo — subscription OTP verify par auto ho jaati hai)"
                />
                <p className="mt-1 text-xs text-fg-subtle">Alag POST/GET subscribe API ho tabhi bharo. Success = <code>success:true</code> ya <code>responseCode:"0"</code>.</p>
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
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg mb-1.5">OTP Gateway Provider</label>
                <select
                  value={otpProvider}
                  onChange={(e) => setOtpProvider(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-fg outline-none"
                >
                  <option value="local">Mock Local OTP (Console Logs Only)</option>
                  <option value="twilio">Twilio SMS Gateway</option>
                  <option value="msg91">MSG91 OTP Service</option>
                  <option value="kaleyra">Kaleyra Message Portal</option>
                  <option value="partner">Telecom Operator API (Partner-Generated)</option>
                  <option value="custom_http">Universal Custom HTTP Request</option>
                </select>
              </div>

              {/* Twilio Config Form */}
              {otpProvider === 'twilio' && (
                <div className="p-3 border border-border rounded-lg bg-bg-subtle/50 space-y-3">
                  <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Twilio Credentials</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Account SID</label>
                      <Input value={twilioConfig.accountSid} onChange={(e) => setTwilioConfig({ ...twilioConfig, accountSid: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Auth Token</label>
                      <Input value={twilioConfig.authToken} onChange={(e) => setTwilioConfig({ ...twilioConfig, authToken: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Sender Number (From)</label>
                      <Input value={twilioConfig.from} onChange={(e) => setTwilioConfig({ ...twilioConfig, from: e.target.value })} placeholder="e.g. +1234567890" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">SMS Message Template</label>
                      <Input value={twilioConfig.messageTemplate} onChange={(e) => setTwilioConfig({ ...twilioConfig, messageTemplate: e.target.value })} placeholder="Your code: {{otp}}" />
                    </div>
                  </div>
                </div>
              )}

              {/* MSG91 Config Form */}
              {otpProvider === 'msg91' && (
                <div className="p-3 border border-border rounded-lg bg-bg-subtle/50 space-y-3">
                  <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">MSG91 Credentials</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Auth Key</label>
                      <Input value={msg91Config.authKey} onChange={(e) => setMsg91Config({ ...msg91Config, authKey: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Template ID</label>
                      <Input value={msg91Config.templateId} onChange={(e) => setMsg91Config({ ...msg91Config, templateId: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">Sender Name</label>
                    <Input value={msg91Config.sender} onChange={(e) => setMsg91Config({ ...msg91Config, sender: e.target.value })} placeholder="e.g. MSGSND" />
                  </div>
                </div>
              )}

              {/* Kaleyra Config Form */}
              {otpProvider === 'kaleyra' && (
                <div className="p-3 border border-border rounded-lg bg-bg-subtle/50 space-y-3">
                  <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Kaleyra Credentials</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">API Key</label>
                      <Input value={kaleyraConfig.apiKey} onChange={(e) => setKaleyraConfig({ ...kaleyraConfig, apiKey: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Sender ID</label>
                      <Input value={kaleyraConfig.sender} onChange={(e) => setKaleyraConfig({ ...kaleyraConfig, sender: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">API Region</label>
                      <select
                        value={kaleyraConfig.region}
                        onChange={(e) => setKaleyraConfig({ ...kaleyraConfig, region: e.target.value })}
                        className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg outline-none"
                      >
                        <option value="global">Global Portal (api.kaleyra.io)</option>
                        <option value="eu">Europe Gateway (api.eu-west-1.kaleyra.com)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Message Template</label>
                      <Input value={kaleyraConfig.messageTemplate} onChange={(e) => setKaleyraConfig({ ...kaleyraConfig, messageTemplate: e.target.value })} placeholder="Code: {{otp}}" />
                    </div>
                  </div>
                </div>
              )}

              {/* Partner Config Form */}
              {otpProvider === 'partner' && (
                <div className="p-3 border border-border rounded-lg bg-bg-subtle/50 space-y-3">
                  <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Telecom Partner URLs (Remote OTP)</p>
                  <p className="text-xs text-fg-subtle">
                    Method <strong>GET</strong>. Placeholders: <code>{'{{msisdn}}'}</code>, <code>{'{{subServiceId}}'}</code> (pack: daily→HDaily), <code>{'{{otp}}'}</code>, <code>{'{{transactionId}}'}</code>. Success jab response me <code>responseCode:"0"</code>.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">Send URL (Generate OTP)</label>
                    <Input value={partnerConfig.sendUrl} onChange={(e) => setPartnerConfig({ ...partnerConfig, sendUrl: e.target.value })} placeholder="https://wbilzss.tickhighs.com/otp/subscribe?msisdn={{msisdn}}&subServiceId={{subServiceId}}&serviceId=WELLNESS&cpId=100&channel=wap&country=SS&operator=ZAIN&reqType=1&language=_E" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">Verify URL (Validate OTP)</label>
                    <Input value={partnerConfig.verifyUrl} onChange={(e) => setPartnerConfig({ ...partnerConfig, verifyUrl: e.target.value })} placeholder="https://wbilzss.tickhighs.com/otp/validate_otp?msisdn={{msisdn}}&otp={{otp}}" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Send HTTP Method</label>
                      <Input value={partnerConfig.method} onChange={(e) => setPartnerConfig({ ...partnerConfig, method: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Verify HTTP Method</label>
                      <Input value={partnerConfig.verifyMethod} onChange={(e) => setPartnerConfig({ ...partnerConfig, verifyMethod: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">Headers (JSON)</label>
                    <textarea
                      className="w-full min-h-[60px] rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-xs text-fg font-mono"
                      value={partnerConfig.headersJson}
                      onChange={(e) => setPartnerConfig({ ...partnerConfig, headersJson: e.target.value })}
                      placeholder='{"Authorization":"Bearer ..."}'
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Send Body Template (JSON)</label>
                      <textarea
                        className="w-full min-h-[60px] rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-xs text-fg font-mono"
                        value={partnerConfig.bodyJson}
                        onChange={(e) => setPartnerConfig({ ...partnerConfig, bodyJson: e.target.value })}
                        placeholder='{"phone":"{{phone}}","campaign":"{{campaign}}"}'
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">Verify Body Template (JSON)</label>
                      <textarea
                        className="w-full min-h-[60px] rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-xs text-fg font-mono"
                        value={partnerConfig.verifyBodyJson}
                        onChange={(e) => setPartnerConfig({ ...partnerConfig, verifyBodyJson: e.target.value })}
                        placeholder='{"phone":"{{phone}}","otp":"{{otp}}","txn":"{{providerRequestId}}"}'
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Custom HTTP Config Form */}
              {(otpProvider === 'custom_http' || otpProvider === 'custom') && (
                <div className="p-3 border border-border rounded-lg bg-bg-subtle/50 space-y-3">
                  <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Custom HTTP API Gateway</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-fg mb-1">Destination URL</label>
                      <Input value={customConfig.url} onChange={(e) => setCustomConfig({ ...customConfig, url: e.target.value })} placeholder="https://api.sms.com/send" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fg mb-1">HTTP Method</label>
                      <select
                        value={customConfig.method}
                        onChange={(e) => setCustomConfig({ ...customConfig, method: e.target.value })}
                        className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg outline-none"
                      >
                        <option value="POST">POST</option>
                        <option value="GET">GET</option>
                        <option value="PUT">PUT</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">Headers (JSON)</label>
                    <textarea
                      className="w-full min-h-[60px] rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-xs text-fg font-mono"
                      value={customConfig.headersJson}
                      onChange={(e) => setCustomConfig({ ...customConfig, headersJson: e.target.value })}
                      placeholder='{"Content-Type":"application/json"}'
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">Body Template (Placeholders: <code>{'{{phone}}'}</code>, <code>{'{{otp}}'}</code>, <code>{'{{campaign}}'}</code>)</label>
                    <textarea
                      className="w-full min-h-[60px] rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-xs text-fg font-mono"
                      value={customConfig.bodyJson}
                      onChange={(e) => setCustomConfig({ ...customConfig, bodyJson: e.target.value })}
                      placeholder='{"to":"{{phone}}","msg":"OTP is {{otp}}"}'
                    />
                  </div>
                </div>
              )}

              {/* testing console panel */}
              <div className="p-3 border border-dashed border-border rounded-lg bg-bg-subtle space-y-3">
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">SMS Provider Testing Hub</p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-fg mb-1">Test phone number</label>
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="e.g. 919876543210"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleHealthCheck} disabled={testing}>
                    Run Health Check
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleTestSend} disabled={testing}>
                    {testing ? 'Processing...' : 'Send Test OTP'}
                  </Button>
                </div>
                {testResult && (
                  <div className="mt-2 text-xs font-mono p-2 bg-bg-base border border-border rounded-lg max-h-[100px] overflow-y-auto whitespace-pre-wrap">
                    {testResult}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
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
