import { memo, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight } from 'lucide-react'
import useStore from '../store/useStore'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import CreateCampaignModal from '../components/dashboard/CreateCampaignModal'

function CampaignsPage() {
  const navigate = useNavigate()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const campaigns = useStore((s) => s.campaigns)
  const campaignsLoading = useStore((s) => s.campaignsLoading)
  const fetchCampaigns = useStore((s) => s.fetchCampaigns)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (isAuthenticated) fetchCampaigns()
  }, [isAuthenticated, fetchCampaigns])

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns
    const q = search.toLowerCase()
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.operator.toLowerCase().includes(q),
    )
  }, [campaigns, search])

  const pageActions = isAuthenticated ? (
    <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
      <Plus className="w-4 h-4" />
      New campaign
    </Button>
  ) : null

  if (authLoading) {
    return (
      <AppShell>
        <div className="page-container flex items-center justify-center min-h-[50vh]">
          <p className="text-fg-muted text-sm">Loading...</p>
        </div>
      </AppShell>
    )
  }



  return (
    <AppShell actions={pageActions}>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-header-title">Campaigns</h1>
          <p className="page-header-description">
            Manage subscription funnels by country and operator
          </p>
        </div>

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
            <Input
              type="text"
              placeholder="Search by country, operator, or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {campaignsLoading ? (
          <div className="surface-card p-12 text-center text-fg-muted text-sm">
            Loading campaigns...
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              title={search ? 'No campaigns found' : 'No campaigns yet'}
              description="Create a campaign for each country and operator pair"
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
                  <th className="col-text">Country</th>
                  <th className="col-text">Operator</th>
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
                    <td className="col-text text-fg-muted">{campaign.country}</td>
                    <td className="col-text text-fg-muted">{campaign.operator}</td>
                    <td className="col-text">
                      <span className={`badge ${campaign.active ? 'badge-success' : 'badge-muted'}`}>
                        {campaign.active ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="col-text">
                      <span className={`badge ${campaign.requiredComplete ? 'badge-success' : 'badge-warning'}`}>
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

      <CreateCampaignModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        campaigns={campaigns}
      />
    </AppShell>
  )
}

export default memo(CampaignsPage)
