import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight, Globe, Pencil } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/common/Modal'
import useStore from '../store/useStore'
import * as marketsApi from '../services/api/markets'

function MarketFormFields({
  countryName,
  setCountryName,
  countryCode,
  setCountryCode,
  operatorName,
  setOperatorName,
  operatorCode,
  setOperatorCode,
  autoFocus = false,
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Country name</label>
          <Input
            value={countryName}
            onChange={(e) => setCountryName(e.target.value)}
            placeholder="India"
            autoFocus={autoFocus}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Country code</label>
          <Input
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            placeholder="IN"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Operator name</label>
          <Input
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Airtel"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Operator code</label>
          <Input
            value={operatorCode}
            onChange={(e) => setOperatorCode(e.target.value.toUpperCase())}
            placeholder="AIRTEL"
          />
        </div>
      </div>
      <p className="text-xs text-fg-muted">
        Tracking IDs will look like{' '}
        <code className="font-mono">
          {(countryCode || 'IN').toUpperCase()}-{(operatorCode || 'AIRTEL').toUpperCase()}-12
        </code>
      </p>
    </>
  )
}

function CreateMarketModal({ isOpen, onClose, onCreated }) {
  const [countryName, setCountryName] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [operatorName, setOperatorName] = useState('')
  const [operatorCode, setOperatorCode] = useState('')
  const [creating, setCreating] = useState(false)
  const addToast = useStore((s) => s.addToast)

  const reset = () => {
    setCountryName('')
    setCountryCode('')
    setOperatorName('')
    setOperatorCode('')
  }

  const handleCreate = async () => {
    if (!countryName.trim() || !countryCode.trim() || !operatorName.trim() || !operatorCode.trim()) {
      return
    }
    setCreating(true)
    try {
      const market = await marketsApi.createMarket({
        countryName: countryName.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        operatorName: operatorName.trim(),
        operatorCode: operatorCode.trim().toUpperCase(),
      })
      addToast('Market created', 'success')
      reset()
      onClose()
      onCreated?.(market)
    } catch (err) {
      addToast(err.message || 'Failed to create market', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New market" size="md">
      <div className="space-y-4">
        <MarketFormFields
          countryName={countryName}
          setCountryName={setCountryName}
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          operatorName={operatorName}
          setOperatorName={setOperatorName}
          operatorCode={operatorCode}
          setOperatorCode={setOperatorCode}
          autoFocus
        />
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={
              creating ||
              !countryName.trim() ||
              !countryCode.trim() ||
              !operatorName.trim() ||
              !operatorCode.trim()
            }
          >
            {creating ? 'Creating...' : 'Create market'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function EditMarketModal({ isOpen, market, onClose, onUpdated }) {
  const [countryName, setCountryName] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [operatorName, setOperatorName] = useState('')
  const [operatorCode, setOperatorCode] = useState('')
  const [saving, setSaving] = useState(false)
  const addToast = useStore((s) => s.addToast)

  useEffect(() => {
    if (!market || !isOpen) return
    setCountryName(market.countryName || '')
    setCountryCode(market.countryCode || '')
    setOperatorName(market.operatorName || '')
    setOperatorCode(market.operatorCode || '')
  }, [market, isOpen])

  const handleSave = async () => {
    if (!market) return
    if (!countryName.trim() || !countryCode.trim() || !operatorName.trim() || !operatorCode.trim()) {
      return
    }
    setSaving(true)
    try {
      const updated = await marketsApi.updateMarket(market.countryCode, market.operatorCode, {
        countryName: countryName.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        operatorName: operatorName.trim(),
        operatorCode: operatorCode.trim().toUpperCase(),
      })
      addToast('Market updated', 'success')
      onClose()
      onUpdated?.(updated)
    } catch (err) {
      addToast(err.message || 'Failed to update market', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit market" size="md">
      <div className="space-y-4">
        <MarketFormFields
          countryName={countryName}
          setCountryName={setCountryName}
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          operatorName={operatorName}
          setOperatorName={setOperatorName}
          operatorCode={operatorCode}
          setOperatorCode={setOperatorCode}
          autoFocus
        />
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={
              saving ||
              !countryName.trim() ||
              !countryCode.trim() ||
              !operatorName.trim() ||
              !operatorCode.trim()
            }
          >
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function MarketsPage() {
  const navigate = useNavigate()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingMarket, setEditingMarket] = useState(null)
  const addToast = useStore((s) => s.addToast)

  const loadMarkets = useCallback(async () => {
    setLoading(true)
    try {
      const data = await marketsApi.listMarkets()
      setMarkets(data || [])
    } catch (err) {
      addToast(err.message || 'Failed to load markets', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    if (isAuthenticated) loadMarkets()
  }, [isAuthenticated, loadMarkets])

  const filtered = useMemo(() => {
    if (!search.trim()) return markets
    const q = search.toLowerCase()
    return markets.filter(
      (m) =>
        m.countryName.toLowerCase().includes(q) ||
        m.operatorName.toLowerCase().includes(q) ||
        m.countryCode.toLowerCase().includes(q) ||
        m.operatorCode.toLowerCase().includes(q),
    )
  }, [markets, search])

  const pageActions = isAuthenticated ? (
    <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
      <Plus className="w-4 h-4" />
      New market
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
          <h1 className="page-header-title">Markets</h1>
          <p className="page-header-description">
            Browse countries and operators, then manage campaigns under each market
          </p>
        </div>

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
            <Input
              type="text"
              placeholder="Search by country or operator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="surface-card p-12 text-center text-fg-muted text-sm">Loading markets...</div>
        ) : filtered.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              title={search ? 'No markets found' : 'No markets yet'}
              description="Create a country + operator pair to start adding campaigns"
              action={
                !search && (
                  <Button variant="primary" onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4" />
                    Create market
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
                  <th className="col-text">Country</th>
                  <th className="col-text">Operator</th>
                  <th className="col-text">Codes</th>
                  <th className="col-num">Campaigns</th>
                  <th className="col-num w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((market) => (
                  <tr
                    key={`${market.countryCode}-${market.operatorCode}`}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate(`/markets/${market.countryCode}/${market.operatorCode}`)
                    }
                  >
                    <td className="col-text font-medium">
                      <span className="inline-flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-fg-subtle" />
                        {market.countryName}
                      </span>
                    </td>
                    <td className="col-text">{market.operatorName}</td>
                    <td className="col-text">
                      <code className="text-xs font-mono text-fg-muted">
                        {market.countryCode}-{market.operatorCode}
                      </code>
                    </td>
                    <td className="col-num text-fg-muted">{market.campaignCount}</td>
                    <td className="col-num">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          className="p-1.5 text-fg-muted hover:text-accent rounded-md hover:bg-accent-muted transition-colors"
                          title="Edit market"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingMarket(market)
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-fg-subtle" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateMarketModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(market) => {
          loadMarkets()
          if (market?.countryCode && market?.operatorCode) {
            navigate(`/markets/${market.countryCode}/${market.operatorCode}`)
          }
        }}
      />

      <EditMarketModal
        isOpen={!!editingMarket}
        market={editingMarket}
        onClose={() => setEditingMarket(null)}
        onUpdated={() => loadMarkets()}
      />
    </AppShell>
  )
}

export default memo(MarketsPage)
