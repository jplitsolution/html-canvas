import { memo, useEffect, useState } from 'react'
import Modal from '../common/Modal'
import { Trash2, GripVertical } from 'lucide-react'
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

  // Failover states
  const [failoverEnabled, setFailoverEnabled] = useState(false)
  const [failoverProviders, setFailoverProviders] = useState([])
  const [newFailoverProvider, setNewFailoverProvider] = useState('msg91')

  const addFailoverProvider = () => {
    setFailoverProviders([
      ...failoverProviders,
      { name: newFailoverProvider, priority: failoverProviders.length + 1, retryCount: 2, timeout: 5000, config: {} }
    ])
  }

  const removeFailoverProvider = (index) => {
    setFailoverProviders(failoverProviders.filter((_, i) => i !== index))
  }

  const updateFailoverProvider = (index, field, value) => {
    const updated = [...failoverProviders]
    updated[index] = { ...updated[index], [field]: value }
    setFailoverProviders(updated)
  }

  const updateFailoverProviderConfig = (index, field, value) => {
    const updated = [...failoverProviders]
    updated[index].config = { ...updated[index].config, [field]: value }
    setFailoverProviders(updated)
  }


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
            if (parsed.failover === true) {
              setFailoverEnabled(true)
              const providersArray = Object.entries(parsed.providers || {}).map(([name, data]) => ({
                name,
                priority: data.priority || 10,
                retryCount: data.retryCount || 2,
                timeout: data.timeout || 5000,
                config: data.config || {}
              })).sort((a, b) => a.priority - b.priority)
              setFailoverProviders(providersArray)
            } else {
              setFailoverEnabled(false)
              if (provider === 'twilio') setTwilioConfig((c) => ({ ...c, ...parsed }))
              else if (provider === 'msg91') setMsg91Config((c) => ({ ...c, ...parsed }))
              else if (provider === 'kaleyra') setKaleyraConfig((c) => ({ ...c, ...parsed }))
              else if (provider === 'partner') setPartnerConfig((c) => ({ ...c, ...parsed }))
              else if (provider === 'custom' || provider === 'custom_http') setCustomConfig((c) => ({ ...c, ...parsed }))
            }
          } catch (e) {
            console.error('Failed to parse OTP config JSON', e)
          }
        } else {
          setFailoverEnabled(false)
          setFailoverProviders([])
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
      let finalConfigJson = ''
      
      if (failoverEnabled) {
        const providersObj = {}
        failoverProviders.forEach(p => {
          providersObj[p.name] = {
            priority: Number(p.priority),
            retryCount: Number(p.retryCount),
            timeout: Number(p.timeout),
            config: p.config
          }
        })
        finalConfigJson = JSON.stringify({ failover: true, providers: providersObj })
      } else {
        const activeConfig = getActiveConfig()
        finalConfigJson = JSON.stringify(activeConfig)
      }

      const payload = {
        ...form,
        otpProvider: failoverEnabled ? 'failover' : otpProvider,
        otpConfigJson: finalConfigJson,
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
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-bg-subtle/50">
                <div>
                  <h3 className="text-sm font-semibold text-fg">Multi-Provider Failover Routing</h3>
                  <p className="text-xs text-fg-muted">Automatically route traffic through backup providers if the primary fails.</p>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input type="checkbox" checked={failoverEnabled} onChange={(e) => setFailoverEnabled(e.target.checked)} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" />
                  <label className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer"></label>
                </div>
              </div>

              {!failoverEnabled ? (
                <div className="space-y-4 border border-border rounded-lg p-3 bg-bg-subtle/30">
                  <div>
                    <label className="block text-sm font-medium text-fg mb-1.5">Primary OTP Gateway Provider</label>
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
              </div>
            ) : (
                <div className="space-y-4 border border-border rounded-lg p-3 bg-bg-subtle/30">
                   <div className="flex gap-2 mb-3">
                     <select value={newFailoverProvider} onChange={(e) => setNewFailoverProvider(e.target.value)} className="rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg outline-none">
                       <option value="twilio">Twilio</option>
                       <option value="msg91">MSG91</option>
                       <option value="kaleyra">Kaleyra</option>
                       <option value="partner">Telecom Partner API</option>
                       <option value="custom_http">Custom HTTP API</option>
                     </select>
                     <Button type="button" onClick={addFailoverProvider} variant="primary" size="sm">Add Provider</Button>
                   </div>
                   
                   {failoverProviders.map((p, index) => (
                      <div key={index} className="p-3 border border-border rounded-lg bg-bg-base relative group shadow-sm transition-all">
                         <div className="flex justify-between items-center mb-3">
                           <h4 className="font-semibold text-sm text-fg uppercase tracking-wide flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-fg-subtle cursor-move" />
                              {p.name.replace('_', ' ')}
                           </h4>
                           <button type="button" onClick={() => removeFailoverProvider(index)} className="p-1 text-fg-muted hover:text-danger hover:bg-danger/10 rounded">
                              <Trash2 className="w-4 h-4"/>
                           </button>
                         </div>
                         
                         <div className="grid grid-cols-3 gap-3 mb-4 bg-bg-subtle/50 p-2 rounded-md">
                           <div>
                             <label className="block text-xs font-medium text-fg-muted mb-1">Priority (1 = Highest)</label>
                             <Input type="number" value={p.priority} onChange={(e) => updateFailoverProvider(index, 'priority', e.target.value)} />
                           </div>
                           <div>
                             <label className="block text-xs font-medium text-fg-muted mb-1">Max Retries</label>
                             <Input type="number" value={p.retryCount} onChange={(e) => updateFailoverProvider(index, 'retryCount', e.target.value)} />
                           </div>
                           <div>
                             <label className="block text-xs font-medium text-fg-muted mb-1">Timeout (ms)</label>
                             <Input type="number" value={p.timeout} onChange={(e) => updateFailoverProvider(index, 'timeout', e.target.value)} />
                           </div>
                         </div>
                         
                         <div className="space-y-3">
                            {p.name === 'twilio' && (
                               <div className="grid grid-cols-2 gap-3">
                                 <div><label className="block text-xs font-medium text-fg mb-1">Account SID</label><Input value={p.config.accountSid || ''} onChange={(e) => updateFailoverProviderConfig(index, 'accountSid', e.target.value)} /></div>
                                 <div><label className="block text-xs font-medium text-fg mb-1">Auth Token</label><Input value={p.config.authToken || ''} onChange={(e) => updateFailoverProviderConfig(index, 'authToken', e.target.value)} /></div>
                                 <div><label className="block text-xs font-medium text-fg mb-1">From Number</label><Input value={p.config.from || ''} onChange={(e) => updateFailoverProviderConfig(index, 'from', e.target.value)} /></div>
                                 <div><label className="block text-xs font-medium text-fg mb-1">Message Template</label><Input value={p.config.messageTemplate || ''} onChange={(e) => updateFailoverProviderConfig(index, 'messageTemplate', e.target.value)} /></div>
                               </div>
                            )}
                            {p.name === 'msg91' && (
                               <div className="grid grid-cols-2 gap-3">
                                 <div><label className="block text-xs font-medium text-fg mb-1">Auth Key</label><Input value={p.config.authKey || ''} onChange={(e) => updateFailoverProviderConfig(index, 'authKey', e.target.value)} /></div>
                                 <div><label className="block text-xs font-medium text-fg mb-1">Template ID</label><Input value={p.config.templateId || ''} onChange={(e) => updateFailoverProviderConfig(index, 'templateId', e.target.value)} /></div>
                                 <div className="col-span-2"><label className="block text-xs font-medium text-fg mb-1">Sender Name</label><Input value={p.config.sender || ''} onChange={(e) => updateFailoverProviderConfig(index, 'sender', e.target.value)} /></div>
                               </div>
                            )}
                            {p.name === 'kaleyra' && (
                               <div className="grid grid-cols-2 gap-3">
                                 <div><label className="block text-xs font-medium text-fg mb-1">API Key</label><Input value={p.config.apiKey || ''} onChange={(e) => updateFailoverProviderConfig(index, 'apiKey', e.target.value)} /></div>
                                 <div><label className="block text-xs font-medium text-fg mb-1">Sender ID</label><Input value={p.config.sender || ''} onChange={(e) => updateFailoverProviderConfig(index, 'sender', e.target.value)} /></div>
                                 <div><label className="block text-xs font-medium text-fg mb-1">Region</label>
                                    <select value={p.config.region || 'global'} onChange={(e) => updateFailoverProviderConfig(index, 'region', e.target.value)} className="w-full rounded-md border border-border bg-bg-base px-3 py-1.5 text-xs text-fg">
                                      <option value="global">Global (api.kaleyra.io)</option>
                                      <option value="eu">Europe</option>
                                    </select>
                                 </div>
                                 <div><label className="block text-xs font-medium text-fg mb-1">Message Template</label><Input value={p.config.messageTemplate || ''} onChange={(e) => updateFailoverProviderConfig(index, 'messageTemplate', e.target.value)} /></div>
                               </div>
                            )}
                            {(p.name === 'partner' || p.name === 'custom_http') && (
                               <div className="space-y-3">
                                 <div><label className="block text-xs font-medium text-fg mb-1">URL (GET/POST)</label><Input value={p.config.url || p.config.sendUrl || ''} onChange={(e) => updateFailoverProviderConfig(index, 'url', e.target.value)} /></div>
                                 <div><label className="block text-xs font-medium text-fg mb-1">Headers (JSON)</label><Input value={p.config.headersJson || ''} onChange={(e) => updateFailoverProviderConfig(index, 'headersJson', e.target.value)} /></div>
                                 <div><label className="block text-xs font-medium text-fg mb-1">Body Template (JSON)</label><Input value={p.config.bodyJson || ''} onChange={(e) => updateFailoverProviderConfig(index, 'bodyJson', e.target.value)} /></div>
                               </div>
                            )}
                         </div>
                      </div>
                   ))}
                   {failoverProviders.length === 0 && (
                     <div className="text-center p-6 text-fg-muted text-sm border border-dashed border-border rounded-lg">
                        No failover providers added yet. Add a provider above to build your routing chain.
                     </div>
                   )}
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
