import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../common/Modal'
import useStore from '../../store/useStore'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { campaignDetailPath } from '../../utils/routes'

function CreateCampaignModal({ isOpen, onClose, campaigns = [] }) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [operator, setOperator] = useState('')
  const [copyFromCampaignId, setCopyFromCampaignId] = useState('')
  const [creating, setCreating] = useState(false)
  const createCampaign = useStore((s) => s.createCampaign)
  const navigate = useNavigate()

  const handleCreate = async () => {
    if (!country.trim() || !operator.trim()) return
    setCreating(true)
    try {
      const created = await createCampaign({
        name: name.trim() || `${country} ${operator}`,
        country: country.trim(),
        operator: operator.trim(),
        copyFromCampaignId: copyFromCampaignId ? Number(copyFromCampaignId) : undefined,
      })
      const id = created?.id || created
      setName('')
      setCountry('')
      setOperator('')
      setCopyFromCampaignId('')
      onClose()
      // Prefer nested market URL when codes exist on created campaign
      navigate(
        campaignDetailPath(
          created?.countryCode,
          created?.operatorCode,
          id,
        ),
      )
    } catch {
      // toast handled in slice
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Campaign" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Campaign name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="India Zain" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Country</label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Operator</label>
            <Input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Zain" />
          </div>
        </div>
        {campaigns.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Copy pages from</label>
            <select
              className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-fg"
              value={copyFromCampaignId}
              onChange={(e) => setCopyFromCampaignId(e.target.value)}
            >
              <option value="">Start blank</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.country} / {c.operator}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={creating}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={creating || !country.trim() || !operator.trim()}>
            {creating ? 'Creating...' : 'Create campaign'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default memo(CreateCampaignModal)
