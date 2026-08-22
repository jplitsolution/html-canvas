/**
 * Shared verification-mode definitions + default flow graphs (Layer B).
 *
 * WHY: Mode is the real admin knob for identity + landing.
 * Subscribe CTAs live on HOME; Confirm is optional (add from Pages if needed).
 */

import { defaultStartConfig } from './startConfig'

export const VERIFICATION_MODES = [
  {
    id: 'HEADER_INJECTION',
    label: 'Header Injection',
    hint: 'Resolve number from carrier header / ISP, then HOME. If missing → Error page.',
    pathHint: 'HE → HOME (packs) / Error (no HE) → outcomes',
  },
  {
    id: 'OTP_ONLY',
    label: 'OTP only',
    hint: 'No landing HE. OTP first (or HOME first), then HOME pack CTAs — or expose public send/verify APIs.',
    pathHint: 'OTP → HOME (or HOME → OTP → HOME), or skip HOME → Thank you',
  },
  {
    id: 'BOTH',
    label: 'Header Injection + OTP',
    hint: 'HE first. Hit → HOME. Miss → OTP → HOME.',
    pathHint: 'HE → HOME / OTP → HOME → outcomes',
  },
  {
    id: 'UNIVERSE_DCB',
    label: 'Universe Telecom DCB',
    hint: 'WAP funnel with PIN + pack, or API expose for vendor billing PIN send/confirm (no pages).',
    pathHint: 'No HE: number → packs → PIN. HE: packs → PIN → polling. Or public pincode/confirm APIs',
  },
  {
    id: 'NONE',
    label: 'None (null / CG redirect)',
    hint: 'No HE/OTP. If a CG URL is set → redirect there on landing with click_id.',
    pathHint: 'Landing → CG redirect (if URL set), else HOME only',
  },
  {
    id: 'CG_HOME',
    label: 'CG via HOME (no HE)',
    hint: 'No HE/OTP. Show HOME first. Subscribe redirects to CG URL with click_id.',
    pathHint: 'HOME → Subscribe → CG redirect (click_id)',
  },
]

export function normalizeModeId(mode) {
  if (mode === 'MSISDN_ONLY') return 'HEADER_INJECTION'
  if (mode === 'NULL' || mode === null || mode === undefined || mode === '') return 'BOTH'
  return mode || 'BOTH'
}

/** No HE/OTP — CG URL carries click_id (landing or subscribe). */
export function isNullIdentityMode(mode) {
  const m = normalizeModeId(mode)
  return m === 'NONE' || m === 'CG_HOME'
}

const OUTCOME_NODES = [
  { id: 'THANKYOU', pageType: 'THANKYOU', position: { x: 880, y: 40 } },
  { id: 'INPROGRESS', pageType: 'INPROGRESS', position: { x: 880, y: 160 } },
  { id: 'LOW_BALANCE', pageType: 'LOW_BALANCE', position: { x: 880, y: 280 } },
  { id: 'BLOCKED', pageType: 'BLOCKED', position: { x: 880, y: 400 } },
  { id: 'ERROR', pageType: 'ERROR', position: { x: 880, y: 520 } },
]

const DCB_PAGE_POSITIONS = {
  OTP: { x: 300, y: 48 },
  HOME: { x: 620, y: 48 },
  INPROGRESS: { x: 940, y: 48 },
  THANKYOU: { x: 1220, y: 48 },
  LOW_BALANCE: { x: 940, y: 200 },
  BLOCKED: { x: 940, y: 340 },
  ERROR: { x: 940, y: 480 },
}

const DCB_OUTCOME_NODES = [
  { id: 'THANKYOU', pageType: 'THANKYOU', position: { ...DCB_PAGE_POSITIONS.THANKYOU } },
  { id: 'INPROGRESS', pageType: 'INPROGRESS', position: { ...DCB_PAGE_POSITIONS.INPROGRESS } },
  { id: 'LOW_BALANCE', pageType: 'LOW_BALANCE', position: { ...DCB_PAGE_POSITIONS.LOW_BALANCE } },
  { id: 'BLOCKED', pageType: 'BLOCKED', position: { ...DCB_PAGE_POSITIONS.BLOCKED } },
  { id: 'ERROR', pageType: 'ERROR', position: { ...DCB_PAGE_POSITIONS.ERROR } },
]

/** Left-to-right wifi path: number → packs → PIN (same OTP page) → polling. */
export function applyUniverseDcbGraphLayout(flowConfig) {
  if (!flowConfig) return flowConfig
  const nodes = (flowConfig.nodes || []).map((node) => {
    const position = DCB_PAGE_POSITIONS[node.pageType]
    return position ? { ...node, position: { ...position } } : node
  })
  const savedEntry = String(flowConfig.entryPage || '').toUpperCase()
  const entryPage = savedEntry === 'API_EXPOSE' ? 'API_EXPOSE' : savedEntry || 'OTP'
  return { ...flowConfig, entryPage, nodes }
}

function flowEdge(source, target, condition) {
  return {
    id: `${source}-${condition}-${target}`,
    source,
    target,
    condition,
  }
}

function outcomeEdgesFrom(source) {
  return [
    flowEdge(source, 'THANKYOU', 'SUBSCRIBED'),
    flowEdge(source, 'INPROGRESS', 'PENDING'),
    flowEdge(source, 'LOW_BALANCE', 'LOW_BALANCE'),
    flowEdge(source, 'BLOCKED', 'BLOCKED'),
    flowEdge(source, 'ERROR', 'ERROR'),
  ]
}

/** Default flowConfig graphs — HOME is the subscribe canvas (no Confirm). */
export const DEFAULT_FLOWS = {
  HEADER_INJECTION: {
    entryPage: 'HOME',
    nodes: [{ id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } }, ...OUTCOME_NODES],
    edges: [flowEdge('HOME', 'ERROR', 'HEADER_UNRESOLVED'), ...outcomeEdgesFrom('HOME')],
  },
  OTP_ONLY: {
    entryPage: 'OTP',
    nodes: [
      { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
      { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
      ...OUTCOME_NODES,
    ],
    edges: [flowEdge('OTP', 'HOME', 'OTP_VERIFIED'), ...outcomeEdgesFrom('HOME')],
  },
  BOTH: {
    entryPage: 'HOME',
    nodes: [
      { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
      { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
      ...OUTCOME_NODES,
    ],
    edges: [
      flowEdge('HOME', 'OTP', 'HEADER_UNRESOLVED'),
      flowEdge('OTP', 'HOME', 'OTP_VERIFIED'),
      ...outcomeEdgesFrom('HOME'),
    ],
  },
  UNIVERSE_DCB: {
    entryPage: 'OTP',
    nodes: [
      { id: 'OTP', pageType: 'OTP', position: { ...DCB_PAGE_POSITIONS.OTP } },
      { id: 'HOME', pageType: 'HOME', position: { ...DCB_PAGE_POSITIONS.HOME } },
      ...DCB_OUTCOME_NODES,
    ],
    edges: [
      flowEdge('OTP', 'HOME', 'MSISDN_CHECKED'),
      flowEdge('HOME', 'OTP', 'PIN_REQUESTED'),
      flowEdge('HOME', 'LOW_BALANCE', 'LOW_BALANCE'),
      flowEdge('HOME', 'BLOCKED', 'BLOCKED'),
      flowEdge('HOME', 'ERROR', 'ERROR'),
      flowEdge('OTP', 'INPROGRESS', 'PIN_CONFIRMED'),
      flowEdge('INPROGRESS', 'THANKYOU', 'ACTIVATED'),
      flowEdge('INPROGRESS', 'LOW_BALANCE', 'LOW_BALANCE'),
      flowEdge('INPROGRESS', 'ERROR', 'ERROR'),
    ],
  },
  NONE: {
    entryPage: 'HOME',
    nodes: [{ id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } }],
    edges: [],
  },
  CG_HOME: {
    entryPage: 'HOME',
    nodes: [{ id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } }],
    edges: [],
  },
}

/** True when OTP_ONLY campaign is API-mediator only (no WAP pages). */
export function isApiExposeEntry(entryPage) {
  return String(entryPage || '').toUpperCase() === 'API_EXPOSE'
}

export function isApiExposeCampaign(campaign) {
  const mode = normalizeModeId(campaign?.verificationMode)
  return (
    (mode === 'OTP_ONLY' || mode === 'UNIVERSE_DCB') &&
    isApiExposeEntry(campaign?.flowConfig?.entryPage)
  )
}

export function isDcbApiExposeCampaign(campaign) {
  return (
    normalizeModeId(campaign?.verificationMode) === 'UNIVERSE_DCB' &&
    isApiExposeEntry(campaign?.flowConfig?.entryPage)
  )
}

export function isOtpApiExposeCampaign(campaign) {
  return (
    normalizeModeId(campaign?.verificationMode) === 'OTP_ONLY' &&
    isApiExposeEntry(campaign?.flowConfig?.entryPage)
  )
}

/** HOME = pack canvas after identity. THANKYOU = skip HOME. */
export function normalizeAfterIdentity(afterIdentity, afterOtp) {
  const raw = String(afterIdentity || afterOtp || 'HOME').toUpperCase()
  if (raw === 'THANKYOU') return 'THANKYOU'
  return 'HOME'
}

function otpBlockErrorEdges() {
  return [flowEdge('OTP', 'BLOCKED', 'BLOCKED'), flowEdge('OTP', 'ERROR', 'ERROR')]
}

/**
 * Build default flow for a mode.
 *   entryPage 'HOME' | 'OTP' | 'API_EXPOSE' (OTP_ONLY landing)
 *   afterIdentity / afterOtp 'HOME' | 'THANKYOU'
 */
export function buildDefaultFlow(mode, { entryPage, afterIdentity, afterOtp } = {}) {
  const normalized = normalizeModeId(mode)
  const skipHome = normalizeAfterIdentity(afterIdentity, afterOtp) === 'THANKYOU'
  const entry = String(entryPage || '').toUpperCase()
  const otpEntry = entry === 'OTP' || (normalized === 'OTP_ONLY' && !entry)
  const apiExpose = entry === 'API_EXPOSE'

  if (normalized === 'NONE' || normalized === 'CG_HOME') {
    return {
      version: 1,
      entryPage: 'HOME',
      startConfig: defaultStartConfig(normalized),
      nodes: [{ id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } }],
      edges: [],
    }
  }

  if (normalized === 'OTP_ONLY' && apiExpose) {
    return {
      version: 1,
      entryPage: 'API_EXPOSE',
      startConfig: defaultStartConfig('OTP_ONLY'),
      nodes: [],
      edges: [],
    }
  }

  const outcomes = OUTCOME_NODES.map((n) => ({ ...n }))
  const homeNode = { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } }
  const otpNode = { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } }

  if (normalized === 'OTP_ONLY') {
    const afterOtpTarget = skipHome ? 'THANKYOU' : 'HOME'
    if (skipHome && otpEntry) {
      return {
        version: 1,
        entryPage: 'OTP',
        startConfig: defaultStartConfig('OTP_ONLY'),
        nodes: [otpNode, ...outcomes.filter((n) => n.id !== 'INPROGRESS' && n.id !== 'LOW_BALANCE')],
        edges: [flowEdge('OTP', 'THANKYOU', 'OTP_VERIFIED'), ...otpBlockErrorEdges()],
      }
    }
    if (skipHome) {
      return {
        version: 1,
        entryPage: 'HOME',
        startConfig: defaultStartConfig('OTP_ONLY'),
        nodes: [homeNode, otpNode, ...outcomes.filter((n) => n.id !== 'INPROGRESS' && n.id !== 'LOW_BALANCE')],
        edges: [
          flowEdge('HOME', 'OTP', 'DEFAULT'),
          flowEdge('OTP', 'THANKYOU', 'OTP_VERIFIED'),
          ...otpBlockErrorEdges(),
          flowEdge('HOME', 'BLOCKED', 'BLOCKED'),
        ],
      }
    }
    if (otpEntry) {
      return {
        version: 1,
        entryPage: 'OTP',
        startConfig: defaultStartConfig('OTP_ONLY'),
        nodes: [otpNode, homeNode, ...outcomes],
        edges: [flowEdge('OTP', afterOtpTarget, 'OTP_VERIFIED'), ...outcomeEdgesFrom('HOME'), ...otpBlockErrorEdges()],
      }
    }
    return {
      version: 1,
      entryPage: 'HOME',
      startConfig: defaultStartConfig('OTP_ONLY'),
      nodes: [homeNode, otpNode, ...outcomes],
      edges: [
        flowEdge('HOME', 'OTP', 'DEFAULT'),
        flowEdge('OTP', afterOtpTarget, 'OTP_VERIFIED'),
        ...outcomeEdgesFrom('HOME'),
        ...otpBlockErrorEdges(),
        flowEdge('HOME', 'BLOCKED', 'BLOCKED'),
      ],
    }
  }

  if (normalized === 'HEADER_INJECTION') {
    const edges = [flowEdge('HOME', 'ERROR', 'HEADER_UNRESOLVED'), ...outcomeEdgesFrom('HOME')]
    if (skipHome) {
      edges.unshift(flowEdge('HOME', 'THANKYOU', 'HEADER_RESOLVED'))
    }
    return {
      version: 1,
      entryPage: 'HOME',
      startConfig: defaultStartConfig('HEADER_INJECTION'),
      nodes: [homeNode, ...outcomes],
      edges,
    }
  }

  if (normalized === 'BOTH') {
    const afterTarget = skipHome ? 'THANKYOU' : 'HOME'
    const edges = [
      flowEdge('HOME', 'OTP', 'HEADER_UNRESOLVED'),
      flowEdge('OTP', afterTarget, 'OTP_VERIFIED'),
      ...otpBlockErrorEdges(),
      ...outcomeEdgesFrom('HOME'),
    ]
    if (skipHome) {
      edges.unshift(flowEdge('HOME', 'THANKYOU', 'HEADER_RESOLVED'))
    }
    return {
      version: 1,
      entryPage: 'HOME',
      startConfig: defaultStartConfig('BOTH'),
      nodes: [homeNode, otpNode, ...outcomes],
      edges,
    }
  }

  if (normalized === 'UNIVERSE_DCB') {
    if (apiExpose) {
      return {
        version: 1,
        entryPage: 'API_EXPOSE',
        startConfig: defaultStartConfig('UNIVERSE_DCB'),
        nodes: [],
        edges: [],
      }
    }
    return {
      version: 1,
      entryPage: 'OTP',
      startConfig: defaultStartConfig('UNIVERSE_DCB'),
      nodes: [
        { ...otpNode, position: { ...DCB_PAGE_POSITIONS.OTP } },
        { ...homeNode, position: { ...DCB_PAGE_POSITIONS.HOME } },
        ...DCB_OUTCOME_NODES.map((node) => ({ ...node })),
      ],
      edges: [
        flowEdge('OTP', 'HOME', 'MSISDN_CHECKED'),
        flowEdge('HOME', 'OTP', 'PIN_REQUESTED'),
        flowEdge('HOME', 'LOW_BALANCE', 'LOW_BALANCE'),
        flowEdge('HOME', 'BLOCKED', 'BLOCKED'),
        flowEdge('HOME', 'ERROR', 'ERROR'),
        flowEdge('OTP', 'INPROGRESS', 'PIN_CONFIRMED'),
        flowEdge('INPROGRESS', 'THANKYOU', 'ACTIVATED'),
        flowEdge('INPROGRESS', 'LOW_BALANCE', 'LOW_BALANCE'),
        flowEdge('INPROGRESS', 'ERROR', 'ERROR'),
      ],
    }
  }

  const base = DEFAULT_FLOWS[normalized] || DEFAULT_FLOWS.BOTH
  return {
    version: 1,
    entryPage: base.entryPage || 'HOME',
    startConfig: defaultStartConfig(normalized),
    nodes: base.nodes.map((n) => ({ ...n })),
    edges: base.edges.map((e) => ({ ...e })),
  }
}

const CONDITION_LABELS = {
  DEFAULT: 'default',
  HEADER_RESOLVED: 'HE ok',
  HEADER_UNRESOLVED: 'no HE',
  OTP_VERIFIED: 'OTP ok',
  MSISDN_CHECKED: 'then choose pack',
  PIN_REQUESTED: 'then enter PIN',
  PIN_CONFIRMED: 'then wait for activation',
  ENTITLED: 'already active',
  ACTIVATED: 'activated',
  SUBSCRIBED: 'subscribed',
  PENDING: 'pending',
  LOW_BALANCE: 'low balance',
  BLOCKED: 'blocked',
  ERROR: 'error',
}

function resolveEntryPage(config) {
  const wanted = String(config?.entryPage || '').toUpperCase()
  if (wanted === 'API_EXPOSE') return 'API_EXPOSE'
  const nodes = config?.nodes || []
  if (!nodes.length) return 'HOME'
  if (wanted && nodes.some((n) => n.pageType === wanted)) return wanted
  if (nodes.some((n) => n.pageType === 'HOME')) return 'HOME'
  return nodes[0].pageType
}

/** Infer post-identity target: HOME (packs) | THANKYOU (skip HOME) | CONFIRM (legacy). */
export function resolveAfterIdentityTarget(flowConfig) {
  const edges = flowConfig?.edges || []
  const otpVerified = edges.find(
    (e) => (e.source === 'OTP' || e.source === 'otp') && String(e.condition || '').toUpperCase() === 'OTP_VERIFIED'
  )
  if (otpVerified) {
    const target = String(otpVerified.target || '').toUpperCase()
    if (target === 'THANKYOU' || target === 'HOME' || target === 'CONFIRM') return target
  }
  const heResolved = edges.find(
    (e) => (e.source === 'HOME' || e.source === 'home') && String(e.condition || '').toUpperCase() === 'HEADER_RESOLVED'
  )
  if (heResolved) {
    const target = String(heResolved.target || '').toUpperCase()
    if (target === 'THANKYOU' || target === 'HOME' || target === 'CONFIRM') return target
  }
  const hasConfirm = (flowConfig?.nodes || []).some((n) => n.pageType === 'CONFIRM' || n.id === 'CONFIRM')
  return hasConfirm ? 'CONFIRM' : 'HOME'
}

/** @deprecated use resolveAfterIdentityTarget */
export function resolveAfterOtpTarget(flowConfig) {
  const target = resolveAfterIdentityTarget(flowConfig)
  return target === 'THANKYOU' ? 'THANKYOU' : target === 'HOME' ? 'HOME' : target
}

/**
 * Build a compact read-only path for Campaign Detail.
 * Prefers saved flowConfig edges; falls back to DEFAULT_FLOWS for the mode.
 */
export function buildFlowPathSummary(verificationMode, flowConfig, { cgRedirectUrl } = {}) {
  const mode = normalizeModeId(verificationMode)
  const modeMeta = VERIFICATION_MODES.find((m) => m.id === mode) || VERIFICATION_MODES.find((m) => m.id === 'BOTH')

  if (mode === 'OTP_ONLY' && isApiExposeEntry(flowConfig?.entryPage)) {
    return {
      mode,
      modeLabel: modeMeta.label,
      modeHint: modeMeta.hint,
      entryPage: 'API_EXPOSE',
      steps: [
        { id: 'expose_send', label: 'OTP send API' },
        { id: 'expose_verify', label: 'OTP verify API' },
      ],
      edges: [],
      note: 'API mediator only — no WAP pages. External clients call the exposed send/verify URLs.',
    }
  }

  if (mode === 'UNIVERSE_DCB' && isApiExposeEntry(flowConfig?.entryPage)) {
    return {
      mode,
      modeLabel: modeMeta.label,
      modeHint: modeMeta.hint,
      entryPage: 'API_EXPOSE',
      steps: [
        { id: 'dcb_pincode', label: 'Billing PIN request API' },
        { id: 'dcb_confirm', label: 'Billing PIN confirm API' },
        { id: 'dcb_status', label: 'Status poll API' },
      ],
      edges: [],
      note: 'DCB API mediator only — no WAP pages. Vendors call pincode / confirm / status with vendor ID in the path.',
    }
  }

  const config = flowConfig?.nodes?.length ? flowConfig : DEFAULT_FLOWS[mode] || DEFAULT_FLOWS.BOTH

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

  if (mode === 'CG_HOME') {
    return {
      mode,
      modeLabel: modeMeta.label,
      modeHint: modeMeta.hint,
      entryPage: 'HOME',
      steps: cgRedirectUrl
        ? [
            { id: 'HOME', label: 'HOME' },
            { id: 'cg', label: 'CG redirect', condition: 'subscribe + click_id' },
          ]
        : [
            { id: 'HOME', label: 'HOME' },
            { id: 'stay', label: 'Stay (no CG URL)', condition: 'null-flow' },
          ],
      edges: [],
      note: 'No HE. User sees HOME; Subscribe sends them to CG URL with click_id.',
    }
  }

  const entryPage = resolveEntryPage(config)
  const nodesById = Object.fromEntries((config.nodes || []).map((n) => [n.id, n]))
  const pageLabel = (id) => {
    const n = nodesById[id]
    return n?.pageType || id
  }

  const prioritySources = [entryPage, 'HOME', 'OTP', 'CONFIRM'].filter((v, i, arr) => arr.indexOf(v) === i)
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
      if (['INPROGRESS', 'LOW_BALANCE', 'BLOCKED', 'ERROR'].includes(type)) continue
      const skipToThankYou = edges.some(
        (ed) => ed.target === 'THANKYOU' && (ed.condition === 'OTP_VERIFIED' || ed.condition === 'HEADER_RESOLVED')
      )
      if (type === 'THANKYOU' && !skipToThankYou) continue
      visited.add(type)
      steps.push({ id: type, label: type })
      queue.push(e.target)
    }
  }
  if (
    !steps.some((s) => s.id === 'outcomes') &&
    (config.edges || []).some((e) => String(e.condition || '').toUpperCase() === 'SUBSCRIBED')
  ) {
    steps.push({ id: 'outcomes', label: 'outcomes' })
  }

  return {
    mode,
    modeLabel: modeMeta.label,
    modeHint: modeMeta.hint,
    entryPage,
    steps,
    edges,
    note:
      mode === 'UNIVERSE_DCB'
        ? 'Wifi: number → choose pack → PIN. HE: skip number, open packs. PIN reuses the number page.'
        : entryPage === 'OTP'
          ? 'Landing opens OTP directly. After PIN, HOME shows pack / subscribe CTAs unless Skip HOME is on.'
          : entryPage === 'API_EXPOSE'
            ? 'API mediator only — no WAP pages.'
            : 'Pack / subscribe CTAs live on HOME. Canvas “Go to page / URL / Priority” bypasses this path.',
  }
}
