import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Link2, Plus, Save, Trash2, Pencil, Copy, Check } from 'lucide-react'
import Button from '../ui/Button'
import PageNode from './PageNode'
import StartEndNode from './StartEndNode'
import {
  conditionLabel,
  getDefaultCondition,
  getValidConditions,
} from './flowConditions'
import {
  VERIFICATION_MODES,
  buildDefaultFlow,
  normalizeModeId,
  isApiExposeEntry,
  resolveAfterIdentityTarget,
} from './verificationModes'
import {
  START_NODE_ID,
  END_NODE_ID,
  defaultStartConfig,
  normalizeStartConfig,
  stripMetaNodes,
  withVisualStartEnd,
  isMetaPageType,
  isMetaNodeId,
} from './startConfig'
import useStore from '../../store/useStore'
import { PAGE_TYPE_LABELS } from '../../services/api/campaigns'
import { campaignEditPath } from '../../utils/routes'
import FlowCampaignSettings from './FlowCampaignSettings'

const nodeTypes = { pageNode: PageNode, startEndNode: StartEndNode }

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

function toRfNodes(flowConfig, startConfig, mode) {
  const visual = withVisualStartEnd(flowConfig, startConfig, mode)
  return (visual.nodes || []).map((n) => {
    const isMeta = isMetaPageType(n.pageType)
    return {
      id: n.id,
      type: isMeta ? 'startEndNode' : 'pageNode',
      position: n.position || { x: 0, y: 0 },
      deletable: !isMeta,
      data: {
        label: isMeta
          ? n.pageType
          : mode === 'UNIVERSE_DCB' && n.pageType === 'OTP'
            ? 'Number / Billing PIN'
            : PAGE_TYPE_LABELS[n.pageType] || n.pageType,
        pageType: n.pageType,
        kind: n.kind || (n.pageType === 'START' ? 'start' : n.pageType === 'END' ? 'end' : 'page'),
        startConfig: isMeta && n.pageType === 'START' ? visual.startConfig : undefined,
      },
    }
  })
}

function toRfEdges(flowConfig, startConfig, mode) {
  const visual = withVisualStartEnd(flowConfig, startConfig, mode)
  return (visual.edges || []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: conditionLabel(e.condition || 'DEFAULT'),
    animated: true,
    data: { condition: e.condition || 'DEFAULT' },
  }))
}

/**
 * Drag-drop flowConfig editor — used on Campaign Detail (embedded)
 * and optionally as a standalone page shell.
 */
function CampaignFlowBuilder({
  campaignId,
  countryCode,
  operatorCode,
  embedded = false,
}) {
  const navigate = useNavigate()
  const addToast = useStore((s) => s.addToast)
  const loadCampaignFlow = useStore((s) => s.loadCampaignFlow)
  const saveCampaignFlow = useStore((s) => s.saveCampaignFlow)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [mode, setMode] = useState('BOTH')
  const [entryPage, setEntryPage] = useState('HOME')
  const [afterIdentity, setAfterIdentity] = useState('HOME')
  const [startConfig, setStartConfig] = useState(() => defaultStartConfig('BOTH'))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState([])
  const [newConnSource, setNewConnSource] = useState('')
  const [newConnTarget, setNewConnTarget] = useState('')
  const [newConnCondition, setNewConnCondition] = useState('DEFAULT')
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [copiedApi, setCopiedApi] = useState('')

  const applyFlowTemplate = useCallback(
    (nextMode, nextEntry, nextAfter) => {
      const def = buildDefaultFlow(nextMode, {
        entryPage: nextMode === 'OTP_ONLY' ? nextEntry : 'HOME',
        afterIdentity: isApiExposeEntry(nextEntry) ? 'HOME' : nextAfter,
      })
      const nextStart = defaultStartConfig(nextMode)
      setStartConfig(nextStart)
      setNodes(toRfNodes(def, nextStart, nextMode))
      setEdges(toRfEdges(def, nextStart, nextMode))
      setEntryPage(def.entryPage || 'HOME')
      setAfterIdentity(resolveAfterIdentityTarget(def))
      setErrors([])
    },
    [setNodes, setEdges],
  )

  const handleResetFlow = useCallback(() => {
    applyFlowTemplate(mode, entryPage, afterIdentity)
    addToast('Flow graph reset to default template', 'success')
  }, [mode, entryPage, afterIdentity, applyFlowTemplate, addToast])

  const handleModeChange = useCallback(
    (newMode) => {
      setMode(newMode)
      applyFlowTemplate(newMode, newMode === 'OTP_ONLY' ? 'OTP' : 'HOME', 'HOME')
    },
    [applyFlowTemplate],
  )

  const handleEntryPageChange = useCallback(
    (nextEntry) => {
      const next = String(nextEntry || 'HOME').toUpperCase()
      setEntryPage(next)
      if (mode === 'OTP_ONLY') {
        applyFlowTemplate('OTP_ONLY', next, afterIdentity)
      }
    },
    [mode, afterIdentity, applyFlowTemplate],
  )

  const handleAfterIdentityChange = useCallback(
    (nextAfter) => {
      const next = String(nextAfter || 'HOME').toUpperCase()
      setAfterIdentity(next)
      if (!isApiExposeEntry(entryPage)) {
        applyFlowTemplate(mode, entryPage, next)
      }
    },
    [mode, entryPage, applyFlowTemplate],
  )

  useEffect(() => {
    if (!campaignId) return
    let cancelled = false
    setLoading(true)
    loadCampaignFlow(campaignId)
      .then((res) => {
        if (cancelled) return
        const nextMode = normalizeModeId(res.verificationMode)
        const nextStart = normalizeStartConfig(res.flowConfig?.startConfig, nextMode)
        setMode(nextMode)
        setEntryPage(res.flowConfig?.entryPage || 'HOME')
        setAfterIdentity(resolveAfterIdentityTarget(res.flowConfig))
        setStartConfig(nextStart)
        setNodes(toRfNodes(res.flowConfig, nextStart, nextMode))
        setEdges(toRfEdges(res.flowConfig, nextStart, nextMode))
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [campaignId, setNodes, setEdges, loadCampaignFlow])

  const pageNodes = useMemo(
    () => nodes.filter((n) => !isMetaPageType(n.data?.pageType)),
    [nodes],
  )

  const existingPageTypes = useMemo(
    () => new Set(pageNodes.map((n) => n.data.pageType)),
    [pageNodes],
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
      if (isMetaNodeId(nodeId)) {
        addToast('START and END cannot be removed', 'error')
        return
      }
      const removed = nodes.find((n) => n.id === nodeId)
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
      setSelectedNodeId((prev) => (prev === nodeId ? null : prev))
      if (removed?.data?.pageType === entryPage) {
        const remaining = nodes.filter(
          (n) => n.id !== nodeId && !isMetaPageType(n.data?.pageType),
        )
        setEntryPage(remaining[0]?.data?.pageType || 'HOME')
      }
      addToast('Page removed from flow', 'success')
    },
    [setNodes, setEdges, addToast, nodes, entryPage],
  )

  const patchStartConfig = useCallback(
    (patch) => {
      setStartConfig((prev) => {
        const next = normalizeStartConfig({ ...prev, ...patch }, mode)
        setNodes((nds) =>
          nds.map((n) =>
            n.id === START_NODE_ID
              ? { ...n, data: { ...n.data, startConfig: next } }
              : n,
          ),
        )
        return next
      })
    },
    [mode, setNodes],
  )

  const editNode = useCallback(
    (pageType) => {
      if (isMetaPageType(pageType)) return
      navigate(campaignEditPath(countryCode, operatorCode, campaignId, pageType))
    },
    [campaignId, navigate, countryCode, operatorCode],
  )

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
        data: {
          ...n.data,
          isEntry: n.data.pageType === entryPage,
          startConfig: n.id === START_NODE_ID ? startConfig : n.data.startConfig,
          onEdit: () => editNode(n.data.pageType),
          onDelete: () => removeNode(n.id),
        },
      })),
    [nodes, selectedNodeId, entryPage, editNode, removeNode, startConfig],
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
      const metaDeleted = deleted.some((n) => isMetaNodeId(n.id))
      if (metaDeleted) {
        addToast('START and END cannot be removed', 'error')
        // Re-inject will happen on next template load; restore from current graph
        return
      }
      const ids = new Set(deleted.map((n) => n.id))
      setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)))
      setSelectedNodeId(null)
      addToast('Page removed from flow', 'success')
    },
    [setEdges, addToast],
  )

  const getEdgeConditionOptions = useCallback(
    (sourceId, currentCondition) => {
      if (isMetaNodeId(sourceId)) {
        const fixed = sourceId === START_NODE_ID ? 'AFTER_CHECKS' : 'DONE'
        return currentCondition && currentCondition !== fixed
          ? [currentCondition, fixed]
          : [fixed]
      }
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
    const pageTypes = new Set(pageNodes.map((n) => n.data.pageType))
    const isApiExpose = mode === 'OTP_ONLY' && entryPage === 'API_EXPOSE'

    if (!isApiExpose) {
      if (!pageTypes.has(entryPage)) {
        clientErrors.push(
          `Start page "${PAGE_TYPE_LABELS[entryPage] || entryPage}" must be in the flow.`,
        )
      }
      if ((mode === 'OTP_ONLY' || mode === 'BOTH') && !pageTypes.has('OTP')) {
        clientErrors.push(`Verification mode "${mode}" requires an OTP page node.`)
      }

      const entryNode = pageNodes.find((n) => n.data.pageType === entryPage)
      if (entryNode) {
        const reachable = new Set([entryNode.id])
        let changed = true
        while (changed) {
          changed = false
          for (const e of edges) {
            if (isMetaNodeId(e.source) || isMetaNodeId(e.target)) continue
            if (reachable.has(e.source) && !reachable.has(e.target)) {
              reachable.add(e.target)
              changed = true
            }
          }
        }
        const orphans = pageNodes.filter((n) => !reachable.has(n.id))
        if (orphans.length > 0) {
          const labels = orphans.map((n) => n.data.label).join(', ')
          clientErrors.push(
            `Note: "${labels}" not reachable from start page (${PAGE_TYPE_LABELS[entryPage] || entryPage}) and will be removed on save.`,
          )
        }
      }
    }

    const hardErrors = clientErrors.filter((e) => !e.startsWith('Note:'))
    if (hardErrors.length > 0) {
      setErrors(hardErrors)
      return
    }

    const rawConfig = isApiExpose
      ? {
          version: 1,
          entryPage: 'API_EXPOSE',
          startConfig: normalizeStartConfig(startConfig, mode),
          nodes: [],
          edges: [],
        }
      : {
          version: 1,
          entryPage: entryPage || 'HOME',
          startConfig: normalizeStartConfig(startConfig, mode),
          nodes: pageNodes.map((n) => ({
            id: n.id,
            pageType: n.data.pageType,
            position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
          })),
          edges: edges
            .filter((e) => !isMetaNodeId(e.source) && !isMetaNodeId(e.target))
            .map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              condition: e.data?.condition || 'DEFAULT',
            })),
        }
    const flowConfig = stripMetaNodes(rawConfig)
    setSaving(true)
    setErrors(clientErrors)
    try {
      await saveCampaignFlow(campaignId, { verificationMode: mode, flowConfig })
      setErrors([])
      addToast('Flow saved', 'success')
    } catch (err) {
      const msg = err.message || 'Failed to save flow'
      setErrors([msg])
    } finally {
      setSaving(false)
    }
  }, [
    campaignId,
    mode,
    entryPage,
    pageNodes,
    edges,
    startConfig,
    saveCampaignFlow,
    addToast,
  ])

  const nodeLabel = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId)
    return node ? node.data.label : nodeId
  }

  const canvasHeight = embedded ? '56vh' : '72vh'
  const showApiExpose = mode === 'OTP_ONLY' && isApiExposeEntry(entryPage)
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
  const sendUrl = `${origin}/api/otp/${campaignId}/send?msisdn=`
  const verifyUrl = `${origin}/api/otp/${campaignId}/verify?msisdn=&otp=`

  const copyApiUrl = async (key, url) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedApi(key)
      setTimeout(() => setCopiedApi(''), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`font-semibold text-fg ${embedded ? 'text-sm' : 'page-header-title'}`}>
            Flow builder
          </h2>
          <p className={`text-fg-muted mt-0.5 ${embedded ? 'text-xs' : 'page-header-description'}`}>
            START configures checks before the first page (HE / blocklist / checksub). END marks
            funnel outcomes. Edit page content from any page node.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || loading}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save flow'}
        </Button>
      </div>

      {/* Verification mode + OTP landing options */}
      <div className="surface-card p-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-fg mb-2">Verification mode</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {VERIFICATION_MODES.map((m) => {
              const selected = mode === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModeChange(m.id)}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    selected
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">{m.label}</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">{m.hint}</p>
                </button>
              )
            })}
          </div>
        </div>

        {mode === 'OTP_ONLY' && (
          <>
            <div>
              <p className="text-xs font-medium text-fg mb-2">Landing page</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'HOME',
                    title: 'HOME first',
                    hint: 'Show intro, then OTP, then HOME packs.',
                  },
                  {
                    id: 'OTP',
                    title: 'OTP first',
                    hint: 'Skip HOME on landing — PIN first, then HOME packs.',
                  },
                  {
                    id: 'API_EXPOSE',
                    title: 'API expose',
                    hint: 'No WAP pages — expose public OTP send/verify URLs.',
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleEntryPageChange(opt.id)}
                    className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                      entryPage === opt.id
                        ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                        : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-fg">{opt.title}</p>
                    <p className="text-[11px] text-fg-muted mt-1 leading-snug">{opt.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {!showApiExpose && (
              <div>
                <p className="text-xs font-medium text-fg mb-2">After OTP verified</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAfterIdentityChange('HOME')}
                    className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                      afterIdentity === 'HOME' || afterIdentity === 'CONFIRM'
                        ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                        : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-fg">HOME page</p>
                    <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                      Pack / subscribe CTAs on HOME after PIN.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAfterIdentityChange('THANKYOU')}
                    className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                      afterIdentity === 'THANKYOU'
                        ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                        : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-fg">Skip HOME</p>
                    <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                      PIN verify → Thank you / portal (no pack page).
                    </p>
                  </button>
                </div>
              </div>
            )}

            {showApiExpose && (
              <div className="rounded-lg border border-border bg-bg-muted/40 px-3.5 py-3 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-fg">Exposed OTP APIs</p>
                  <p className="text-[11px] text-fg-muted mt-0.5">
                    No auth. Forwarded to Partner OTP URLs in API settings. Configure send/verify
                    and client payout % in Campaign API → Partner OTP. Below 100%, some partner
                    successes return invalid OTP to the caller; conversions still show here as
                    SUCCESS / HELD.
                  </p>
                </div>
                {[
                  { key: 'send', label: 'GET/POST — send OTP', url: sendUrl },
                  { key: 'verify', label: 'GET/POST — verify OTP', url: verifyUrl },
                ].map((row) => (
                  <div key={row.key} className="space-y-1">
                    <p className="text-[11px] font-medium text-fg">{row.label}</p>
                    <div className="flex items-start gap-2">
                      <code className="flex-1 text-[11px] font-mono text-fg break-all rounded-md border border-border bg-bg-elevated px-2.5 py-2">
                        {row.url}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyApiUrl(row.key, row.url)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-bg-elevated px-2 py-1.5 text-[11px] text-fg-muted hover:text-fg"
                      >
                        {copiedApi === row.key ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedApi === row.key ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {(mode === 'HEADER_INJECTION' || mode === 'BOTH') && (
          <div>
            <p className="text-xs font-medium text-fg mb-2">
              {mode === 'BOTH' ? 'After number resolved (HE or OTP)' : 'After HE resolved'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAfterIdentityChange('HOME')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  afterIdentity === 'HOME' || afterIdentity === 'CONFIRM'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">HOME page</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  Show HOME with pack / subscribe CTAs.
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleAfterIdentityChange('THANKYOU')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  afterIdentity === 'THANKYOU'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">Skip HOME</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  Number resolved → Thank you / portal (no pack page).
                </p>
              </button>
            </div>
            {mode === 'HEADER_INJECTION' && (
              <p className="text-[11px] text-fg-muted mt-2 leading-snug">
                If HE finds no number → Error page (and fail/CG URL if set). OTP is not used in
                this mode.
              </p>
            )}
            {mode === 'BOTH' && (
              <p className="text-[11px] text-fg-muted mt-2 leading-snug">
                HE miss still opens OTP first, then this same HOME / Skip HOME choice.
              </p>
            )}
          </div>
        )}

        {mode === 'NONE' && (
          <p className="text-[11px] text-fg-muted">
            Start page is locked to <strong>HOME</strong> for this mode. Change connections on the
            canvas or use Reset layout after switching modes.
          </p>
        )}

        <button
          type="button"
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-dashed border-border hover:border-fg-muted rounded-md text-xs font-medium text-fg-muted hover:text-fg transition-colors cursor-pointer"
          onClick={handleResetFlow}
        >
          Reset layout to default for this mode
        </button>
      </div>

      {errors.length > 0 && (
        <div className="space-y-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        <div
          className="lg:col-span-3 surface-card overflow-hidden"
          style={{ height: canvasHeight }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-sm text-fg-muted">
              Loading flow...
            </div>
          ) : showApiExpose ? (
            <div className="flex items-center justify-center h-full text-sm text-fg-muted px-6 text-center">
              API expose mode — no WAP page graph. Use the exposed OTP URLs above and Partner OTP
              in API settings.
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

        <div
          className="flex flex-col gap-3 lg:sticky lg:top-4 overflow-y-auto"
          style={{ maxHeight: canvasHeight }}
        >
          {selectedNode && selectedNode.id !== START_NODE_ID && (
            <div className="surface-card p-3 shrink-0 border border-accent/30 bg-accent-muted/20">
              {selectedNode.id === END_NODE_ID ? (
                <>
                  <p className="text-[11px] font-medium text-fg-muted mb-2">END</p>
                  <p className="text-xs text-fg-muted leading-snug">
                    Outcomes (Thank you, blocked, error, …) connect here. No settings — this is
                    the visual finish of the funnel.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-medium text-fg-muted mb-2">Selected page</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-fg">
                      {selectedNode.data.label}
                    </span>
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
                </>
              )}
            </div>
          )}

          <div
            className="surface-card p-3 shrink-0 border border-emerald-300/50 bg-emerald-50/40"
            data-testid="flow-start-checks"
          >
            <p className="text-[11px] font-medium text-fg-muted mb-2">
              START — before first page
            </p>
            <p className="text-xs text-fg-muted mb-3 leading-snug">
              These run on landing (detect) before HOME / OTP is shown. Partner API URLs still
              come from Campaign API settings.
            </p>
            <div className="space-y-2">
              {[
                {
                  key: 'runHe',
                  label: 'Header enrichment (HE)',
                  hint: 'Resolve MSISDN before showing the first page',
                  disabled: mode === 'OTP_ONLY' || mode === 'NONE',
                },
                {
                  key: 'runBlocklist',
                  label: 'Blocklist check',
                  hint: 'If blocked → BLOCKED page',
                },
                {
                  key: 'runChecksub',
                  label: 'Check subscription',
                  hint: 'If already active → Thank you / redirect',
                },
              ].map((row) => (
                <label
                  key={row.key}
                  className={`flex items-start gap-2 rounded-lg border border-border bg-bg-elevated px-2.5 py-2 ${
                    row.disabled ? 'opacity-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={Boolean(startConfig[row.key])}
                    disabled={row.disabled}
                    onChange={(e) => patchStartConfig({ [row.key]: e.target.checked })}
                  />
                  <span>
                    <span className="text-xs font-semibold text-fg block">{row.label}</span>
                    <span className="text-[11px] text-fg-muted leading-snug">
                      {row.disabled ? `Locked off for ${mode} mode` : row.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {(mode === 'HEADER_INJECTION' || mode === 'BOTH') && (
              <p className="text-[11px] text-fg-muted mt-3 leading-snug">
                Tip: HE campaigns usually design HOME for “number already known → Subscribe API”.
                OTP_ONLY campaigns use a different HOME that asks for PIN.
              </p>
            )}
          </div>

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
                  {pageNodes.map((n) => (
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
                  {pageNodes
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
              <span className="text-[11px] text-fg-muted">{pageNodes.length} in flow</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {pageNodes.map((n) => (
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
              {pageNodes.length === 0 && <p className="text-xs text-fg-muted">No pages yet.</p>}
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
        </div>
      </div>

      <FlowCampaignSettings campaignId={campaignId} />
    </div>
  )
}

export default memo(CampaignFlowBuilder)
