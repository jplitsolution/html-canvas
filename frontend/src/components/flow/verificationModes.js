/**
 * Shared verification-mode definitions + default flow graphs (Layer B).
 *
 * WHY: Mode is the real admin knob for SUBSCRIBE/CONFIRM routing.
 * Default graphs match flow-engine.getDefaultFlowConfig — changing mode
 * regenerates these. Drag-drop Flow Builder UI is no longer primary;
 * Campaign Detail hosts the mode picker + read-only path.
 */

export const VERIFICATION_MODES = [
  {
    id: 'HEADER_INJECTION',
    label: 'Header Injection',
    hint: 'Phone from carrier header / ISP. If missing → Error page.',
    pathHint: 'HOME → Confirm (HE ok) / Error (no HE) → outcomes',
  },
  {
    id: 'OTP_ONLY',
    label: 'OTP only',
    hint: 'OTP path. Land on HOME first, or skip HOME and open OTP directly.',
    pathHint: 'HOME → OTP → Confirm (or OTP → Confirm)',
  },
  {
    id: 'BOTH',
    label: 'Header Injection + OTP',
    hint: 'HOME first. CTA: header OK → Confirm, else → OTP.',
    pathHint: 'HOME → Confirm (HE) / OTP (no HE) → Confirm → outcomes',
  },
  {
    id: 'NONE',
    label: 'None (null / CG redirect)',
    hint: 'No HE/OTP. If a CG URL is set → redirect there on landing with click_id.',
    pathHint: 'Landing → CG redirect (if URL set), else HOME only',
  },
]

export function normalizeModeId(mode) {
  if (mode === 'MSISDN_ONLY') return 'HEADER_INJECTION'
  if (mode === 'NULL' || mode === null || mode === undefined || mode === '') return 'BOTH'
  return mode || 'BOTH'
}

const OUTCOME_NODES = [
  { id: 'THANKYOU', pageType: 'THANKYOU', position: { x: 880, y: 40 } },
  { id: 'INPROGRESS', pageType: 'INPROGRESS', position: { x: 880, y: 160 } },
  { id: 'LOW_BALANCE', pageType: 'LOW_BALANCE', position: { x: 880, y: 280 } },
  { id: 'BLOCKED', pageType: 'BLOCKED', position: { x: 880, y: 400 } },
  { id: 'ERROR', pageType: 'ERROR', position: { x: 880, y: 520 } },
]

const CONFIRM_EDGES = [
  { id: 'CONFIRM-SUBSCRIBED-THANKYOU', source: 'CONFIRM', target: 'THANKYOU', condition: 'SUBSCRIBED' },
  { id: 'CONFIRM-PENDING-INPROGRESS', source: 'CONFIRM', target: 'INPROGRESS', condition: 'PENDING' },
  { id: 'CONFIRM-LOW_BALANCE-LOW_BALANCE', source: 'CONFIRM', target: 'LOW_BALANCE', condition: 'LOW_BALANCE' },
  { id: 'CONFIRM-BLOCKED-BLOCKED', source: 'CONFIRM', target: 'BLOCKED', condition: 'BLOCKED' },
  { id: 'CONFIRM-ERROR-ERROR', source: 'CONFIRM', target: 'ERROR', condition: 'ERROR' },
]

/** Default flowConfig graphs — keep in sync with FlowBuilder / flow-engine defaults. */
export const DEFAULT_FLOWS = {
  HEADER_INJECTION: {
    entryPage: 'HOME',
    nodes: [
      { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
      { id: 'CONFIRM', pageType: 'CONFIRM', position: { x: 600, y: 160 } },
      ...OUTCOME_NODES,
    ],
    edges: [
      { id: 'HOME-HEADER_RESOLVED-CONFIRM', source: 'HOME', target: 'CONFIRM', condition: 'HEADER_RESOLVED' },
      { id: 'HOME-HEADER_UNRESOLVED-ERROR', source: 'HOME', target: 'ERROR', condition: 'HEADER_UNRESOLVED' },
      ...CONFIRM_EDGES,
    ],
  },
  OTP_ONLY: {
    entryPage: 'HOME',
    nodes: [
      { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
      { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
      { id: 'CONFIRM', pageType: 'CONFIRM', position: { x: 600, y: 160 } },
      ...OUTCOME_NODES,
    ],
    edges: [
      { id: 'HOME-DEFAULT-OTP', source: 'HOME', target: 'OTP', condition: 'DEFAULT' },
      { id: 'OTP-OTP_VERIFIED-CONFIRM', source: 'OTP', target: 'CONFIRM', condition: 'OTP_VERIFIED' },
      ...CONFIRM_EDGES,
    ],
  },
  BOTH: {
    entryPage: 'HOME',
    nodes: [
      { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
      { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
      { id: 'CONFIRM', pageType: 'CONFIRM', position: { x: 600, y: 160 } },
      ...OUTCOME_NODES,
    ],
    edges: [
      { id: 'HOME-HEADER_RESOLVED-CONFIRM', source: 'HOME', target: 'CONFIRM', condition: 'HEADER_RESOLVED' },
      { id: 'HOME-HEADER_UNRESOLVED-OTP', source: 'HOME', target: 'OTP', condition: 'HEADER_UNRESOLVED' },
      { id: 'OTP-OTP_VERIFIED-CONFIRM', source: 'OTP', target: 'CONFIRM', condition: 'OTP_VERIFIED' },
      ...CONFIRM_EDGES,
    ],
  },
  NONE: {
    entryPage: 'HOME',
    nodes: [{ id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } }],
    edges: [],
  },
}

/**
 * Build default flow for a mode.
 * OTP_ONLY supports entryPage 'HOME' (intro first) or 'OTP' (skip HOME).
 */
export function buildDefaultFlow(mode, { entryPage } = {}) {
  const normalized = normalizeModeId(mode)
  const base = DEFAULT_FLOWS[normalized] || DEFAULT_FLOWS.BOTH

  if (normalized === 'OTP_ONLY' && String(entryPage || '').toUpperCase() === 'OTP') {
    return {
      version: 1,
      entryPage: 'OTP',
      nodes: [
        { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
        { id: 'CONFIRM', pageType: 'CONFIRM', position: { x: 600, y: 160 } },
        ...OUTCOME_NODES.map((n) => ({ ...n })),
      ],
      edges: [
        { id: 'OTP-OTP_VERIFIED-CONFIRM', source: 'OTP', target: 'CONFIRM', condition: 'OTP_VERIFIED' },
        ...CONFIRM_EDGES.map((e) => ({ ...e })),
      ],
    }
  }

  return {
    version: 1,
    entryPage: base.entryPage || 'HOME',
    nodes: base.nodes.map((n) => ({ ...n })),
    edges: base.edges.map((e) => ({ ...e })),
  }
}

const CONDITION_LABELS = {
  DEFAULT: 'default',
  HEADER_RESOLVED: 'HE ok',
  HEADER_UNRESOLVED: 'no HE',
  OTP_VERIFIED: 'OTP ok',
  SUBSCRIBED: 'subscribed',
  PENDING: 'pending',
  LOW_BALANCE: 'low balance',
  BLOCKED: 'blocked',
  ERROR: 'error',
}

function resolveEntryPage(config) {
  const nodes = config?.nodes || []
  if (!nodes.length) return 'HOME'
  const wanted = String(config?.entryPage || '').toUpperCase()
  if (wanted && nodes.some((n) => n.pageType === wanted)) return wanted
  if (nodes.some((n) => n.pageType === 'HOME')) return 'HOME'
  return nodes[0].pageType
}

/**
 * Build a compact read-only path for Campaign Detail.
 * Prefers saved flowConfig edges; falls back to DEFAULT_FLOWS for the mode.
 */
export function buildFlowPathSummary(verificationMode, flowConfig, { cgRedirectUrl } = {}) {
  const mode = normalizeModeId(verificationMode)
  const modeMeta = VERIFICATION_MODES.find((m) => m.id === mode) || VERIFICATION_MODES.find((m) => m.id === 'BOTH')
  const config = flowConfig?.nodes?.length
    ? flowConfig
    : DEFAULT_FLOWS[mode] || DEFAULT_FLOWS.BOTH

  if (mode === 'NONE') {
    return {
      mode,
      modeLabel: modeMeta.label,
      modeHint: modeMeta.hint,
      entryPage: 'HOME',
      steps: cgRedirectUrl
        ? [
            { id: 'land', label: 'Landing' },
            { id: 'cg', label: 'CG redirect', condition: 'external URL' },
          ]
        : [
            { id: 'HOME', label: 'HOME' },
            { id: 'stay', label: 'Stay (no CG URL)', condition: 'null-flow' },
          ],
      edges: [],
      note: 'Canvas buttons can still jump to a page or URL if you show HOME.',
    }
  }

  const entryPage = resolveEntryPage(config)
  const nodesById = Object.fromEntries((config.nodes || []).map((n) => [n.id, n]))
  const pageLabel = (id) => {
    const n = nodesById[id]
    return n?.pageType || id
  }

  // Prefer entry page outgoing edges, then HOME/OTP/CONFIRM for the story.
  const prioritySources = [entryPage, 'HOME', 'OTP', 'CONFIRM'].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  )
  const edges = []
  for (const source of prioritySources) {
    for (const e of config.edges || []) {
      if (e.source !== source) continue
      edges.push({
        source: pageLabel(e.source),
        target: pageLabel(e.target),
        condition: e.condition || 'DEFAULT',
        conditionLabel: CONDITION_LABELS[e.condition] || e.condition || 'default',
      })
    }
  }

  // Unique ordered steps along BFS from entry page
  const steps = []
  const visited = new Set()
  const entryNode = (config.nodes || []).find((n) => n.pageType === entryPage)
  const startId = entryNode?.id || entryPage
  const queue = [startId]
  visited.add(entryPage)
  steps.push({ id: entryPage, label: entryPage })
  while (queue.length) {
    const cur = queue.shift()
    for (const e of config.edges || []) {
      if (e.source !== cur) continue
      const targetNode = nodesById[e.target]
      const type = targetNode?.pageType || e.target
      if (visited.has(type)) continue
      // Skip status-only outcomes in the main breadcrumb (still listed in edges)
      if (['THANKYOU', 'INPROGRESS', 'LOW_BALANCE', 'BLOCKED', 'ERROR'].includes(type)) continue
      visited.add(type)
      steps.push({ id: type, label: type })
      queue.push(e.target)
    }
  }
  steps.push({ id: 'outcomes', label: 'outcomes' })

  return {
    mode,
    modeLabel: modeMeta.label,
    modeHint: modeMeta.hint,
    entryPage,
    steps,
    edges,
    note:
      entryPage === 'OTP'
        ? 'Landing opens OTP directly (HOME skipped). Canvas “Go to page / URL / Priority” can still override.'
        : 'Subscribe CTA uses this path. Canvas “Go to page / URL / Priority” bypasses it.',
  }
}
