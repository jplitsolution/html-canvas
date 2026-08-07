import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, Link2, Plus, Save, Trash2, Pencil } from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import PageNode from '../components/flow/PageNode'
import {
  conditionLabel,
  getDefaultCondition,
  getValidConditions,
} from '../components/flow/flowConditions'
import {
  VERIFICATION_MODES,
  DEFAULT_FLOWS,
  normalizeModeId,
} from '../components/flow/verificationModes'
import useStore from '../store/useStore'
import { PAGE_TYPE_LABELS } from '../services/api/campaigns'
import {
  campaignDetailPath,
  campaignEditPath,
  resolveMarketCodes,
} from '../utils/routes'

const nodeTypes = { pageNode: PageNode }

const PAGE_TYPES = [
  'HOME',
  'OTP',
  'CONFIRM',
  'THANKYOU',
  'INPROGRESS',
  'LOW_BALANCE',
  'BLOCKED',
  'ERROR',
]

function toRfNodes(flowConfig) {
  return (flowConfig?.nodes || []).map((n) => ({
    id: n.id,
    type: 'pageNode',
    position: n.position || { x: 0, y: 0 },
    data: { label: PAGE_TYPE_LABELS[n.pageType] || n.pageType, pageType: n.pageType },
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

/**
 * LEGACY admin UI for drag-drop flowConfig editing.
 *
 * Option A cleanup: primary nav no longer links here; `/…/flow` redirects to
 * Campaign Detail (mode picker + read-only path). File kept for rollback /
 * power-user re-enable — do not delete without a separate decision.
 *
 * Runtime still uses verificationMode + flowConfig via flow-engine on
 * SUBSCRIBE/CONFIRM transitions. Mode defaults live in verificationModes.js.
 */
function FlowBuilderPage() {
  const { id, countryCode: routeCountry, operatorCode: routeOperator } = useParams()
  const navigate = useNavigate()
  const campaign = useStore((s) => s.campaign)
  const addToast = useStore((s) => s.addToast)
  const loadCampaignFlow = useStore((s) => s.loadCampaignFlow)
  const saveCampaignFlow = useStore((s) => s.saveCampaignFlow)
  const loadCampaign = useStore((s) => s.loadCampaign)

  const { countryCode, operatorCode } = resolveMarketCodes(
    { countryCode: routeCountry, operatorCode: routeOperator },
    campaign,
  )
  const detailHref = campaignDetailPath(countryCode, operatorCode, id)

  useEffect(() => {
    if (id) loadCampaign(id)
  }, [id, loadCampaign])

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [mode, setMode] = useState('BOTH')
  const [entryPage, setEntryPage] = useState('HOME')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState([])
  const [newConnSource, setNewConnSource] = useState('')
  const [newConnTarget, setNewConnTarget] = useState('')
  const [newConnCondition, setNewConnCondition] = useState('DEFAULT')
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  const handleResetFlow = useCallback((targetMode) => {
    const currentMode = targetMode || mode
    const def = DEFAULT_FLOWS[currentMode]
    setNodes(toRfNodes(def))
    setEdges(toRfEdges(def))
    setEntryPage(def.entryPage || 'HOME')
    setErrors([])
    addToast('Flow graph reset to default template', 'success')
  }, [mode, setNodes, setEdges, addToast])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    const def = DEFAULT_FLOWS[newMode]
    setNodes(toRfNodes(def))
    setEdges(toRfEdges(def))
    setEntryPage(def.entryPage || 'HOME')
    setErrors([])
  }, [setNodes, setEdges])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadCampaignFlow(id)
      .then((res) => {
        if (cancelled) return
        setMode(normalizeModeId(res.verificationMode))
        setEntryPage(res.flowConfig?.entryPage || 'HOME')
        setNodes(toRfNodes(res.flowConfig))
        setEdges(toRfEdges(res.flowConfig))
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id, setNodes, setEdges, loadCampaignFlow])

  const existingPageTypes = useMemo(
    () => new Set(nodes.map((n) => n.data.pageType)),
    [nodes],
  )

  const onConnect = useCallback(
    (connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const sourcePageType = sourceNode?.data?.pageType || connection.source
      const condition = getDefaultCondition(sourcePageType, mode)

      setEdges((eds) => {
        const duplicate = eds.some(
          (e) =>
            e.source === connection.source &&
            e.target === connection.target &&
            (e.data?.condition || 'DEFAULT') === condition,
        )
        if (duplicate) {
          addToast('This connection already exists', 'error')
          return eds
        }
        return addEdge(
          {
            ...connection,
            id: `${connection.source}-${condition}-${connection.target}-${Date.now()}`,
            label: condition,
            animated: true,
            data: { condition },
          },
          eds,
        )
      })
    },
    [setEdges, nodes, mode, addToast],
  )

  const addNode = useCallback(
    (pageType) => {
      if (existingPageTypes.has(pageType)) return
      const offset = nodes.length * 30
      setNodes((nds) => [
        ...nds,
        {
          id: pageType,
          type: 'pageNode',
          position: { x: 120 + offset, y: 120 + offset },
          data: { label: PAGE_TYPE_LABELS[pageType] || pageType, pageType },
        },
      ])
    },
    [existingPageTypes, nodes.length, setNodes],
  )

  const removeNode = useCallback(
    (nodeId) => {
      const removed = nodes.find((n) => n.id === nodeId)
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
      setSelectedNodeId((prev) => (prev === nodeId ? null : prev))
      if (removed?.data?.pageType === entryPage) {
        const remaining = nodes.filter((n) => n.id !== nodeId)
        setEntryPage(remaining[0]?.data?.pageType || 'HOME')
      }
      addToast('Page removed from flow', 'success')
    },
    [setNodes, setEdges, addToast, nodes, entryPage],
  )

  const editNode = useCallback(
    (pageType) => {
      navigate(campaignEditPath(countryCode, operatorCode, id, pageType))
    },
    [id, navigate, countryCode, operatorCode],
  )

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
        data: {
          ...n.data,
          isEntry: n.data.pageType === entryPage,
          onEdit: () => editNode(n.data.pageType),
          onDelete: () => removeNode(n.id),
        },
      })),
    [nodes, selectedNodeId, entryPage, editNode, removeNode],
  )

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
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

  const newConnSourcePageType = useMemo(() => {
    const node = nodes.find((n) => n.id === newConnSource)
    return node?.data?.pageType || ''
  }, [nodes, newConnSource])

  const newConnConditionOptions = useMemo(
    () => getValidConditions(newConnSourcePageType, mode),
    [newConnSourcePageType, mode],
  )

  useEffect(() => {
    if (!newConnSourcePageType) return
    const defaultCondition = getDefaultCondition(newConnSourcePageType, mode)
    setNewConnCondition(defaultCondition)
  }, [newConnSourcePageType, mode])

  const addConnection = useCallback(() => {
    if (!newConnSource || !newConnTarget) {
      addToast('Select both From and To pages', 'error')
      return
    }
    if (newConnSource === newConnTarget) {
      addToast('From and To must be different pages', 'error')
      return
    }

    const condition = newConnCondition || getDefaultCondition(newConnSourcePageType, mode)
    const duplicate = edges.some(
      (e) =>
        e.source === newConnSource &&
        e.target === newConnTarget &&
        (e.data?.condition || 'DEFAULT') === condition,
    )
    if (duplicate) {
      addToast('This connection already exists', 'error')
      return
    }

    setEdges((eds) => [
      ...eds,
      {
        id: `${newConnSource}-${condition}-${newConnTarget}-${Date.now()}`,
        source: newConnSource,
        target: newConnTarget,
        label: condition,
        animated: true,
        data: { condition },
      },
    ])
    addToast('Connection added', 'success')
  }, [
    newConnSource,
    newConnTarget,
    newConnCondition,
    newConnSourcePageType,
    mode,
    edges,
    setEdges,
    addToast,
  ])

  const onNodesDelete = useCallback(
    (deleted) => {
      const ids = new Set(deleted.map((n) => n.id))
      setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)))
      setSelectedNodeId(null)
      addToast('Page removed from flow', 'success')
    },
    [setEdges, addToast],
  )

  const getEdgeConditionOptions = useCallback(
    (sourceId, currentCondition) => {
      const sourceNode = nodes.find((n) => n.id === sourceId)
      const valid = getValidConditions(sourceNode?.data?.pageType || sourceId, mode)
      if (currentCondition && !valid.includes(currentCondition)) {
        return [currentCondition, ...valid]
      }
      return valid
    },
    [nodes, mode],
  )

  const handleSave = useCallback(async () => {
    const clientErrors = []
    const pageTypes = new Set(nodes.map((n) => n.data.pageType))

    if (!pageTypes.has(entryPage)) {
      clientErrors.push(`Start page "${PAGE_TYPE_LABELS[entryPage] || entryPage}" must be in the flow.`)
    }
    if ((mode === 'OTP_ONLY' || mode === 'BOTH') && !pageTypes.has('OTP')) {
      clientErrors.push(`Verification mode "${mode}" requires an OTP page node.`)
    }

    const entryNode = nodes.find((n) => n.data.pageType === entryPage)
    if (entryNode) {
      const reachable = new Set([entryNode.id])
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
          `Note: "${labels}" not reachable from start page (${PAGE_TYPE_LABELS[entryPage] || entryPage}) and will be removed on save.`,
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
      entryPage: 'HOME',
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
      setErrors([])
    } catch (err) {
      const msg = err.message || 'Failed to save flow'
      setErrors([msg])
    } finally {
      setSaving(false)
    }
  }, [id, mode, entryPage, nodes, edges, saveCampaignFlow])

  const nodeLabel = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId)
    return node ? node.data.label : nodeId
  }

  return (
    <AppShell>
      <div className="page-container">
        <button
          type="button"
          onClick={() => navigate(detailHref)}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to campaign
        </button>

        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-header-title">Flow builder</h1>
            <p className="page-header-description">
              Connect pages using the form on the right, or click the blue dot on one page then the
              green dot on another. Drag nodes only to reposition them.
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3 surface-card overflow-hidden" style={{ height: '72vh' }}>
            {loading ? (
              <div className="flex items-center justify-center h-full text-sm text-fg-muted">
                Loading flow...
              </div>
            ) : (
              <ReactFlow
                nodes={displayNodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                onNodesDelete={onNodesDelete}
                connectOnClick
                connectionMode={ConnectionMode.Loose}
                deleteKeyCode={['Backspace', 'Delete']}
                defaultEdgeOptions={{
                  animated: true,
                  labelStyle: { fontSize: 10, fontWeight: 600 },
                  labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
                }}
                fitView
              >
                <Background />
                <Controls />
                <MiniMap pannable zoomable />
              </ReactFlow>
            )}
          </div>

          <div className="flex flex-col gap-3 lg:sticky lg:top-4 max-h-[72vh] overflow-y-auto">
            <div className="surface-card p-3 shrink-0">
              <h3 className="text-sm font-semibold text-fg mb-1">Start page</h3>
              <p className="text-xs text-fg-muted mb-2">
                Trust-first: users always land on HOME (intro). OTP / Confirm come after CTA.
              </p>
              <div className="w-full text-sm border border-border rounded-md px-3 py-2 bg-bg-muted text-fg font-medium">
                HOME (locked)
              </div>
            </div>

            {selectedNode && (
              <div className="surface-card p-3 shrink-0 border border-accent/30 bg-accent-muted/20">
                <p className="text-[11px] font-medium text-fg-muted mb-2">Selected page</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-fg">{selectedNode.data.label}</span>
                  <span className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editNode(selectedNode.data.pageType)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNode(selectedNode.id)}
                      title="Remove from flow"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-danger" />
                    </Button>
                  </span>
                </div>
              </div>
            )}

            <div className="surface-card p-4 flex flex-col shrink-0">
              <h3 className="text-sm font-semibold text-fg mb-1">Connections</h3>
              <p className="text-xs text-fg-muted mb-3">
                Set flow paths here. Drag nodes only to reposition.
              </p>

              <div className="rounded-lg border border-accent/40 bg-accent-muted/30 p-3 mb-3 space-y-2">
                <p className="text-xs font-medium text-fg">Add connection</p>
                <label className="block">
                  <span className="text-[11px] text-fg-muted">From</span>
                  <select
                    className="mt-0.5 w-full text-xs border border-border rounded-md px-2 py-1.5 bg-bg-base"
                    value={newConnSource}
                    onChange={(ev) => setNewConnSource(ev.target.value)}
                  >
                    <option value="">Select page...</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.data.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] text-fg-muted">To</span>
                  <select
                    className="mt-0.5 w-full text-xs border border-border rounded-md px-2 py-1.5 bg-bg-base"
                    value={newConnTarget}
                    onChange={(ev) => setNewConnTarget(ev.target.value)}
                  >
                    <option value="">Select page...</option>
                    {nodes
                      .filter((n) => n.id !== newConnSource)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.data.label}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] text-fg-muted">When</span>
                  <select
                    className="mt-0.5 w-full text-xs border border-border rounded-md px-2 py-1.5 bg-bg-base"
                    value={newConnCondition}
                    onChange={(ev) => setNewConnCondition(ev.target.value)}
                    disabled={!newConnSource}
                  >
                    {newConnConditionOptions.map((c) => (
                      <option key={c} value={c}>
                        {conditionLabel(c)}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={addConnection}
                  disabled={!newConnSource || !newConnTarget}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Add connection
                </Button>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-2 pr-0.5">
                {edges.map((e) => (
                  <div key={e.id} className="rounded-lg border border-border p-2">
                    <div className="flex items-center justify-between text-xs text-fg-muted mb-1.5">
                      <span>
                        {nodeLabel(e.source)} → {nodeLabel(e.target)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEdge(e.id)}
                        className="text-danger hover:opacity-70 cursor-pointer"
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
                      {getEdgeConditionOptions(e.source, e.data?.condition).map((c) => (
                        <option key={c} value={c}>
                          {conditionLabel(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {edges.length === 0 && (
                  <p className="text-xs text-fg-muted">
                    No connections yet. Use the form above or blue dot → green dot on canvas.
                  </p>
                )}
              </div>
            </div>

            <div className="surface-card p-3 shrink-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-fg">Pages</h3>
                <span className="text-[11px] text-fg-muted">{nodes.length} in flow</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {nodes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelectedNodeId(n.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors cursor-pointer ${
                      selectedNodeId === n.id
                        ? 'border-accent bg-accent-muted text-fg font-medium'
                        : 'border-border bg-bg-subtle text-fg-muted hover:border-fg-muted'
                    }`}
                  >
                    {n.data.label}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        editNode(n.data.pageType)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation()
                          editNode(n.data.pageType)
                        }
                      }}
                      className="p-0.5 rounded hover:bg-bg-muted"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </span>
                  </button>
                ))}
                {nodes.length === 0 && <p className="text-xs text-fg-muted">No pages yet.</p>}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border">
                {PAGE_TYPES.filter((pt) => !existingPageTypes.has(pt)).map((pt) => (
                  <Button key={pt} variant="outline" size="sm" onClick={() => addNode(pt)}>
                    <Plus className="w-3 h-3" />
                    {PAGE_TYPE_LABELS[pt] || pt}
                  </Button>
                ))}
              </div>
            </div>

            <details className="surface-card p-3 shrink-0 group">
              <summary className="text-sm font-semibold text-fg cursor-pointer list-none flex items-center justify-between">
                Verification mode
                <span className="text-xs font-normal text-fg-muted">
                  {VERIFICATION_MODES.find((m) => m.id === mode)?.label}
                </span>
              </summary>
              <p className="text-[11px] text-fg-muted mt-2 mb-1">
                Client chooses how this campaign gets the phone number. HOME design stays free — no mandatory Subscribe button.
              </p>
              <div className="space-y-2 mt-3">
                {VERIFICATION_MODES.map((m) => (
                  <label
                    key={m.id}
                    className={`block rounded-lg border p-2 cursor-pointer transition-colors ${
                      mode === m.id ? 'border-accent bg-accent-muted' : 'border-border hover:bg-bg-subtle'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs font-medium text-fg">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === m.id}
                        onChange={() => handleModeChange(m.id)}
                      />
                      {m.label}
                    </span>
                    <span className="block text-[10px] text-fg-muted mt-1 pl-5 leading-snug">
                      {m.hint}
                    </span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="w-full mt-2 inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-dashed border-border hover:border-fg-muted rounded-md text-xs font-medium text-fg-muted hover:text-fg transition-colors cursor-pointer"
                onClick={() => handleResetFlow()}
              >
                Reset layout to default
              </button>
            </details>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default memo(FlowBuilderPage)
