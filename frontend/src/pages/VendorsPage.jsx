import { memo, useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  Users,
  ChevronRight,
  Store,
  Power,
  Search,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import useStore from '../store/useStore'

function ActiveSwitch({ active, onToggle, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`
        relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
        transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
        disabled:cursor-not-allowed disabled:opacity-50
        ${active ? 'bg-success' : 'bg-bg-canvas border border-border'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${active ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  )
}

function VendorsPage() {
  const vendors = useStore((s) => s.vendors)
  const loading = useStore((s) => s.vendorsLoading)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const createVendor = useStore((s) => s.createVendor)
  const updateVendor = useStore((s) => s.updateVendor)
  const deleteVendor = useStore((s) => s.deleteVendor)
  const createAffiliate = useStore((s) => s.createAffiliate)
  const updateAffiliate = useStore((s) => s.updateAffiliate)
  const deleteAffiliate = useStore((s) => s.deleteAffiliate)

  const [expanded, setExpanded] = useState(null)
  const [vendorName, setVendorName] = useState('')
  const [vendorCode, setVendorCode] = useState('')
  const [creatingVendor, setCreatingVendor] = useState(false)
  const [affName, setAffName] = useState('')
  const [affCode, setAffCode] = useState('')
  const [togglingId, setTogglingId] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchVendors({ force: true }).catch(() => {})
  }, [fetchVendors])

  const filtered = search.trim()
    ? vendors.filter((v) => {
        const q = search.toLowerCase()
        return (
          v.name.toLowerCase().includes(q) ||
          v.code.toLowerCase().includes(q) ||
          (v.affiliates || []).some(
            (a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q),
          )
        )
      })
    : vendors

  const handleCreateVendor = async (e) => {
    e.preventDefault()
    if (!vendorName.trim() || !vendorCode.trim()) return
    setCreatingVendor(true)
    try {
      await createVendor({ name: vendorName.trim(), code: vendorCode.trim() })
      setVendorName('')
      setVendorCode('')
    } catch {
      // toast in slice
    } finally {
      setCreatingVendor(false)
    }
  }

  const handleToggleVendor = async (vendor) => {
    setTogglingId(`v-${vendor.id}`)
    try {
      await updateVendor(vendor.id, { active: vendor.active === false })
    } catch {
      // toast in slice
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('Delete this vendor and all its affiliates?')) return
    try {
      await deleteVendor(vendorId)
      if (expanded === vendorId) setExpanded(null)
    } catch {
      // toast in slice
    }
  }

  const handleCreateAffiliate = async (vendorId) => {
    if (!affName.trim() || !affCode.trim()) return
    try {
      await createAffiliate({ vendorId, name: affName.trim(), code: affCode.trim() })
      setAffName('')
      setAffCode('')
    } catch {
      // toast in slice
    }
  }

  const handleToggleAffiliate = async (affiliate) => {
    setTogglingId(`a-${affiliate.id}`)
    try {
      await updateAffiliate(affiliate.id, { active: affiliate.active === false })
    } catch {
      // toast in slice
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteAffiliate = async (affiliateId) => {
    if (!window.confirm('Delete this affiliate?')) return
    try {
      await deleteAffiliate(affiliateId)
    } catch {
      // toast in slice
    }
  }

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-header-title">Vendors &amp; Affiliates</h1>
          <p className="page-header-description">
            Manage partners, toggle active status, then assign them on campaign detail pages.
            Traffic link ke <code className="font-mono">click_id</code> / <code className="font-mono">vid</code> visit pe store hote hain — CPA postback nahi.
          </p>
        </div>

        <div className="surface-card p-5 mb-6">
          <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add vendor
          </h2>
          <form onSubmit={handleCreateVendor} className="flex flex-col sm:flex-row gap-3">
            <input
              className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
              placeholder="Vendor name"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
            />
            <input
              className="sm:w-40 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
              placeholder="Code"
              value={vendorCode}
              onChange={(e) => setVendorCode(e.target.value.toUpperCase())}
            />
            <Button type="submit" variant="primary" size="sm" disabled={creatingVendor}>
              {creatingVendor ? 'Creating...' : 'Create'}
            </Button>
          </form>
        </div>

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
            <Input
              type="text"
              placeholder="Search vendors or affiliates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="surface-card p-12 text-center text-fg-muted text-sm">
            Loading vendors...
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              title={search ? 'No vendors found' : 'No vendors yet'}
              description="Create a vendor to start assigning tracking links on campaigns"
              action={
                !search && (
                  <div className="flex justify-center">
                    <Store className="w-8 h-8 text-fg-subtle" />
                  </div>
                )
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((vendor) => {
              const isOpen = expanded === vendor.id
              const affiliates = vendor.affiliates || []
              const isActive = vendor.active !== false
              return (
                <div
                  key={vendor.id}
                  className={`surface-card overflow-hidden transition-opacity ${
                    isActive ? '' : 'opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2 px-4 py-3.5">
                    <button
                      type="button"
                      className="flex-1 flex items-center gap-3 min-w-0 text-left hover:opacity-90 transition-opacity"
                      onClick={() => setExpanded(isOpen ? null : vendor.id)}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isActive ? 'bg-accent-muted text-accent' : 'bg-bg-muted text-fg-subtle'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-fg truncate">{vendor.name}</p>
                          <span className={`badge ${isActive ? 'badge-success' : 'badge-muted'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-fg-muted mt-0.5">
                          <code className="font-mono">{vendor.code}</code>
                          {' · '}
                          {affiliates.length} affiliate{affiliates.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2" title={isActive ? 'Deactivate' : 'Activate'}>
                        <span className="hidden sm:inline text-[11px] text-fg-subtle">
                          {isActive ? 'On' : 'Off'}
                        </span>
                        <ActiveSwitch
                          active={isActive}
                          label={isActive ? `Deactivate ${vendor.name}` : `Activate ${vendor.name}`}
                          disabled={togglingId === `v-${vendor.id}`}
                          onToggle={() => handleToggleVendor(vendor)}
                        />
                      </div>
                      <button
                        type="button"
                        className="p-1.5 text-fg-muted hover:text-danger rounded-md hover:bg-danger-muted transition-colors"
                        title="Delete vendor"
                        onClick={() => handleDeleteVendor(vendor.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 text-fg-subtle"
                        onClick={() => setExpanded(isOpen ? null : vendor.id)}
                        aria-label={isOpen ? 'Collapse' : 'Expand'}
                      >
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border px-5 py-4 space-y-4 bg-bg-muted/20">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
                          placeholder="Affiliate name"
                          value={affName}
                          onChange={(e) => setAffName(e.target.value)}
                        />
                        <input
                          className="sm:w-36 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
                          placeholder="Code"
                          value={affCode}
                          onChange={(e) => setAffCode(e.target.value.toUpperCase())}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateAffiliate(vendor.id)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add affiliate
                        </Button>
                      </div>

                      {affiliates.length === 0 ? (
                        <p className="text-xs text-fg-muted py-2">No affiliates yet.</p>
                      ) : (
                        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                          {affiliates.map((aff) => {
                            const affActive = aff.active !== false
                            return (
                              <li
                                key={aff.id}
                                className={`flex items-center justify-between gap-3 px-3.5 py-3 bg-bg-elevated ${
                                  affActive ? '' : 'opacity-70'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-fg">{aff.name}</p>
                                    <span
                                      className={`badge ${affActive ? 'badge-success' : 'badge-muted'}`}
                                    >
                                      {affActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-fg-muted font-mono mt-0.5">{aff.code}</p>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0">
                                  <ActiveSwitch
                                    active={affActive}
                                    label={
                                      affActive
                                        ? `Deactivate ${aff.name}`
                                        : `Activate ${aff.name}`
                                    }
                                    disabled={togglingId === `a-${aff.id}`}
                                    onToggle={() => handleToggleAffiliate(aff)}
                                  />
                                  <button
                                    type="button"
                                    className="p-1.5 text-fg-muted hover:text-danger rounded-md hover:bg-danger-muted transition-colors"
                                    onClick={() => handleDeleteAffiliate(aff.id)}
                                    title="Delete affiliate"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="mt-6 text-xs text-fg-subtle flex items-center gap-1.5">
          <Power className="w-3.5 h-3.5" />
          Inactive vendors and affiliates stay assigned but show as inactive on campaign tracking
          links.
        </p>
      </div>
    </AppShell>
  )
}

export default memo(VendorsPage)
