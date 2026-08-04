import { memo, useEffect, useState } from 'react'
import {
  Plus,
  Search,
  Shield,
  UserCog,
  KeyRound,
  Ban,
  PauseCircle,
  CheckCircle2,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import useStore from '../store/useStore'
import {
  listUsers,
  createUser,
  updateUser,
  setUserStatus,
} from '../services/api/users'
import { useAuth } from '../context/AuthContext'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', badge: 'badge-success' },
  { value: 'inactive', label: 'Inactive', badge: 'badge-muted' },
  { value: 'suspended', label: 'Suspended', badge: 'badge-danger' },
]

function statusMeta(status) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0]
}

function UsersPage() {
  const addToast = useStore((s) => s.addToast)
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await listUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      addToast(err.message || 'Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = search.trim()
    ? users.filter((u) => {
        const q = search.toLowerCase()
        return (
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.status || '').toLowerCase().includes(q)
        )
      })
    : users

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) return
    setCreating(true)
    try {
      await createUser({
        name: name.trim(),
        email: email.trim(),
        password,
      })
      setName('')
      setEmail('')
      setPassword('')
      addToast('User created', 'success')
      await loadUsers()
    } catch (err) {
      addToast(err.message || 'Failed to create user', 'error')
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (u) => {
    setEditId(u.id)
    setEditName(u.name || '')
    setEditEmail(u.email || '')
    setEditPassword('')
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditName('')
    setEditEmail('')
    setEditPassword('')
  }

  const handleSaveEdit = async (u) => {
    setSavingId(u.id)
    try {
      const payload = {
        name: editName.trim(),
        email: editEmail.trim(),
      }
      if (editPassword.trim()) {
        payload.password = editPassword.trim()
      }
      await updateUser(u.id, payload)
      addToast('User updated', 'success')
      cancelEdit()
      await loadUsers()
    } catch (err) {
      addToast(err.message || 'Failed to update user', 'error')
    } finally {
      setSavingId(null)
    }
  }

  const handleStatus = async (u, status) => {
    if (u.role === 'admin') {
      addToast('Cannot change admin status', 'error')
      return
    }
    setSavingId(u.id)
    try {
      await setUserStatus(u.id, status)
      addToast(`User marked ${status}`, 'success')
      await loadUsers()
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-header-title">User Management</h1>
          <p className="page-header-description">
            Create users, set email/password, and suspend or deactivate accounts.
            Only <span className="font-medium text-fg">{currentUser?.email}</span> has admin access.
          </p>
        </div>

        <div className="surface-card p-5 mb-6">
          <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create user
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                type="email"
                className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                className="sm:w-44 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <Button type="submit" variant="primary" size="sm" disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </div>

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
            <Input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="surface-card p-12 text-center text-fg-muted text-sm">
            Loading users...
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              title={search ? 'No users found' : 'No users yet'}
              description="Create a user to give them dashboard access"
              action={
                !search && (
                  <div className="flex justify-center">
                    <UserCog className="w-8 h-8 text-fg-subtle" />
                  </div>
                )
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => {
              const meta = statusMeta(u.status || 'active')
              const isAdmin = u.role === 'admin'
              const editing = editId === u.id
              const busy = savingId === u.id

              return (
                <div
                  key={u.id}
                  className={`surface-card overflow-hidden ${
                    u.status === 'active' ? '' : 'opacity-80'
                  }`}
                >
                  <div className="flex flex-col gap-3 px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isAdmin
                            ? 'bg-accent-muted text-accent'
                            : 'bg-bg-muted text-fg-subtle'
                        }`}
                      >
                        {isAdmin ? (
                          <Shield className="w-4 h-4" />
                        ) : (
                          <UserCog className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {editing ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Name"
                              />
                              <input
                                type="email"
                                className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="Email"
                                disabled={isAdmin}
                              />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="password"
                                className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                placeholder="New password (optional)"
                                minLength={6}
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => handleSaveEdit(u)}
                                >
                                  {busy ? 'Saving…' : 'Save'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={busy}
                                  onClick={cancelEdit}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-fg truncate">
                                {u.name}
                              </p>
                              <span className={`badge ${meta.badge}`}>{meta.label}</span>
                              {isAdmin && (
                                <span className="badge badge-muted flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-fg-muted mt-0.5 truncate">
                              {u.email}
                            </p>
                          </>
                        )}
                      </div>

                      {!editing && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(u)}
                            title="Edit email / password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>

                    {!editing && !isAdmin && (
                      <div className="flex flex-wrap gap-2 pl-12">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy || u.status === 'active'}
                          onClick={() => handleStatus(u, 'active')}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Activate
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy || u.status === 'inactive'}
                          onClick={() => handleStatus(u, 'inactive')}
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          Inactive
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy || u.status === 'suspended'}
                          onClick={() => handleStatus(u, 'suspended')}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Suspend
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default memo(UsersPage)
