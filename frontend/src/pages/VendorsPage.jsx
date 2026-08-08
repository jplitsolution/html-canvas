import { memo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Trash2,
  Users,
  Store,
  Power,
  Search,
  Link2,
  BookOpen,
  Pencil,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/common/Modal'
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

function PostbackUrlField({ value, onSave, placeholder, saving }) {
  const [draft, setDraft] = useState(value || '')
  useEffect(() => {
    setDraft(value || '')
  }, [value])

  const dirty = (draft || '').trim() !== (value || '').trim()

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <input
        className="flex-1 text-xs border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!dirty || saving}
        onClick={() => onSave(draft.trim() || null)}
      >
        {saving ? 'Saving…' : 'Save URL'}
      </Button>
    </div>
  )
}

function EditVendorModal({ isOpen, vendor, onClose, onSave }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!vendor || !isOpen) return
    setName(vendor.name || '')
    setCode(vendor.code || '')
  }, [vendor, isOpen])

  const handleSave = async () => {
    if (!vendor || !name.trim() || !code.trim()) return
    setSaving(true)
    try {
      await onSave(vendor.id, {
        name: name.trim(),
        code: code.trim(),
      })
      onClose()
    } catch {
      // toast in slice
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit vendor" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Vendor name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vendor name"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Code</label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            className="font-mono"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || !name.trim() || !code.trim()}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function VendorsPage() {
  const vendors = useStore((s) => s.vendors)
  const loading = useStore((s) => s.vendorsLoading)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const createVendor = useStore((s) => s.createVendor)
  const updateVendor = useStore((s) => s.updateVendor)
  const deleteVendor = useStore((s) => s.deleteVendor)

  const [vendorName, setVendorName] = useState('')
  const [vendorCode, setVendorCode] = useState('')
  const [vendorPostback, setVendorPostback] = useState('')
  const [creatingVendor, setCreatingVendor] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [savingUrlId, setSavingUrlId] = useState(null)
  const [search, setSearch] = useState('')
  const [editingVendor, setEditingVendor] = useState(null)

  useEffect(() => {
    fetchVendors({ force: true }).catch(() => {})
  }, [fetchVendors])

  const filtered = search.trim()
    ? vendors.filter((v) => {
        const q = search.toLowerCase()
        return v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q)
      })
    : vendors

  const handleCreateVendor = async (e) => {
    e.preventDefault()
    if (!vendorName.trim() || !vendorCode.trim()) return
    setCreatingVendor(true)
    try {
      await createVendor({
        name: vendorName.trim(),
        code: vendorCode.trim(),
        postbackUrl: vendorPostback.trim() || null,
      })
      setVendorName('')
      setVendorCode('')
      setVendorPostback('')
    } catch {
      // toast in slice
    } finally {
      setCreatingVendor(false)
    }
  }

  const handleToggleVendor = async (vendor) => {
    setTogglingId(vendor.id)
    try {
      await updateVendor(vendor.id, { active: vendor.active === false })
    } catch {
      // toast in slice
    } finally {
      setTogglingId(null)
    }
  }

  const handleSavePostback = async (vendorId, postbackUrl) => {
    setSavingUrlId(vendorId)
    try {
      await updateVendor(vendorId, { postbackUrl })
    } catch {
      // toast in slice
    } finally {
      setSavingUrlId(null)
    }
  }

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('Delete this vendor?')) return
    try {
      await deleteVendor(vendorId)
    } catch {
      // toast in slice
    }
  }

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-header-title">Vendors</h1>
          <p className="page-header-description">
            Manage traffic partners and CPA postback URLs, then assign them on campaign detail pages.
            Placeholders:{' '}
            <code className="font-mono">{'{{click_id}}'}</code>,{' '}
            <code className="font-mono">{'{rcid}'}</code>,{' '}
            <code className="font-mono">{'{{msisdn}}'}</code>,{' '}
            <code className="font-mono">{'{{campid}}'}</code> (vendor),{' '}
            <code className="font-mono">{'{{tracking_campid}}'}</code> (ours).{' '}
            <Link
              to="/docs/callbacks"
              className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
            >
              <BookOpen className="w-3.5 h-3.5" />
              How billing callbacks work
            </Link>
          </p>
        </div>

        <div className="surface-card p-5 mb-6">
          <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add vendor
          </h2>
          <form onSubmit={handleCreateVendor} className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
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
            </div>
            <input
              className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
              placeholder="Postback URL (optional) — https://partner.com/pb?click={{click_id}}&msisdn={{msisdn}}"
              value={vendorPostback}
              onChange={(e) => setVendorPostback(e.target.value)}
            />
          </form>
        </div>

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
            <Input
              type="text"
              placeholder="Search vendors..."
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
              const isActive = vendor.active !== false
              return (
                <div
                  key={vendor.id}
                  className={`surface-card overflow-hidden transition-opacity ${
                    isActive ? '' : 'opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2 px-4 py-3.5">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? 'bg-accent-muted text-accent' : 'bg-bg-muted text-fg-subtle'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-fg truncate">{vendor.name}</p>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-muted'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                        {vendor.postbackUrl ? (
                          <span className="badge badge-muted flex items-center gap-1">
                            <Link2 className="w-3 h-3" />
                            Postback
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-fg-muted mt-0.5">
                        <code className="font-mono">{vendor.code}</code>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2" title={isActive ? 'Deactivate' : 'Activate'}>
                        <span className="hidden sm:inline text-[11px] text-fg-subtle">
                          {isActive ? 'On' : 'Off'}
                        </span>
                        <ActiveSwitch
                          active={isActive}
                          label={isActive ? `Deactivate ${vendor.name}` : `Activate ${vendor.name}`}
                          disabled={togglingId === vendor.id}
                          onToggle={() => handleToggleVendor(vendor)}
                        />
                      </div>
                      <button
                        type="button"
                        className="p-1.5 text-fg-muted hover:text-accent rounded-md hover:bg-accent-muted transition-colors"
                        title="Edit vendor"
                        onClick={() => setEditingVendor(vendor)}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 text-fg-muted hover:text-danger rounded-md hover:bg-danger-muted transition-colors"
                        title="Delete vendor"
                        onClick={() => handleDeleteVendor(vendor.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-border px-4 py-3 bg-bg-muted/20">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle mb-1.5 flex items-center gap-1">
                      <Link2 className="w-3.5 h-3.5" />
                      Postback URL
                    </p>
                    <PostbackUrlField
                      value={vendor.postbackUrl}
                      saving={savingUrlId === vendor.id}
                      placeholder="https://partner.com/postback?click_id={{click_id}}&msisdn={{msisdn}}"
                      onSave={(url) => handleSavePostback(vendor.id, url)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="mt-6 text-xs text-fg-subtle flex items-center gap-1.5">
          <Power className="w-3.5 h-3.5" />
          Inactive vendors stay assigned but show as inactive on campaign tracking links. CPA
          postback fires after billing callback (or confirm) when a URL is set.
        </p>
      </div>

      <EditVendorModal
        isOpen={!!editingVendor}
        vendor={editingVendor}
        onClose={() => setEditingVendor(null)}
        onSave={updateVendor}
      />
    </AppShell>
  )
}

export default memo(VendorsPage)
