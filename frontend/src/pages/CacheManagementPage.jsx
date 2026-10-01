import { memo, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Database,
  Trash2,
  RefreshCw,
  Zap,
  Layers,
  ShieldAlert,
  Server,
  Clock,
  HardDrive,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Key,
  Activity,
  Flame,
  UserCog,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Modal from '../components/common/Modal'
import useStore from '../store/useStore'
import {
  getCacheStats,
  clearCache,
  listCacheKeys,
  deleteCacheKey,
} from '../services/api/admin'

const PRESET_SCOPES = [
  {
    id: 'flow',
    title: 'Flow & Campaign Funnels',
    pattern: 'flow:*',
    description:
      'Purges cached campaign structures, page layouts, flow routing rules, and API client configurations.',
    icon: Layers,
    badge: 'badge-info',
    color: 'text-info',
    bg: 'bg-info-muted/30 border-info/30',
  },
  {
    id: 'campaign',
    title: 'Campaign Entity Cache',
    pattern: 'flow:campaign:* & campaign:*',
    description:
      'Invalidates cached campaign records, tracking slugs, and market associations.',
    icon: Zap,
    badge: 'badge-success',
    color: 'text-success',
    bg: 'bg-success-muted/30 border-success/30',
  },
  {
    id: 'detection',
    title: 'Carrier & Detect Sessions',
    pattern: 'flow:detect:* / orange_bf:* / universe_dcb:*',
    description:
      'Clears operator MSISDN detection headers, IP-to-carrier bindings, and active gateway sessions.',
    icon: Activity,
    badge: 'badge-warning',
    color: 'text-warning',
    bg: 'bg-warning-muted/30 border-warning/30',
  },
  {
    id: 'otp',
    title: 'OTP Pendings & Throttle',
    pattern: 'otp:*',
    description:
      'Resets temporary SMS/OTP verification attempts, rate-limiting windows, and pending subscriber codes.',
    icon: Key,
    badge: 'badge-muted',
    color: 'text-fg-muted',
    bg: 'bg-bg-muted/50 border-border',
  },
]

function CacheManagementPage() {
  const addToast = useStore((s) => s.addToast)

  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [purgingScope, setPurgingScope] = useState(null)

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    scope: '',
    title: '',
    description: '',
    pattern: '',
    destructive: false,
  })

  // Key Inspector state
  const [scanPattern, setScanPattern] = useState('*')
  const [keysList, setKeysList] = useState([])
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [deletingKey, setDeletingKey] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)

  // Session activity log
  const [activityLogs, setActivityLogs] = useState([])

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const data = await getCacheStats()
      setStats(data)
    } catch (err) {
      addToast(err.message || 'Failed to fetch Redis cache stats', 'error')
    } finally {
      setLoadingStats(false)
    }
  }, [addToast])

  const loadKeys = useCallback(
    async (pattern = scanPattern) => {
      setLoadingKeys(true)
      try {
        const res = await listCacheKeys({ pattern: pattern.trim() || '*', limit: 100 })
        setKeysList(res?.keys || [])
      } catch (err) {
        addToast(err.message || 'Failed to inspect cache keys', 'error')
      } finally {
        setLoadingKeys(false)
      }
    },
    [scanPattern, addToast]
  )

  useEffect(() => {
    loadStats()
    loadKeys('*')
  }, [loadStats, loadKeys])

  const logActivity = (scope, message, deletedCount, success = true) => {
    const entry = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      scope,
      message,
      deletedCount,
      success,
    }
    setActivityLogs((prev) => [entry, ...prev.slice(0, 19)])
  }

  const promptClear = (scopeObj) => {
    if (scopeObj.id === 'all') {
      setConfirmModal({
        isOpen: true,
        scope: 'all',
        title: 'Flush All Redis Cache',
        description:
          'This will execute FLUSHDB on Redis. All cached flow configurations, active visitor attribution, detection state, and campaign pages will be removed immediately. The system will fall back to live database queries until cache repopulates.',
        pattern: '*',
        destructive: true,
      })
    } else {
      setConfirmModal({
        isOpen: true,
        scope: scopeObj.id,
        title: `Purge ${scopeObj.title}`,
        description: `This will delete all keys matching ${scopeObj.pattern}. ${scopeObj.description}`,
        pattern: scopeObj.pattern,
        destructive: false,
      })
    }
  }

  const executeClear = async () => {
    const { scope, pattern } = confirmModal
    setConfirmModal((prev) => ({ ...prev, isOpen: false }))
    setPurgingScope(scope)

    try {
      const res = await clearCache({ scope, pattern })
      const count =
        res.deletedCount === -1 ? 'all' : res.deletedCount != null ? res.deletedCount : 'targeted'
      addToast(res.message || `Successfully purged cache for ${scope}`, 'success')
      logActivity(scope, res.message, count, true)
      await Promise.all([loadStats(), loadKeys()])
    } catch (err) {
      addToast(err.message || `Failed to purge cache for ${scope}`, 'error')
      logActivity(scope, err.message, 0, false)
    } finally {
      setPurgingScope(null)
    }
  }

  const handleCustomPurge = (e) => {
    e.preventDefault()
    if (!scanPattern.trim()) return

    setConfirmModal({
      isOpen: true,
      scope: 'custom',
      title: `Purge Custom Pattern: ${scanPattern.trim()}`,
      description: `Are you sure you want to delete all cache keys matching the pattern "${scanPattern.trim()}"? This action cannot be undone.`,
      pattern: scanPattern.trim(),
      destructive: scanPattern.trim() === '*',
    })
  }

  const handleDeleteSingleKey = async (key) => {
    setDeletingKey(key)
    try {
      await deleteCacheKey(key)
      addToast(`Deleted key: ${key}`, 'success')
      logActivity('single-key', `Deleted key ${key}`, 1, true)
      setKeysList((prev) => prev.filter((item) => item.key !== key))
      loadStats()
    } catch (err) {
      addToast(err.message || 'Failed to delete key', 'error')
      logActivity('single-key', err.message, 0, false)
    } finally {
      setDeletingKey(null)
    }
  }

  const handleCopyKey = (key) => {
    navigator.clipboard?.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  const isConnected = stats?.connected === true

  return (
    <AppShell>
      <div className="page-container">
        {/* Navigation Breadcrumb / Admin Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-6">
          <div className="flex items-center gap-2">
            <Link
              to="/users"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-fg-muted hover:text-fg hover:bg-bg-muted transition-colors inline-flex items-center gap-1.5"
            >
              <UserCog className="w-4 h-4" />
              Users
            </Link>
            <span className="text-fg-subtle">/</span>
            <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent text-accent-fg inline-flex items-center gap-1.5 shadow-sm">
              <Database className="w-4 h-4" />
              Redis Cache
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadStats()
                loadKeys()
              }}
              disabled={loadingStats || loadingKeys}
              className="gap-1.5 text-xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingStats || loadingKeys ? 'animate-spin' : ''}`}
              />
              Refresh Stats
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => promptClear({ id: 'all', title: 'Entire Database' })}
              disabled={!isConnected || purgingScope === 'all'}
              className="gap-1.5 text-xs"
            >
              <Flame className="w-3.5 h-3.5" />
              Flush All Cache
            </Button>
          </div>
        </div>

        {/* Page Header */}
        <div className="page-header mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="page-header-title flex items-center gap-2.5">
                <Database className="w-6 h-6 text-accent" />
                Redis Cache Management
              </h1>
              <p className="page-header-description">
                Monitor memory usage, inspect active keys, and purge cache across campaign flows,
                carrier detection, and temporary sessions.
              </p>
            </div>
            {isConnected ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success-muted border border-success/30 text-success-fg text-xs font-medium self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Redis Connected ({stats?.host}:{stats?.port})
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-danger-muted border border-danger/30 text-danger-fg text-xs font-medium self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-danger" />
                Redis Offline / Fallback Mode
              </div>
            )}
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Connection & Status */}
          <div className="surface-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-fg-muted mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Engine Status</span>
              <Server className="w-4 h-4 text-accent" />
            </div>
            <div>
              <div className="text-xl font-bold text-fg flex items-center gap-2">
                {isConnected ? 'Active & Ready' : 'Disconnected'}
              </div>
              <p className="text-xs text-fg-muted mt-1">
                {stats?.host ? `${stats.host}:${stats.port}` : 'Redis 127.0.0.1:6379'}
              </p>
            </div>
          </div>

          {/* Card 2: Total Keys */}
          <div className="surface-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-fg-muted mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Stored Keys</span>
              <Key className="w-4 h-4 text-info" />
            </div>
            <div>
              <div className="text-xl font-bold text-fg">
                {loadingStats ? (
                  <span className="animate-pulse">Loading…</span>
                ) : (
                  (stats?.totalKeys ?? 0).toLocaleString()
                )}
              </div>
              <p className="text-xs text-fg-muted mt-1">Active in default DB</p>
            </div>
          </div>

          {/* Card 3: Memory Used */}
          <div className="surface-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-fg-muted mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Memory Allocation</span>
              <HardDrive className="w-4 h-4 text-warning" />
            </div>
            <div>
              <div className="text-xl font-bold text-fg">
                {loadingStats ? (
                  <span className="animate-pulse">Loading…</span>
                ) : (
                  stats?.memoryHuman || 'N/A'
                )}
              </div>
              <p className="text-xs text-fg-muted mt-1">Resident Redis memory</p>
            </div>
          </div>

          {/* Card 4: Version & Uptime */}
          <div className="surface-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-fg-muted mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Engine Version / Uptime</span>
              <Clock className="w-4 h-4 text-success" />
            </div>
            <div>
              <div className="text-xl font-bold text-fg">
                v{stats?.redisVersion && stats.redisVersion !== 'N/A' ? stats.redisVersion : '7.x'}
              </div>
              <p className="text-xs text-fg-muted mt-1">
                Uptime: {stats?.uptimeDays ? `${stats.uptimeDays} days` : 'Active'}
              </p>
            </div>
          </div>
        </div>

        {/* Warning if offline */}
        {!isConnected && !loadingStats && (
          <div className="mb-6 p-4 rounded-xl border border-warning/30 bg-warning-muted text-warning-fg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Redis Server is currently unreachable or disabled.</p>
              <p className="text-xs mt-1 opacity-90">
                The application is operating in fallback mode (direct PostgreSQL queries). Purge
                operations will be enabled automatically as soon as Redis connects.
              </p>
            </div>
          </div>
        )}

        {/* Preset Scoped Purge Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-fg">Scoped Cache Purging</h2>
              <p className="text-xs text-fg-muted">
                Clear targeted subsets of cached keys without flushing unrelated sessions or analytics.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRESET_SCOPES.map((scope) => {
              const Icon = scope.icon
              const isPurgingThis = purgingScope === scope.id
              const count = stats?.groups?.[scope.id] ?? 0

              return (
                <div
                  key={scope.id}
                  className="surface-card p-5 flex flex-col justify-between hover:border-border-strong transition-all duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${scope.bg}`}>
                          <Icon className={`w-4 h-4 ${scope.color}`} />
                        </div>
                        <h3 className="text-sm font-semibold text-fg">{scope.title}</h3>
                      </div>
                      <span className="text-xs font-mono text-fg-muted bg-bg-muted px-2 py-0.5 rounded border border-border">
                        ~{count} keys
                      </span>
                    </div>

                    <p className="text-xs text-fg-muted mb-3 leading-relaxed">
                      {scope.description}
                    </p>

                    <div className="bg-bg-elevated border border-border rounded px-2.5 py-1 text-[11px] font-mono text-fg-subtle truncate mb-4">
                      Pattern: {scope.pattern}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-[11px] text-fg-subtle">Fast cache rebuild</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => promptClear(scope)}
                      disabled={!isConnected || isPurgingThis}
                      className="text-xs gap-1.5"
                    >
                      <Trash2
                        className={`w-3.5 h-3.5 text-danger ${isPurgingThis ? 'animate-spin' : ''}`}
                      />
                      {isPurgingThis ? 'Purging…' : 'Purge Scope'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Custom Pattern Purge & Live Key Inspector */}
        <div className="surface-card p-5 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-fg flex items-center gap-2">
                <Search className="w-4 h-4 text-accent" />
                Cache Key Inspector & Custom Pattern Purge
              </h2>
              <p className="text-xs text-fg-muted">
                Scan Redis keys matching a pattern, inspect TTL expiration, or wipe custom key ranges.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-fg-muted">Quick filters:</span>
              {['flow:*', 'flow:campaign:*', 'orange_bf:*', 'otp:*', '*'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setScanPattern(p)
                    loadKeys(p)
                  }}
                  className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-colors ${
                    scanPattern === p
                      ? 'bg-accent text-accent-fg border-accent'
                      : 'bg-bg-elevated text-fg-muted border-border hover:border-border-strong hover:text-fg'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Pattern input form */}
          <form onSubmit={handleCustomPurge} className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
              <input
                type="text"
                value={scanPattern}
                onChange={(e) => setScanPattern(e.target.value)}
                placeholder="Key pattern (e.g. flow:*, campaign:12, otp:*)"
                className="w-full bg-bg-elevated border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-fg font-mono placeholder:text-fg-subtle focus:border-border-focus focus:ring-2 focus:ring-ring outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => loadKeys(scanPattern)}
                disabled={loadingKeys || !isConnected}
                className="gap-1.5 text-xs shrink-0"
              >
                <Search className={`w-3.5 h-3.5 ${loadingKeys ? 'animate-spin' : ''}`} />
                {loadingKeys ? 'Scanning…' : 'Scan Keys'}
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="md"
                disabled={!isConnected || purgingScope === 'custom' || !scanPattern.trim()}
                className="gap-1.5 text-xs shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Purge Pattern
              </Button>
            </div>
          </form>

          {/* Keys list table */}
          <div className="border border-border rounded-lg overflow-hidden bg-bg-elevated">
            <div className="px-4 py-2.5 bg-bg-muted border-b border-border flex items-center justify-between text-xs text-fg-muted font-medium">
              <span>Matching Keys ({keysList.length} shown)</span>
              <span>Showing sample up to 100 entries</span>
            </div>

            {loadingKeys ? (
              <div className="p-8 text-center text-fg-muted text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                Scanning Redis database keys…
              </div>
            ) : keysList.length === 0 ? (
              <div className="p-8 text-center text-fg-muted text-xs">
                No keys found matching pattern &ldquo;{scanPattern}&rdquo;
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {keysList.map(({ key, ttl, type }) => (
                  <div
                    key={key}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-bg-subtle transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg-muted text-fg-muted border border-border uppercase shrink-0">
                        {type}
                      </span>
                      <span className="font-mono text-fg truncate select-all">{key}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyKey(key)}
                        title="Copy key"
                        className="text-fg-subtle hover:text-fg transition-colors p-1 rounded"
                      >
                        {copiedKey === key ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[11px] font-mono ${
                          ttl === -1
                            ? 'text-fg-subtle'
                            : ttl < 60
                              ? 'text-warning font-semibold'
                              : 'text-fg-muted'
                        }`}
                      >
                        {ttl === -1 ? 'no expiry' : `${ttl}s TTL`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingleKey(key)}
                        disabled={deletingKey === key}
                        title="Delete key"
                        className="p-1 rounded text-fg-subtle hover:text-danger hover:bg-danger-muted transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Log */}
        {activityLogs.length > 0 && (
          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              Session Purge Activity Log
            </h3>
            <div className="space-y-2">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-bg-elevated border border-border"
                >
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                    )}
                    <span className="font-mono font-medium text-fg uppercase">[{log.scope}]</span>
                    <span className="text-fg-muted">{log.message}</span>
                  </div>
                  <div className="flex items-center gap-3 text-fg-subtle font-mono text-[11px]">
                    {log.deletedCount !== undefined && log.deletedCount !== 0 && (
                      <span className="text-accent font-semibold">{log.deletedCount} removed</span>
                    )}
                    <span>{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-bg-muted border border-border">
            <ShieldAlert
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                confirmModal.destructive ? 'text-danger' : 'text-warning'
              }`}
            />
            <div className="text-xs text-fg leading-relaxed">
              <p className="font-medium text-sm mb-1">{confirmModal.title}</p>
              <p className="text-fg-muted">{confirmModal.description}</p>
            </div>
          </div>

          <div className="text-xs text-fg-subtle bg-bg-canvas/50 p-2.5 rounded font-mono break-all">
            Target Pattern: <span className="text-fg font-semibold">{confirmModal.pattern}</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              variant={confirmModal.destructive ? 'danger' : 'primary'}
              size="sm"
              onClick={executeClear}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Confirm & Purge Cache
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}

export default memo(CacheManagementPage)
