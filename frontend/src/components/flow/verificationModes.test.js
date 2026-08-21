import { describe, it, expect } from 'vitest'
import {
  applyUniverseDcbGraphLayout,
  buildDefaultFlow,
  resolveAfterIdentityTarget,
  isApiExposeCampaign,
} from './verificationModes.js'
import { START_NODE_ID, END_NODE_ID, withVisualStartEnd } from './startConfig.js'

describe('buildDefaultFlow', () => {
  it('HE: HOME after resolve, no Confirm, miss → Error', () => {
    const cfg = buildDefaultFlow('HEADER_INJECTION', { afterIdentity: 'HOME' })
    expect(cfg.nodes.some((n) => n.pageType === 'CONFIRM')).toBe(false)
    expect(
      cfg.edges.some((e) => e.source === 'HOME' && e.condition === 'HEADER_UNRESOLVED' && e.target === 'ERROR')
    ).toBe(true)
    expect(resolveAfterIdentityTarget(cfg)).toBe('HOME')
  })

  it('HE: Skip HOME wires HEADER_RESOLVED → Thank you', () => {
    const cfg = buildDefaultFlow('HEADER_INJECTION', { afterIdentity: 'THANKYOU' })
    expect(
      cfg.edges.some((e) => e.source === 'HOME' && e.condition === 'HEADER_RESOLVED' && e.target === 'THANKYOU')
    ).toBe(true)
    expect(resolveAfterIdentityTarget(cfg)).toBe('THANKYOU')
  })

  it('OTP first then HOME packs, no Confirm', () => {
    const cfg = buildDefaultFlow('OTP_ONLY', {
      entryPage: 'OTP',
      afterIdentity: 'HOME',
    })
    expect(cfg.entryPage).toBe('OTP')
    expect(cfg.edges.some((e) => e.source === 'OTP' && e.condition === 'OTP_VERIFIED' && e.target === 'HOME')).toBe(
      true
    )
    expect(cfg.nodes.some((n) => n.pageType === 'CONFIRM')).toBe(false)
  })

  it('keeps Universe DCB in an isolated HE/manual and polling graph', () => {
    const cfg = buildDefaultFlow('UNIVERSE_DCB')
    expect(cfg.startConfig).toEqual({
      runHe: true,
      runBlocklist: true,
      runChecksub: true,
    })
    expect(cfg.entryPage).toBe('OTP')
    expect(cfg.nodes.find((node) => node.pageType === 'OTP')?.position).toEqual({ x: 300, y: 48 })
    expect(cfg.nodes.find((node) => node.pageType === 'HOME')?.position).toEqual({ x: 620, y: 48 })
    expect(cfg.nodes.some((node) => node.pageType === 'INPROGRESS')).toBe(true)
    expect(
      cfg.edges.some(
        (edge) => edge.source === 'OTP' && edge.condition === 'MSISDN_CHECKED' && edge.target === 'HOME'
      )
    ).toBe(true)
    expect(
      cfg.edges.some((edge) => edge.source === 'HOME' && edge.condition === 'PIN_REQUESTED' && edge.target === 'OTP')
    ).toBe(true)
    expect(
      cfg.edges.some(
        (edge) => edge.source === 'OTP' && edge.condition === 'PIN_CONFIRMED' && edge.target === 'INPROGRESS'
      )
    ).toBe(true)
    expect(
      cfg.edges.some(
        (edge) => edge.source === 'INPROGRESS' && edge.condition === 'ACTIVATED' && edge.target === 'THANKYOU'
      )
    ).toBe(true)

    const visual = withVisualStartEnd(cfg, cfg.startConfig, 'UNIVERSE_DCB')
    expect(
      visual.edges.some(
        (edge) => edge.source === START_NODE_ID && edge.condition === 'HEADER_RESOLVED' && edge.target === 'HOME'
      )
    ).toBe(true)
    expect(
      visual.edges.some(
        (edge) =>
          edge.source === START_NODE_ID && edge.condition === 'MANUAL_MSISDN_REQUIRED' && edge.target === 'OTP'
      )
    ).toBe(true)
    expect(
      visual.edges.some((edge) => edge.source === 'INPROGRESS' && edge.target === END_NODE_ID)
    ).toBe(false)
  })
})

describe('isApiExposeCampaign', () => {
  it('is true for OTP_ONLY or UNIVERSE_DCB with API_EXPOSE entry', () => {
    expect(
      isApiExposeCampaign({
        verificationMode: 'OTP_ONLY',
        flowConfig: { entryPage: 'API_EXPOSE' },
      }),
    ).toBe(true)
    expect(
      isApiExposeCampaign({
        verificationMode: 'UNIVERSE_DCB',
        flowConfig: { entryPage: 'API_EXPOSE' },
      }),
    ).toBe(true)
    expect(
      isApiExposeCampaign({
        verificationMode: 'OTP_ONLY',
        flowConfig: { entryPage: 'OTP' },
      }),
    ).toBe(false)
    expect(
      isApiExposeCampaign({
        verificationMode: 'UNIVERSE_DCB',
        flowConfig: { entryPage: 'OTP' },
      }),
    ).toBe(false)
    expect(
      isApiExposeCampaign({
        verificationMode: 'BOTH',
        flowConfig: { entryPage: 'API_EXPOSE' },
      }),
    ).toBe(false)
  })
})

describe('buildDefaultFlow UNIVERSE_DCB API_EXPOSE', () => {
  it('returns empty graph for API expose', () => {
    const flow = buildDefaultFlow('UNIVERSE_DCB', { entryPage: 'API_EXPOSE' })
    expect(flow.entryPage).toBe('API_EXPOSE')
    expect(flow.nodes).toEqual([])
    expect(flow.edges).toEqual([])
  })
})

describe('applyUniverseDcbGraphLayout', () => {
  it('keeps API_EXPOSE entry so refresh does not fall back to WAP funnel', () => {
    const laidOut = applyUniverseDcbGraphLayout({
      entryPage: 'API_EXPOSE',
      nodes: [],
      edges: [],
    })
    expect(laidOut.entryPage).toBe('API_EXPOSE')
  })

  it('defaults WAP funnel DCB graphs to OTP when entry is missing', () => {
    const laidOut = applyUniverseDcbGraphLayout({
      nodes: [{ id: 'OTP', pageType: 'OTP', position: { x: 0, y: 0 } }],
      edges: [],
    })
    expect(laidOut.entryPage).toBe('OTP')
    expect(laidOut.nodes[0].position).toEqual({ x: 300, y: 48 })
  })
})
