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
  if (m === 'OTP_ONLY' || m === 'NONE' || m === 'CG_HOME') {
    return {
      runHe: false,
      runBlocklist: m === 'OTP_ONLY',
      runChecksub: m === 'OTP_ONLY',
    }
  }
  if (m === 'ORANGE_BF') {
    return {
      runHe: false,
      runBlocklist: true,
      runChecksub: true,
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

/** Strip START/END and fold visual OTP split nodes back into the single persisted page graph. */
export function stripMetaNodes(flowConfig) {
  if (!flowConfig) return flowConfig
  let nodes = (flowConfig.nodes || []).filter((n) => !isMetaPageType(n.pageType) && !isMetaNodeId(n.id))
  let edges = (flowConfig.edges || []).filter(
    (e) => !isMetaNodeId(e.source) && !isMetaNodeId(e.target)
  )

  const hasOtpSplit = nodes.some((n) => n.id === 'OTP_NUMBER' || n.id === 'OTP_VERIFY')
  if (hasOtpSplit) {
    const otpNumberNode = nodes.find((n) => n.id === 'OTP_NUMBER')
    const otpVerifyNode = nodes.find((n) => n.id === 'OTP_VERIFY')
    const remainingNodes = nodes.filter((n) => n.id !== 'OTP_NUMBER' && n.id !== 'OTP_VERIFY')
    const pos = otpNumberNode?.position || otpVerifyNode?.position || { x: 260, y: 160 }
    nodes = [...remainingNodes, { id: 'OTP', pageType: 'OTP', position: pos }]

    edges = edges
      .filter(
        (e) =>
          !(
            (e.source === 'OTP_NUMBER' && e.target === 'OTP_VERIFY') ||
            (e.source === 'OTP_VERIFY' && e.target === 'OTP_NUMBER')
          )
      )
      .map((e) => {
        const source = e.source === 'OTP_NUMBER' || e.source === 'OTP_VERIFY' ? 'OTP' : e.source
        const target = e.target === 'OTP_NUMBER' || e.target === 'OTP_VERIFY' ? 'OTP' : e.target
        return { ...e, source, target }
      })

    const seenEdges = new Set()
    edges = edges.filter((e) => {
      const key = `${e.source}->${e.target}:${e.condition || 'DEFAULT'}`
      if (seenEdges.has(key)) return false
      seenEdges.add(key)
      return true
    })
  }

  const nodeIds = new Set(nodes.map((n) => n.id))
  edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))

  let entryPage = flowConfig.entryPage
  if (entryPage === 'OTP_NUMBER' || entryPage === 'OTP_VERIFY') {
    entryPage = 'OTP'
  }

  return { ...flowConfig, entryPage, nodes, edges }
}

/**
 * Inject visual START → entry and outcome → END for the React Flow canvas,
 * and visually split the OTP page into Mobile Number and Verify OTP screens.
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

  const dcbMode = String(mode || '').toUpperCase() === 'UNIVERSE_DCB'
  const isOrangeBf = String(mode || '').toUpperCase() === 'ORANGE_BF'
  const otpNode = (base.nodes || []).find((n) => n.pageType === 'OTP')
  const shouldSplitOtp = Boolean(otpNode && !dcbMode && !isOrangeBf)

  let workingNodes = [...(base.nodes || [])]
  let workingEdges = [...(base.edges || [])]

  if (shouldSplitOtp) {
    const otpNumberNode = {
      id: 'OTP_NUMBER',
      pageType: 'OTP',
      step: 'number',
      label: 'Mobile Number',
      subtitle: 'Enter mobile number',
      position: { ...(otpNode.position || { x: 260, y: 160 }) },
      kind: 'page',
    }
    const otpVerifyNode = {
      id: 'OTP_VERIFY',
      pageType: 'OTP',
      step: 'otp',
      label: 'Verify OTP',
      subtitle: 'Enter SMS code',
      position: {
        x: Math.max((otpNode.position?.x || 260) + 220, 480),
        y: otpNode.position?.y || 160,
      },
      kind: 'page',
    }

    const otherNodes = workingNodes
      .filter((n) => n.id !== otpNode.id)
      .map((n) => {
        const px = n.position?.x || 0
        if (px >= (otpNode.position?.x || 260) && px < otpVerifyNode.position.x + 180) {
          return {
            ...n,
            position: { x: Math.max(px, otpVerifyNode.position.x + 200), y: n.position?.y || 160 },
          }
        }
        return n
      })

    workingNodes = [otpNumberNode, otpVerifyNode, ...otherNodes]

    workingEdges = workingEdges.map((e) => {
      let source = e.source
      let target = e.target
      if (source === otpNode.id || source === 'OTP') source = 'OTP_VERIFY'
      if (target === otpNode.id || target === 'OTP') target = 'OTP_NUMBER'
      return { ...e, source, target }
    })

    workingEdges.push({
      id: 'OTP_NUMBER-OTP_sent-OTP_VERIFY',
      source: 'OTP_NUMBER',
      target: 'OTP_VERIFY',
      condition: 'OTP sent',
    })
  }

  const entryNode = workingNodes.find((n) => n.pageType === entry || n.id === entry)
  const entryId =
    shouldSplitOtp && (entry === 'OTP' || entry === otpNode?.id)
      ? 'OTP_NUMBER'
      : entryNode?.id || entry
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

  const outcomeTypes = new Set(
    dcbMode
      ? ['THANKYOU', 'LOW_BALANCE', 'BLOCKED', 'ERROR']
      : isOrangeBf
        ? ['THANKYOU', 'BLOCKED', 'ERROR']
        : ['THANKYOU', 'INPROGRESS', 'LOW_BALANCE', 'BLOCKED', 'ERROR']
  )
  const outcomeNodes = workingNodes.filter((n) => outcomeTypes.has(n.pageType))
  if (outcomeNodes.length) {
    const avgY = outcomeNodes.reduce((s, n) => s + (n.position?.y || 160), 0) / outcomeNodes.length
    const maxX = Math.max(...outcomeNodes.map((n) => n.position?.x || 880), 880)
    endNode.position = { x: maxX + 200, y: avgY }
  }

  const homeNode = workingNodes.find((n) => n.pageType === 'HOME')
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
    nodes: [startNode, ...workingNodes, endNode],
    edges: [...workingEdges, ...extraEdges],
  }
}
