import { describe, it, expect } from 'vitest'
import { withVisualStartEnd, stripMetaNodes, START_NODE_ID, END_NODE_ID } from '../../src/components/flow/startConfig.js'
import { campaignEditPath } from '../../src/utils/routes.js'

describe('Flow Builder 2-Step OTP visual split', () => {
  const baseFlow = {
    version: 1,
    entryPage: 'OTP',
    startConfig: { runHe: false, runBlocklist: true, runChecksub: true },
    nodes: [
      { id: 'OTP', pageType: 'OTP', position: { x: 260, y: 160 } },
      { id: 'THANKYOU', pageType: 'THANKYOU', position: { x: 700, y: 40 } },
      { id: 'BLOCKED', pageType: 'BLOCKED', position: { x: 700, y: 300 } },
      { id: 'ERROR', pageType: 'ERROR', position: { x: 700, y: 450 } },
    ],
    edges: [
      { id: 'e1', source: 'OTP', target: 'THANKYOU', condition: 'OTP_VERIFIED' },
      { id: 'e2', source: 'OTP', target: 'BLOCKED', condition: 'BLOCKED' },
      { id: 'e3', source: 'OTP', target: 'ERROR', condition: 'ERROR' },
    ],
  }

  it('splits single OTP node into Mobile Number and Verify OTP nodes in withVisualStartEnd', () => {
    const visual = withVisualStartEnd(baseFlow, baseFlow.startConfig, 'OTP_ONLY')

    const nodeIds = visual.nodes.map((n) => n.id)
    expect(nodeIds).toContain(START_NODE_ID)
    expect(nodeIds).toContain('OTP_NUMBER')
    expect(nodeIds).toContain('OTP_VERIFY')
    expect(nodeIds).toContain(END_NODE_ID)
    expect(nodeIds).not.toContain('OTP') // Replaced by the 2 split screens

    const numberNode = visual.nodes.find((n) => n.id === 'OTP_NUMBER')
    expect(numberNode.label).toBe('Mobile Number')
    expect(numberNode.subtitle).toBe('Enter mobile number')
    expect(numberNode.step).toBe('number')

    const verifyNode = visual.nodes.find((n) => n.id === 'OTP_VERIFY')
    expect(verifyNode.label).toBe('Verify OTP')
    expect(verifyNode.subtitle).toBe('Enter SMS code')
    expect(verifyNode.step).toBe('otp')

    // START should connect to OTP_NUMBER
    const startEdge = visual.edges.find((e) => e.source === START_NODE_ID)
    expect(startEdge).toBeDefined()
    expect(startEdge.target).toBe('OTP_NUMBER')
    expect(startEdge.condition).toBe('AFTER_CHECKS')

    // OTP_NUMBER should connect to OTP_VERIFY
    const internalEdge = visual.edges.find((e) => e.source === 'OTP_NUMBER' && e.target === 'OTP_VERIFY')
    expect(internalEdge).toBeDefined()
    expect(internalEdge.condition).toBe('OTP sent')

    // OTP_VERIFY should connect to outcome nodes
    const verifyEdges = visual.edges.filter((e) => e.source === 'OTP_VERIFY')
    expect(verifyEdges.some((e) => e.target === 'THANKYOU')).toBe(true)
    expect(verifyEdges.some((e) => e.target === 'BLOCKED')).toBe(true)
    expect(verifyEdges.some((e) => e.target === 'ERROR')).toBe(true)
  })

  it('folds OTP_NUMBER and OTP_VERIFY cleanly back into OTP on stripMetaNodes (saving)', () => {
    const visual = withVisualStartEnd(baseFlow, baseFlow.startConfig, 'OTP_ONLY')
    const saved = stripMetaNodes(visual)

    const nodeIds = saved.nodes.map((n) => n.id)
    expect(nodeIds).toContain('OTP')
    expect(nodeIds).not.toContain('OTP_NUMBER')
    expect(nodeIds).not.toContain('OTP_VERIFY')
    expect(nodeIds).not.toContain(START_NODE_ID)
    expect(nodeIds).not.toContain(END_NODE_ID)

    expect(saved.entryPage).toBe('OTP')

    // Internal edge should be removed
    const internalEdge = saved.edges.find((e) => e.source === 'OTP' && e.target === 'OTP')
    expect(internalEdge).toBeUndefined()

    // Outgoing edges should cleanly originate from OTP
    const otpEdges = saved.edges.filter((e) => e.source === 'OTP')
    expect(otpEdges.some((e) => e.target === 'THANKYOU' && e.condition === 'OTP_VERIFIED')).toBe(true)
    expect(otpEdges.some((e) => e.target === 'BLOCKED' && e.condition === 'BLOCKED')).toBe(true)
    expect(otpEdges.some((e) => e.target === 'ERROR' && e.condition === 'ERROR')).toBe(true)
  })

  it('campaignEditPath formats step query param correctly', () => {
    const pathNumber = campaignEditPath('JO', 'ZA', '31', 'OTP', { step: 'number' })
    expect(pathNumber).toBe('/markets/JO/ZA/campaigns/31/edit/OTP?step=number')

    const pathOtp = campaignEditPath('JO', 'ZA', '31', 'OTP', { step: 'otp' })
    expect(pathOtp).toBe('/markets/JO/ZA/campaigns/31/edit/OTP?step=otp')

    const pathRegular = campaignEditPath('JO', 'ZA', '31', 'THANKYOU')
    expect(pathRegular).toBe('/markets/JO/ZA/campaigns/31/edit/THANKYOU')
  })
})
