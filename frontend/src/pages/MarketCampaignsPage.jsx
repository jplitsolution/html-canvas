import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Search, Plus, ChevronRight, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/common/Modal'
import useStore from '../store/useStore'
import * as marketsApi from '../services/api/markets'

function CreateMarketCampaignModal({
  isOpen,
  onClose,
  countryCode,
  operatorCode,
  countryName,
  operatorName,
  campaigns = [],
  onCreated,
}) {
  const [name, setName] = useState('')
  const [copyFromCampaignId, setCopyFromCampaignId] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const addToast = useStore((s) => s.addToast)

  const handleCreate = async () => {
    const campaignName = name.trim() || `${countryName} ${operatorName}`
    setCreating(true)
    try {
      const campaign = await marketsApi.createMarketCampaign(countryCode, operatorCode, {
        name: campaignName,
        copyFromCampaignId: copyFromCampaignId ? Number(copyFromCampaignId) : undefined,
      })
      addToast('Campaign created', 'success')
      setName('')
      setCopyFromCampaignId('')
      onClose()
      onCreated?.(campaign)
      navigate(`/campaigns/${campaign.id}`)
    } catch (err) {
      addToast(err.message || 'Failed to create campaign', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New campaign" size="md">
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Creating under{' '}
          <span className="font-medium text-fg">
            {countryName} / {operatorName}
          </span>
        </p>
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Campaign name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wellness WAP"
            autoFocus
          />
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
                  {c.name}
                  {c.trackingId ? ` (${c.trackingId})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create campaign'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function MarketCampaignsPage() {
  const { countryCode, operatorCode } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [market, setMarket] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const addToast = useStore((s) => s.addToast)

  const load = useCallback(async () => {
    if (!countryCode || !operatorCode) return
    setLoading(true)
    try {
      const [marketData, campaignData] = await Promise.all([
        marketsApi.getMarket(countryCode, operatorCode),
        marketsApi.listMarketCampaigns(countryCode, operatorCode),
      ])
      setMarket(marketData)
      setCampaigns(campaignData || [])
    } catch (err) {
      addToast(err.message || 'Failed to load market', 'error')
      setMarket(null)
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }, [countryCode, operatorCode, addToast])

  useEffect(() => {
    if (isAuthenticated) load()
  }, [isAuthenticated, load])

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns
    const q = search.toLowerCase()
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.trackingId || '').toLowerCase().includes(q),
    )
  }, [campaigns, search])

  const pageActions = isAuthenticated ? (
    <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
      <Plus className="w-4 h-4" />
      New campaign
    </Button>
  ) : null

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="page-container flex items-center justify-center min-h-[50vh]">
          <p className="text-fg-muted text-sm">Loading...</p>
        </div>
      </AppShell>
    )
  }

  if (!market) {
    return (
      <AppShell>
        <div className="page-container text-center py-12">
          <p className="text-fg-muted mb-4">Market not found</p>
          <Button variant="outline" onClick={() => navigate('/markets')}>
            Back to markets
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell actions={pageActions}>
      <div className="page-container">
        <button
          type="button"
          onClick={() => navigate('/markets')}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to markets
        </button>

        <div className="page-header">
          <p className="text-xs text-fg-subtle mb-1">
            <Link to="/markets" className="hover:text-fg">
              Markets
            </Link>
            {' / '}
            {market.countryCode} / {market.operatorCode}
          </p>
          <h1 className="page-header-title">
            {market.countryName} / {market.operatorName}
          </h1>
          <p className="page-header-description">
            Campaigns for this country and operator
          </p>
        </div>

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
            <Input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              title={search ? 'No campaigns found' : 'No campaigns yet'}
              description="Create a campaign under this market to open the flow builder"
              action={
                !search && (
                  <Button variant="primary" onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4" />
                    Create campaign
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="surface-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-text">Campaign</th>
                  <th className="col-text">Tracking ID</th>
                  <th className="col-text">Status</th>
                  <th className="col-text">Pages</th>
                  <th className="col-num w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <td className="col-text font-medium">{campaign.name}</td>
                    <td className="col-text">
                      <code className="text-xs font-mono text-fg-muted">
                        {campaign.trackingId || '—'}
                      </code>
                    </td>
                    <td className="col-text">
                      <span
                        className={`badge ${campaign.active ? 'badge-success' : 'badge-muted'}`}
                      >
                        {campaign.active ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="col-text">
                      <span
                        className={`badge ${
                          campaign.requiredComplete ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {campaign.requiredComplete ? 'Complete' : 'Incomplete'}
                      </span>
                    </td>
                    <td className="col-num">
                      <ChevronRight className="w-4 h-4 text-fg-subtle inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateMarketCampaignModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        countryCode={market.countryCode}
        operatorCode={market.operatorCode}
        countryName={market.countryName}
        operatorName={market.operatorName}
        campaigns={campaigns}
        onCreated={() => load()}
      />
    </AppShell>
  )
}

export default memo(MarketCampaignsPage)
