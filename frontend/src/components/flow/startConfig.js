/**
 * Pre-HOME landing checks (Layer A) — configured on the flow START node.
 * Persisted as flowConfig.startConfig; runtime reads it in detect-msisdn.
 */

export const START_NODE_ID = '__START__'
export const END_NODE_ID = '__END__'

export const META_PAGE_TYPES = new Set(['START', 'END'])

export function isMetaPageType(pageType) {
  return META_PAGE_TYPES.has(String(pageType || '').toUpperCase())
}

export function isMetaNodeId(id) {
  const s = String(id || '')
  return s === START_NODE_ID || s === END_NODE_ID
}

/** Defaults aligned with verification mode (HE modes run checks; OTP_ONLY skips HE). */
export function defaultStartConfig(mode) {
  const m = String(mode || 'BOTH').toUpperCase()
  if (m === 'OTP_ONLY' || m === 'NONE') {
    return {
      runHe: false,
      runBlocklist: m === 'OTP_ONLY',
      runChecksub: m === 'OTP_ONLY',
    }
  }
  if (m === 'UNIVERSE_DCB') {
    return {
      runHe: true,
      runBlocklist: true,
      runChecksub: true,
    }
  }
  // HEADER_INJECTION / BOTH
  return {
    runHe: true,
    runBlocklist: true,
    runChecksub: true,
  }
}

export function normalizeStartConfig(raw, mode) {
  const fallback = defaultStartConfig(mode)
  if (!raw || typeof raw !== 'object') return { ...fallback }
  return {
    runHe: typeof raw.runHe === 'boolean' ? raw.runHe : fallback.runHe,
    runBlocklist: typeof raw.runBlocklist === 'boolean' ? raw.runBlocklist : fallback.runBlocklist,
    runChecksub: typeof raw.runChecksub === 'boolean' ? raw.runChecksub : fallback.runChecksub,
  }
}

/** Strip START/END from persisted page graph (they are visual + startConfig only). */
export function stripMetaNodes(flowConfig) {
  if (!flowConfig) return flowConfig
  const nodes = (flowConfig.nodes || []).filter((n) => !isMetaPageType(n.pageType) && !isMetaNodeId(n.id))
  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges = (flowConfig.edges || []).filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target) && !isMetaNodeId(e.source) && !isMetaNodeId(e.target)
  )
  return { ...flowConfig, nodes, edges }
}

/**
 * Inject visual START → entry and outcome → END for the React Flow canvas.
 * Does not mutate the saved page graph shape used by flow-engine nextPage().
 */
export function withVisualStartEnd(flowConfig, startConfig, mode) {
  const base = stripMetaNodes(flowConfig) || {
    version: 1,
    entryPage: 'HOME',
    nodes: [],
    edges: [],
  }
  const entry =
    String(base.entryPage || 'HOME').toUpperCase() === 'API_EXPOSE'
      ? null
      : String(base.entryPage || 'HOME').toUpperCase()

  if (!entry || !(base.nodes || []).length) {
    return {
      ...base,
      startConfig: normalizeStartConfig(startConfig, mode),
      nodes: base.nodes || [],
      edges: base.edges || [],
    }
  }

  const entryNode = (base.nodes || []).find((n) => n.pageType === entry)
  const entryId = entryNode?.id || entry
  const entryPos = entryNode?.position || { x: 40, y: 160 }

  const startNode = {
    id: START_NODE_ID,
    pageType: 'START',
    position: { x: Math.max(0, entryPos.x - 220), y: entryPos.y },
    kind: 'start',
  }
  const endNode = {
    id: END_NODE_ID,
    pageType: 'END',
    position: { x: 1100, y: 160 },
    kind: 'end',
  }

  const dcbMode = String(mode || '').toUpperCase() === 'UNIVERSE_DCB'
  const outcomeTypes = new Set(
    dcbMode
      ? ['THANKYOU', 'LOW_BALANCE', 'BLOCKED', 'ERROR']
      : ['THANKYOU', 'INPROGRESS', 'LOW_BALANCE', 'BLOCKED', 'ERROR']
  )
  const outcomeNodes = (base.nodes || []).filter((n) => outcomeTypes.has(n.pageType))
  if (outcomeNodes.length) {
    const avgY = outcomeNodes.reduce((s, n) => s + (n.position?.y || 160), 0) / outcomeNodes.length
    const maxX = Math.max(...outcomeNodes.map((n) => n.position?.x || 880), 880)
    endNode.position = { x: maxX + 200, y: avgY }
  }

  const otpNode = (base.nodes || []).find((n) => n.pageType === 'OTP')
  const homeNode = (base.nodes || []).find((n) => n.pageType === 'HOME')
  const extraEdges =
    dcbMode && otpNode
      ? [
          {
            id: `${START_NODE_ID}-MANUAL_MSISDN_REQUIRED-${otpNode.id}`,
            source: START_NODE_ID,
            target: otpNode.id,
            condition: 'MANUAL_MSISDN_REQUIRED',
          },
          ...(homeNode
            ? [
                {
                  id: `${START_NODE_ID}-HEADER_RESOLVED-${homeNode.id}`,
                  source: START_NODE_ID,
                  target: homeNode.id,
                  condition: 'HEADER_RESOLVED',
                },
              ]
            : []),
        ]
      : [
          {
            id: `${START_NODE_ID}-DEFAULT-${entryId}`,
            source: START_NODE_ID,
            target: entryId,
            condition: 'AFTER_CHECKS',
          },
        ]
  for (const n of outcomeNodes) {
    extraEdges.push({
      id: `${n.id}-DEFAULT-${END_NODE_ID}`,
      source: n.id,
      target: END_NODE_ID,
      condition: 'DONE',
    })
  }

  return {
    ...base,
    startConfig: normalizeStartConfig(startConfig ?? base.startConfig, mode),
    nodes: [startNode, ...(base.nodes || []), endNode],
    edges: [...(base.edges || []), ...extraEdges],
  }
}
