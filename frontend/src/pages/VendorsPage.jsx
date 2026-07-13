import { memo, useEffect, useState } from 'react'
import { Plus, Trash2, Users, ChevronRight, Store } from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import useStore from '../store/useStore'

function VendorsPage() {
  const vendors = useStore((s) => s.vendors)
  const loading = useStore((s) => s.vendorsLoading)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const createVendor = useStore((s) => s.createVendor)
  const deleteVendor = useStore((s) => s.deleteVendor)
  const createAffiliate = useStore((s) => s.createAffiliate)
  const deleteAffiliate = useStore((s) => s.deleteAffiliate)

  const [expanded, setExpanded] = useState(null)
  const [vendorName, setVendorName] = useState('')
  const [vendorCode, setVendorCode] = useState('')
  const [creatingVendor, setCreatingVendor] = useState(false)
  const [affName, setAffName] = useState('')
  const [affCode, setAffCode] = useState('')

  useEffect(() => {
    fetchVendors().catch(() => {})
  }, [fetchVendors])

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

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('Delete this vendor and all its affiliates?')) return
    try {
      await deleteVendor(vendorId)
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
            Manage vendors and their affiliates. Assign a vendor to a campaign to generate tracking links.
          </p>
        </div>

        <div className="surface-card p-5 mb-6">
          <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add vendor
          </h2>
          <form onSubmit={handleCreateVendor} className="flex flex-col sm:flex-row gap-3">
            <input
              className="flex-1 text-sm border border-border rounded-md px-3 py-2 bg-bg-base"
              placeholder="Vendor name"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
            />
            <input
              className="sm:w-40 text-sm border border-border rounded-md px-3 py-2 bg-bg-base"
              placeholder="Code"
              value={vendorCode}
              onChange={(e) => setVendorCode(e.target.value)}
            />
            <Button type="submit" variant="primary" size="sm" disabled={creatingVendor}>
              {creatingVendor ? 'Creating...' : 'Create'}
            </Button>
          </form>
        </div>

        {loading ? (
          <div className="surface-card p-12 text-center text-fg-muted text-sm">Loading vendors...</div>
        ) : vendors.length === 0 ? (
          <div className="surface-card p-12 text-center text-fg-muted text-sm">
            <Store className="w-8 h-8 mx-auto mb-3 text-fg-subtle" />
            No vendors yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {vendors.map((vendor) => {
              const isOpen = expanded === vendor.id
              const affiliates = vendor.affiliates || []
              return (
                <div key={vendor.id} className="surface-card overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-bg-muted/40 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : vendor.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Users className="w-4 h-4 text-fg-subtle shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg truncate">{vendor.name}</p>
                        <p className="text-xs text-fg-muted">
                          Code: {vendor.code} · {affiliates.length} affiliate
                          {affiliates.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-1.5 text-fg-muted hover:text-danger"
                        title="Delete vendor"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteVendor(vendor.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight
                        className={`w-4 h-4 text-fg-subtle transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-5 py-4 space-y-4 bg-bg-muted/20">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          className="flex-1 text-sm border border-border rounded-md px-3 py-2 bg-bg-base"
                          placeholder="Affiliate name"
                          value={affName}
                          onChange={(e) => setAffName(e.target.value)}
                        />
                        <input
                          className="sm:w-36 text-sm border border-border rounded-md px-3 py-2 bg-bg-base"
                          placeholder="Code"
                          value={affCode}
                          onChange={(e) => setAffCode(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateAffiliate(vendor.id)}
                        >
                          Add affiliate
                        </Button>
                      </div>

                      {affiliates.length === 0 ? (
                        <p className="text-xs text-fg-muted">No affiliates yet.</p>
                      ) : (
                        <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
                          {affiliates.map((aff) => (
                            <li
                              key={aff.id}
                              className="flex items-center justify-between px-3 py-2.5 bg-bg-base"
                            >
                              <div>
                                <p className="text-sm text-fg">{aff.name}</p>
                                <p className="text-xs text-fg-muted">{aff.code}</p>
                              </div>
                              <button
                                type="button"
                                className="p-1.5 text-fg-muted hover:text-danger"
                                onClick={() => handleDeleteAffiliate(aff.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default memo(VendorsPage)
