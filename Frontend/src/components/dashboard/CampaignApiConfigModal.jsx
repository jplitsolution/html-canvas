import { memo, useEffect, useState } from 'react'
import Modal from '../common/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { getCampaignApiConfig, saveCampaignApiConfig } from '../../services/api/campaigns'

function CampaignApiConfigModal({ isOpen, onClose, campaignId }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    subscriptionApi: '',
    blocklistApi: '',
    subscribeApi: '',
    headersJson: '',
  })

  useEffect(() => {
    if (!isOpen || !campaignId) return
    setLoading(true)
    getCampaignApiConfig(campaignId)
      .then((config) => {
        setForm({
          subscriptionApi: config.subscriptionApi || '',
          blocklistApi: config.blocklistApi || '',
          subscribeApi: config.subscribeApi || '',
          headersJson: config.headersJson || '',
        })
      })
      .finally(() => setLoading(false))
  }, [isOpen, campaignId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveCampaignApiConfig(campaignId, form)
      onClose()
    } catch (err) {
      alert(err.message || 'Failed to save API config')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Partner API settings" size="lg">
      {loading ? (
        <p className="text-fg-muted text-sm">Loading...</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Subscription check URL</label>
            <Input value={form.subscriptionApi} onChange={(e) => setForm({ ...form, subscriptionApi: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Blocklist / DND URL</label>
            <Input value={form.blocklistApi} onChange={(e) => setForm({ ...form, blocklistApi: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Subscribe URL</label>
            <Input value={form.subscribeApi} onChange={(e) => setForm({ ...form, subscribeApi: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Headers (JSON)</label>
            <textarea
              className="w-full min-h-[100px] rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-fg font-mono"
              value={form.headersJson}
              onChange={(e) => setForm({ ...form, headersJson: e.target.value })}
              placeholder='{"Authorization":"Bearer ..."}'
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default memo(CampaignApiConfigModal)
