import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, Plus, Save, Trash2, Pencil } from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import useStore from '../store/useStore'
import { getCampaignFlow, saveCampaignFlow, PAGE_TYPE_LABELS } from '../services/api/campaigns'

const PAGE_TYPES = ['HOME', 'OTP', 'CONFIRM', 'THANKYOU', 'BLOCKED', 'ERROR']

const VERIFICATION_MODES = [
  { id: 'MSISDN_ONLY', label: 'MSISDN only', hint: 'Resolve number via ISP/header. If it fails, show Error.' },
  { id: 'OTP_ONLY', label: 'OTP only', hint: 'Always verify with OTP. No MSISDN resolution.' },
  { id: 'BOTH', label: 'Both (require both)', hint: 'Resolve number to prefill AND always require OTP.' },
]

const CONDITIONS = [
  'DEFAULT',
  'MSISDN_RESOLVED',
  'MSISDN_UNRESOLVED',
  'OTP_VERIFIED',
  'SUBSCRIBED',
  'BLOCKED',
  'ERROR',
]

function toRfNodes(flowConfig) {
  return (flowConfig?.nodes || []).map((n) => ({
    id: n.id,
    position: n.position || { x: 0, y: 0 },
    data: { label: PAGE_TYPE_LABELS[n.pageType] || n.pageType, pageType: n.pageType },
    style: {
      padding: 10,
      borderRadius: 10,
      border: '1px solid var(--color-border, #d4d4d8)',
      background: '#eff6ff',
      fontWeight: 600,
      fontSize: 13,
      minWidth: 110,
      textAlign: 'center',
    },
  }))
}

function toRfEdges(flowConfig) {
  return (flowConfig?.edges || []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.condition || 'DEFAULT',
    animated: true,
    data: { condition: e.condition || 'DEFAULT' },
  }))
}

const DEFAULT_FLOWS = {
  MSISDN_ONLY: {
    nodes: [
      { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
      { id: 'CONFIRM', pageType: 'CONFIRM', position: { x: 600, y: 160 } },
      { id: 'THANKYOU', pageType: 'THANKYOU', position: { x: 880, y: 100 } },
      { id: 'BLOCKED', pageType: 'BLOCKED', position: { x: 880, y: 240 } },
      { id: 'ERROR', pageType: 'ERROR', position: { x: 880, y: 380 } },
    ],
    edges: [
      { id: 'HOME-MSISDN_RESOLVED-CONFIRM', source: 'HOME', target: 'CONFIRM', condition: 'MSISDN_RESOLVED' },
      { id: 'HOME-MSISDN_UNRESOLVED-ERROR', source: 'HOME', target: 'ERROR', condition: 'MSISDN_UNRESOLVED' },
      { id: 'CONFIRM-SUBSCRIBED-THANKYOU', source: 'CONFIRM', target: 'THANKYOU', condition: 'SUBSCRIBED' },
      { id: 'CONFIRM-BLOCKED-BLOCKED', source: 'CONFIRM', target: 'BLOCKED', condition: 'BLOCKED' },
      { id: 'CONFIRM-ERROR-ERROR', source: 'CONFIRM', target: 'ERROR', condition: 'ERROR' },
    ]
  },
  OTP_ONLY: {
    nodes: [
      { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
      { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
      { id: 'CONFIRM', pageType: 'CONFIRM', position: { x: 600, y: 160 } },
      { id: 'THANKYOU', pageType: 'THANKYOU', position: { x: 880, y: 100 } },
      { id: 'BLOCKED', pageType: 'BLOCKED', position: { x: 880, y: 240 } },
      { id: 'ERROR', pageType: 'ERROR', position: { x: 880, y: 380 } },
    ],
    edges: [
      { id: 'HOME-DEFAULT-OTP', source: 'HOME', target: 'OTP', condition: 'DEFAULT' },
      { id: 'OTP-OTP_VERIFIED-CONFIRM', source: 'OTP', target: 'CONFIRM', condition: 'OTP_VERIFIED' },
      { id: 'CONFIRM-SUBSCRIBED-THANKYOU', source: 'CONFIRM', target: 'THANKYOU', condition: 'SUBSCRIBED' },
      { id: 'CONFIRM-BLOCKED-BLOCKED', source: 'CONFIRM', target: 'BLOCKED', condition: 'BLOCKED' },
      { id: 'CONFIRM-ERROR-ERROR', source: 'CONFIRM', target: 'ERROR', condition: 'ERROR' },
    ]
  },
  BOTH: {
    nodes: [
      { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
      { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
      { id: 'CONFIRM', pageType: 'CONFIRM', position: { x: 600, y: 160 } },
      { id: 'THANKYOU', pageType: 'THANKYOU', position: { x: 880, y: 100 } },
      { id: 'BLOCKED', pageType: 'BLOCKED', position: { x: 880, y: 240 } },
      { id: 'ERROR', pageType: 'ERROR', position: { x: 880, y: 380 } },
    ],
    edges: [
      { id: 'HOME-DEFAULT-OTP', source: 'HOME', target: 'OTP', condition: 'DEFAULT' },
      { id: 'OTP-OTP_VERIFIED-CONFIRM', source: 'OTP', target: 'CONFIRM', condition: 'OTP_VERIFIED' },
      { id: 'CONFIRM-SUBSCRIBED-THANKYOU', source: 'CONFIRM', target: 'THANKYOU', condition: 'SUBSCRIBED' },
      { id: 'CONFIRM-BLOCKED-BLOCKED', source: 'CONFIRM', target: 'BLOCKED', condition: 'BLOCKED' },
      { id: 'CONFIRM-ERROR-ERROR', source: 'CONFIRM', target: 'ERROR', condition: 'ERROR' },
    ]
  }
}

function FlowBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useStore((s) => s.addToast)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [mode, setMode] = useState('BOTH')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState([])

  const handleResetFlow = useCallback((targetMode) => {
    const currentMode = targetMode || mode
    const def = DEFAULT_FLOWS[currentMode]
    setNodes(toRfNodes(def))
    setEdges(toRfEdges(def))
    setErrors([])
    addToast('Flow graph reset to default template', 'success')
  }, [mode, setNodes, setEdges, addToast])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    const def = DEFAULT_FLOWS[newMode]
    setNodes(toRfNodes(def))
    setEdges(toRfEdges(def))
    setErrors([])
  }, [setNodes, setEdges])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCampaignFlow(id)
      .then((res) => {
        if (cancelled) return
        setMode(res.verificationMode || 'BOTH')
        setNodes(toRfNodes(res.flowConfig))
        setEdges(toRfEdges(res.flowConfig))
      })
      .catch((err) => addToast(err.message || 'Failed to load flow', 'error'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id, setNodes, setEdges, addToast])

  const existingPageTypes = useMemo(
    () => new Set(nodes.map((n) => n.data.pageType)),
    [nodes],
  )

  const onConnect = useCallback(
    (connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `${connection.source}-DEFAULT-${connection.target}-${Date.now()}`,
            label: 'DEFAULT',
            animated: true,
            data: { condition: 'DEFAULT' },
          },
          eds,
        ),
      ),
    [setEdges],
  )

  const addNode = useCallback(
    (pageType) => {
      if (existingPageTypes.has(pageType)) return
      const offset = nodes.length * 30
      setNodes((nds) => [
        ...nds,
        {
          id: pageType,
          position: { x: 120 + offset, y: 120 + offset },
          data: { label: PAGE_TYPE_LABELS[pageType] || pageType, pageType },
          style: {
            padding: 10,
            borderRadius: 10,
            border: '1px solid #d4d4d8',
            background: '#eff6ff',
            fontWeight: 600,
            fontSize: 13,
            minWidth: 110,
            textAlign: 'center',
          },
        },
      ])
    },
    [existingPageTypes, nodes.length, setNodes],
  )

  const removeNode = useCallback(
    (nodeId) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    },
    [setNodes, setEdges],
  )

  const setEdgeCondition = useCallback(
    (edgeId, condition) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId ? { ...e, label: condition, data: { ...e.data, condition } } : e,
        ),
      )
    },
    [setEdges],
  )

  const removeEdge = useCallback(
    (edgeId) => setEdges((eds) => eds.filter((e) => e.id !== edgeId)),
    [setEdges],
  )

  const handleSave = useCallback(async () => {
    // ---- Client-side validation ----
    const clientErrors = []
    const pageTypes = new Set(nodes.map((n) => n.data.pageType))

    if (!pageTypes.has('HOME')) clientErrors.push('HOME page node is required.')
    if (!pageTypes.has('CONFIRM')) clientErrors.push('CONFIRM page node is required.')
    if ((mode === 'OTP_ONLY' || mode === 'BOTH') && !pageTypes.has('OTP')) {
      clientErrors.push(`Verification mode "${mode}" requires an OTP page node.`)
    }

    // Warn about orphan nodes (not reachable from HOME) — backend will auto-strip them
    const homeNode = nodes.find((n) => n.data.pageType === 'HOME')
    if (homeNode) {
      const reachable = new Set([homeNode.id])
      let changed = true
      while (changed) {
        changed = false
        for (const e of edges) {
          if (reachable.has(e.source) && !reachable.has(e.target)) {
            reachable.add(e.target)
            changed = true
          }
        }
      }
      const orphans = nodes.filter((n) => !reachable.has(n.id))
      if (orphans.length > 0) {
        const labels = orphans.map((n) => n.data.label).join(', ')
        clientErrors.push(
          `Note: "${labels}" node(s) are not connected to the flow and will be removed on save.`,
        )
      }
    }

    // If there are hard errors (not just notes), block saving
    const hardErrors = clientErrors.filter((e) => !e.startsWith('Note:'))
    if (hardErrors.length > 0) {
      setErrors(hardErrors)
      return
    }

    const flowConfig = {
      version: 1,
      nodes: nodes.map((n) => ({
        id: n.id,
        pageType: n.data.pageType,
        position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        condition: e.data?.condition || 'DEFAULT',
      })),
    }
    setSaving(true)
    setErrors(clientErrors) // show any "Note:" warnings during save
    try {
      await saveCampaignFlow(id, { verificationMode: mode, flowConfig })
      addToast('Flow saved', 'success')
      setErrors([])
    } catch (err) {
      const msg = err.message || 'Failed to save flow'
      setErrors([msg])
      addToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }, [id, mode, nodes, edges, addToast])

  const nodeLabel = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId)
    return node ? node.data.label : nodeId
  }

  return (
    <AppShell>
      <div className="page-container">
        <button
          type="button"
          onClick={() => navigate(`/campaigns/${id}`)}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to campaign
        </button>

        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-header-title">Flow builder</h1>
            <p className="page-header-description">
              Drag page nodes, connect them, and set the condition on each connection.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || loading}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save flow'}
          </Button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 space-y-2">
            {errors.map((e, i) =>
              e.startsWith('Note:') ? (
                <div
                  key={i}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                  ⚠️ {e.replace(/^Note:\s*/, '')}
                </div>
              ) : (
                <div
                  key={i}
                  className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
                >
                  {e}
                </div>
              ),
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 surface-card overflow-hidden" style={{ height: '65vh' }}>
            {loading ? (
              <div className="flex items-center justify-center h-full text-sm text-fg-muted">
                Loading flow...
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
              >
                <Background />
                <Controls />
                <MiniMap pannable zoomable />
              </ReactFlow>
            )}
          </div>

          <div className="space-y-4">
            <div className="surface-card p-4">
              <h3 className="text-sm font-semibold text-fg mb-3">Verification mode</h3>
              <div className="space-y-2">
                {VERIFICATION_MODES.map((m) => (
                  <label
                    key={m.id}
                    className={`block rounded-lg border p-2.5 cursor-pointer transition-colors ${
                      mode === m.id ? 'border-accent bg-accent-muted' : 'border-border hover:bg-bg-subtle'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-fg">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === m.id}
                        onChange={() => handleModeChange(m.id)}
                      />
                      {m.label}
                    </span>
                    <span className="block text-xs text-fg-muted mt-1 pl-6">{m.hint}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="w-full mt-3 inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-dashed border-border hover:border-fg-muted rounded-md text-xs font-medium text-fg-muted hover:text-fg transition-colors"
                onClick={() => handleResetFlow()}
              >
                Reset layout to default
              </button>
            </div>

            <div className="surface-card p-4">
              <h3 className="text-sm font-semibold text-fg mb-3">Add page node</h3>
              <div className="flex flex-wrap gap-2">
                {PAGE_TYPES.map((pt) => (
                  <Button
                    key={pt}
                    variant="outline"
                    size="sm"
                    disabled={existingPageTypes.has(pt)}
                    onClick={() => addNode(pt)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {PAGE_TYPE_LABELS[pt] || pt}
                  </Button>
                ))}
              </div>
            </div>

            <div className="surface-card p-4">
              <h3 className="text-sm font-semibold text-fg mb-3">Pages</h3>
              <div className="space-y-1.5">
                {nodes.map((n) => (
                  <div key={n.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-fg">{n.data.label}</span>
                    <span className="flex items-center gap-1">
                      <Link to={`/campaigns/${id}/edit/${n.data.pageType}`} title="Edit content">
                        <Button variant="ghost" size="sm">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => removeNode(n.id)} title="Remove node">
                        <Trash2 className="w-3.5 h-3.5 text-danger" />
                      </Button>
                    </span>
                  </div>
                ))}
                {nodes.length === 0 && <p className="text-xs text-fg-muted">No pages yet.</p>}
              </div>
            </div>

            <div className="surface-card p-4">
              <h3 className="text-sm font-semibold text-fg mb-3">Connections</h3>
              <div className="space-y-2">
                {edges.map((e) => (
                  <div key={e.id} className="rounded-lg border border-border p-2">
                    <div className="flex items-center justify-between text-xs text-fg-muted mb-1.5">
                      <span>
                        {nodeLabel(e.source)} → {nodeLabel(e.target)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEdge(e.id)}
                        className="text-danger hover:opacity-70"
                        title="Delete connection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <select
                      className="w-full text-xs border border-border rounded-md px-2 py-1 bg-bg-base"
                      value={e.data?.condition || 'DEFAULT'}
                      onChange={(ev) => setEdgeCondition(e.id, ev.target.value)}
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {edges.length === 0 && (
                  <p className="text-xs text-fg-muted">
                    Drag from one node to another to create a connection.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default memo(FlowBuilderPage)
