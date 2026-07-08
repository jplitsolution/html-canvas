import { memo, useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Users, ChevronRight, Store } from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import useStore from '../store/useStore'
import {
  listVendors,
  createVendor,
  deleteVendor,
  createAffiliate,
  deleteAffiliate,
} from '../services/api/partners'

function VendorsPage() {
  const addToast = useStore((s) => s.addToast)
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const [vendorName, setVendorName] = useState('')
  const [vendorCode, setVendorCode] = useState('')
  const [creatingVendor, setCreatingVendor] = useState(false)

  const [affName, setAffName] = useState('')
  const [affCode, setAffCode] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    listVendors()
      .then((res) => setVendors(res || []))
      .catch((err) => addToast(err.message || 'Failed to load vendors', 'error'))
      .finally(() => setLoading(false))
  }, [addToast])

  useEffect(() => {
    load()
  }, [load])

  const handleCreateVendor = async (e) => {
    e.preventDefault()
    if (!vendorName.trim() || !vendorCode.trim()) return
    setCreatingVendor(true)
    try {
      await createVendor({ name: vendorName.trim(), code: vendorCode.trim() })
      setVendorName('')
      setVendorCode('')
      addToast('Vendor created', 'success')
      load()
    } catch (err) {
      addToast(err.message || 'Failed to create vendor', 'error')
    } finally {
      setCreatingVendor(false)
    }
  }

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('Delete this vendor and all its affiliates?')) return
    try {
      await deleteVendor(vendorId)
      addToast('Vendor deleted', 'success')
      load()
    } catch (err) {
      addToast(err.message || 'Failed to delete vendor', 'error')
    }
  }

  const handleCreateAffiliate = async (vendorId) => {
    if (!affName.trim() || !affCode.trim()) return
    try {
      await createAffiliate({ vendorId, name: affName.trim(), code: affCode.trim() })
      setAffName('')
      setAffCode('')
      addToast('Affiliate created', 'success')
      load()
    } catch (err) {
      addToast(err.message || 'Failed to create affiliate', 'error')
    }
  }

  const handleDeleteAffiliate = async (affiliateId) => {
    if (!window.confirm('Delete this affiliate?')) return
    try {
      await deleteAffiliate(affiliateId)
      addToast('Affiliate deleted', 'success')
      load()
    } catch (err) {
      addToast(err.message || 'Failed to delete affiliate', 'error')
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="surface-card p-6 text-center text-sm text-fg-muted">Loading vendors...</div>
            ) : vendors.length === 0 ? (
              <div className="surface-card p-8 text-center">
                <Store className="w-8 h-8 text-fg-subtle mx-auto mb-2" />
                <p className="text-sm text-fg-muted">No vendors yet. Create your first vendor.</p>
              </div>
            ) : (
              vendors.map((vendor) => {
                const isOpen = expanded === vendor.id
                return (
                  <div key={vendor.id} className="surface-card overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : vendor.id)}
                        className="flex items-center gap-3 min-w-0 text-left"
                      >
                        <ChevronRight
                          className={`w-4 h-4 text-fg-subtle transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-fg">{vendor.name}</p>
                          <p className="text-xs text-fg-muted">
                            vid: <code className="font-mono">{vendor.code}</code> ·{' '}
                            {(vendor.affiliates || []).length} affiliate(s)
                          </p>
                        </div>
                      </button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteVendor(vendor.id)}>
                        <Trash2 className="w-4 h-4 text-danger" />
                      </Button>
                    </div>

                    {isOpen && (
                      <div className="border-t border-border px-5 py-4 bg-bg-subtle/40">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-fg-subtle" />
                          <h4 className="text-xs font-semibold text-fg uppercase tracking-wide">Affiliates</h4>
                        </div>
                        <div className="space-y-1.5 mb-4">
                          {(vendor.affiliates || []).length === 0 ? (
                            <p className="text-xs text-fg-muted">No affiliates yet.</p>
                          ) : (
                            vendor.affiliates.map((aff) => (
                              <div
                                key={aff.id}
                                className="flex items-center justify-between rounded-md border border-border bg-bg-base px-3 py-2"
                              >
                                <span className="text-sm text-fg">
                                  {aff.name}{' '}
                                  <code className="text-xs font-mono text-fg-muted">({aff.code})</code>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAffiliate(aff.id)}
                                  className="text-danger hover:opacity-70"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex-1 min-w-[120px]">
                            <label className="block text-xs text-fg-muted mb-1">Affiliate name</label>
                            <input
                              className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-bg-base"
                              value={affName}
                              onChange={(e) => setAffName(e.target.value)}
                              placeholder="Affiliate One"
                            />
                          </div>
                          <div className="w-32">
                            <label className="block text-xs text-fg-muted mb-1">Code (aff_id)</label>
                            <input
                              className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-bg-base font-mono"
                              value={affCode}
                              onChange={(e) => setAffCode(e.target.value)}
                              placeholder="aff01"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateAffiliate(vendor.id)}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div className="space-y-4">
            <div className="surface-card p-5">
              <h3 className="text-sm font-semibold text-fg mb-3">New vendor</h3>
              <form onSubmit={handleCreateVendor} className="space-y-3">
                <div>
                  <label className="block text-xs text-fg-muted mb-1">Name</label>
                  <input
                    className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-bg-base"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="Acme Media"
                  />
                </div>
                <div>
                  <label className="block text-xs text-fg-muted mb-1">Code (vid)</label>
                  <input
                    className="w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-bg-base font-mono"
                    value={vendorCode}
                    onChange={(e) => setVendorCode(e.target.value)}
                    placeholder="acme"
                  />
                </div>
                <Button type="submit" variant="primary" size="sm" className="w-full" disabled={creatingVendor}>
                  <Plus className="w-4 h-4" />
                  {creatingVendor ? 'Creating...' : 'Create vendor'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default memo(VendorsPage)
