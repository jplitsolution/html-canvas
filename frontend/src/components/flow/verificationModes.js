/**
 * Shared verification-mode definitions + default flow graphs (Layer B).
 *
 * WHY: Mode is the real admin knob for SUBSCRIBE/CONFIRM routing.
 * Default graphs match flow-engine.getDefaultFlowConfig — changing mode
 * regenerates these. Campaign Detail hosts the mode picker; Flow Builder
 * remains available as Advanced path editing.
 */

import { defaultStartConfig } from './startConfig'

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
    hint: 'No landing HE. Land on HOME, OTP page, or expose public send/verify APIs (mediator).',
    pathHint: 'HOME → OTP → Confirm (or OTP → Thank you), or API expose',
  },
  {
    id: 'BOTH',
    label: 'Header Injection + OTP',
    hint: 'Landing HE first. CTA: header OK → Confirm, else → OTP.',
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

/** True when OTP_ONLY campaign is API-mediator only (no WAP pages). */
export function isApiExposeEntry(entryPage) {
  return String(entryPage || '').toUpperCase() === 'API_EXPOSE'
}

function applyFunnelLayoutToDefaultFlow(config, funnelLayout) {
  if (!config || String(funnelLayout || '').toLowerCase() !== 'packs_on_home') {
    return config
  }
  const edges = (config.edges || []).map((e) => {
    if (String(e.condition || '').toUpperCase() !== 'OTP_VERIFIED') return e
    if (String(e.target || '').toUpperCase() !== 'CONFIRM') return e
    return { ...e, target: 'HOME', id: `${e.source}-OTP_VERIFIED-HOME` }
  })
  const hasConfirm = (config.nodes || []).some(
    (n) => n.pageType === 'CONFIRM' || n.id === 'CONFIRM',
  )
  const hasHome = (config.nodes || []).some(
    (n) => n.pageType === 'HOME' || n.id === 'HOME',
  )
  const nodes = hasHome
    ? config.nodes
    : [
        { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
        ...(config.nodes || []),
      ]
  const confirmReachable = edges.some(
    (e) => String(e.target || '').toUpperCase() === 'CONFIRM',
  )
  if (hasConfirm && !confirmReachable) {
    edges.push({
      id: 'HOME-DEFAULT-CONFIRM',
      source: 'HOME',
      target: 'CONFIRM',
      condition: 'DEFAULT',
    })
  }
  return { ...config, nodes, edges }
}

/**
 * Build default flow for a mode.
 * OTP_ONLY supports:
 *   entryPage 'HOME' | 'OTP' | 'API_EXPOSE'
 *   afterOtp 'CONFIRM' (pack/subscribe page) | 'THANKYOU' (pin-verify = subscribe)
 *   (afterOtp ignored when entryPage is API_EXPOSE)
 */
export function buildDefaultFlow(mode, { entryPage, afterOtp, funnelLayout } = {}) {
  const normalized = normalizeModeId(mode)
  const base = DEFAULT_FLOWS[normalized] || DEFAULT_FLOWS.BOTH
  const entry = String(entryPage || '').toUpperCase()
  const otpEntry = entry === 'OTP'
  const apiExpose = entry === 'API_EXPOSE'
  const skipConfirm = String(afterOtp || '').toUpperCase() === 'THANKYOU'

  if (normalized === 'OTP_ONLY') {
    if (apiExpose) {
      return {
        version: 1,
        entryPage: 'API_EXPOSE',
        startConfig: defaultStartConfig('OTP_ONLY'),
        nodes: [],
        edges: [],
      }
    }

    const outcomes = OUTCOME_NODES.map((n) => ({ ...n }))
    if (skipConfirm) {
      // Only pages reachable from OTP — avoid validate() unreachable errors.
      const thankYouOnly = [
        { id: 'THANKYOU', pageType: 'THANKYOU', position: { x: 880, y: 40 } },
        { id: 'BLOCKED', pageType: 'BLOCKED', position: { x: 880, y: 400 } },
        { id: 'ERROR', pageType: 'ERROR', position: { x: 880, y: 520 } },
      ]
      const otpToThankYou = {
        id: 'OTP-OTP_VERIFIED-THANKYOU',
        source: 'OTP',
        target: 'THANKYOU',
        condition: 'OTP_VERIFIED',
      }
      if (otpEntry) {
        return {
          version: 1,
          entryPage: 'OTP',
          startConfig: defaultStartConfig('OTP_ONLY'),
          nodes: [
            { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
            ...thankYouOnly,
          ],
          edges: [
            otpToThankYou,
            {
              id: 'OTP-BLOCKED-BLOCKED',
              source: 'OTP',
              target: 'BLOCKED',
              condition: 'BLOCKED',
            },
            {
              id: 'OTP-ERROR-ERROR',
              source: 'OTP',
              target: 'ERROR',
              condition: 'ERROR',
            },
          ],
        }
      }
      return {
        version: 1,
        entryPage: 'HOME',
        startConfig: defaultStartConfig('OTP_ONLY'),
        nodes: [
          { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
          { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
          ...thankYouOnly,
        ],
        edges: [
          { id: 'HOME-DEFAULT-OTP', source: 'HOME', target: 'OTP', condition: 'DEFAULT' },
          otpToThankYou,
          {
            id: 'OTP-BLOCKED-BLOCKED',
            source: 'OTP',
            target: 'BLOCKED',
            condition: 'BLOCKED',
          },
          {
            id: 'OTP-ERROR-ERROR',
            source: 'OTP',
            target: 'ERROR',
            condition: 'ERROR',
          },
          {
            id: 'HOME-BLOCKED-BLOCKED',
            source: 'HOME',
            target: 'BLOCKED',
            condition: 'BLOCKED',
          },
        ],
      }
    }

    if (otpEntry) {
      return applyFunnelLayoutToDefaultFlow(
        {
          version: 1,
          entryPage: 'OTP',
          startConfig: defaultStartConfig('OTP_ONLY'),
          nodes: [
            { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
            { id: 'CONFIRM', pageType: 'CONFIRM', position: { x: 600, y: 160 } },
            ...outcomes,
          ],
          edges: [
            {
              id: 'OTP-OTP_VERIFIED-CONFIRM',
              source: 'OTP',
              target: 'CONFIRM',
              condition: 'OTP_VERIFIED',
            },
            ...CONFIRM_EDGES.map((e) => ({ ...e })),
          ],
        },
        funnelLayout,
      )
    }
  }

  return applyFunnelLayoutToDefaultFlow(
    {
      version: 1,
      entryPage: base.entryPage || 'HOME',
      startConfig: defaultStartConfig(normalized),
      nodes: base.nodes.map((n) => ({ ...n })),
      edges: base.edges.map((e) => ({ ...e })),
    },
    funnelLayout,
  )
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
  const wanted = String(config?.entryPage || '').toUpperCase()
  if (wanted === 'API_EXPOSE') return 'API_EXPOSE'
  const nodes = config?.nodes || []
  if (!nodes.length) return 'HOME'
  if (wanted && nodes.some((n) => n.pageType === wanted)) return wanted
  if (nodes.some((n) => n.pageType === 'HOME')) return 'HOME'
  return nodes[0].pageType
}

/** Infer after-OTP target from saved edges (CONFIRM vs THANKYOU). */
export function resolveAfterOtpTarget(flowConfig) {
  const edges = flowConfig?.edges || []
  const otpVerified = edges.find(
    (e) =>
      (e.source === 'OTP' || e.source === 'otp') &&
      String(e.condition || '').toUpperCase() === 'OTP_VERIFIED',
  )
  if (!otpVerified) return 'CONFIRM'
  const target = String(otpVerified.target || '').toUpperCase()
  return target === 'THANKYOU' ? 'THANKYOU' : 'CONFIRM'
}

/**
 * Build a compact read-only path for Campaign Detail.
 * Prefers saved flowConfig edges; falls back to DEFAULT_FLOWS for the mode.
 */
export function buildFlowPathSummary(verificationMode, flowConfig, { cgRedirectUrl } = {}) {
  const mode = normalizeModeId(verificationMode)
  const modeMeta =
    VERIFICATION_MODES.find((m) => m.id === mode) ||
    VERIFICATION_MODES.find((m) => m.id === 'BOTH')

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
      const otpGoesThankYou = edges.some(
        (ed) => ed.source === 'OTP' && ed.target === 'THANKYOU',
      )
      if (type === 'THANKYOU' && !otpGoesThankYou) continue
      visited.add(type)
      steps.push({ id: type, label: type })
      queue.push(e.target)
    }
  }
  if (
    !steps.some((s) => s.id === 'outcomes') &&
    resolveAfterOtpTarget(config) === 'CONFIRM'
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
      entryPage === 'OTP'
        ? 'Landing opens OTP directly (HOME skipped). Use Advanced flow to remap edges.'
        : entryPage === 'API_EXPOSE'
          ? 'API mediator only — no WAP pages.'
          : 'Subscribe CTA uses this path. Canvas “Go to page / URL / Priority” bypasses it.',
  }
}
