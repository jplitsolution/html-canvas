import { memo, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Globe, LogIn } from 'lucide-react'
import useStore from '../store/useStore'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import CreateCampaignModal from '../components/dashboard/CreateCampaignModal'
import Card from '../components/ui/Card'

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

  if (authLoading) {
    return (
      <AppShell>
        <main className="page-container flex items-center justify-center min-h-[50vh]">
          <p className="text-fg-muted">Loading...</p>
        </main>
      </AppShell>
    )
  }

  if (!isAuthenticated) {
    return (
      <AppShell>
        <main className="page-container">
          <EmptyState
            icon={LogIn}
            title="Sign in to manage campaigns"
            description="Create operator and country specific subscription funnels"
            action={
              <Button variant="primary" onClick={() => navigate('/login')}>
                <LogIn className="w-4 h-4" />
                Sign in
              </Button>
            }
          />
        </main>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <main className="page-container">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-fg font-display tracking-tight">Campaigns</h1>
          <p className="text-sm text-fg-muted mt-1">
            Manage subscription funnels by country and operator
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
            <Input
              type="text"
              placeholder="Search country or operator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            New campaign
          </Button>
        </div>

        {campaignsLoading ? (
          <div className="surface-card p-12 text-center text-fg-muted">Loading campaigns...</div>
        ) : filtered.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              icon={Globe}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((campaign) => (
              <Card
                key={campaign.id}
                interactive
                className="p-4"
                onClick={() => navigate(`/campaigns/${campaign.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      campaign.active
                        ? 'bg-success-muted text-success'
                        : 'bg-bg-muted text-fg-muted'
                    }`}
                  >
                    {campaign.active ? 'Active' : 'Draft'}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-fg font-display mb-1">
                  {campaign.country} / {campaign.operator}
                </h3>
                <p className="text-xs text-fg-muted truncate">{campaign.name}</p>
                <p className="text-xs text-fg-muted mt-2">
                  {campaign.requiredComplete ? 'Ready to activate' : 'Pages incomplete'}
                </p>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateCampaignModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        campaigns={campaigns}
      />
    </AppShell>
  )
}

export default memo(CampaignsPage)
