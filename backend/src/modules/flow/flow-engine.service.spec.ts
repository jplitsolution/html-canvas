import { FlowEngineService } from './flow-engine.service';
import { CampaignPageType } from '../campaigns/entities/campaign-page.entity';

describe('FlowEngineService', () => {
  let engine: FlowEngineService;

  beforeEach(() => {
    engine = new FlowEngineService();
  });

  describe('normalizeMode', () => {
    it('normalizes valid modes case-insensitively', () => {
      expect(engine.normalizeMode('both')).toBe('BOTH');
      expect(engine.normalizeMode('OTP_ONLY')).toBe('OTP_ONLY');
      expect(engine.normalizeMode('msisdn_only')).toBe('MSISDN_ONLY');
    });

    it('returns null for unknown / empty values', () => {
      expect(engine.normalizeMode('')).toBeNull();
      expect(engine.normalizeMode('nope')).toBeNull();
      expect(engine.normalizeMode(undefined)).toBeNull();
    });
  });

  describe('parseFlowConfig', () => {
    it('parses valid JSON graph', () => {
      const raw = JSON.stringify({ version: 1, nodes: [], edges: [] });
      expect(engine.parseFlowConfig(raw)).toEqual({
        version: 1,
        nodes: [],
        edges: [],
      });
    });

    it('returns null on invalid / missing config', () => {
      expect(engine.parseFlowConfig(null)).toBeNull();
      expect(engine.parseFlowConfig('not json')).toBeNull();
      expect(engine.parseFlowConfig('{"nodes":1}')).toBeNull();
    });
  });

  describe('getDefaultFlowConfig', () => {
    it('MSISDN_ONLY routes HOME to CONFIRM on resolved and ERROR on unresolved', () => {
      const cfg = engine.getDefaultFlowConfig('MSISDN_ONLY');
      expect(
        engine.nextPage(cfg, CampaignPageType.HOME, 'MSISDN_RESOLVED'),
      ).toBe(CampaignPageType.CONFIRM);
      expect(
        engine.nextPage(cfg, CampaignPageType.HOME, 'MSISDN_UNRESOLVED'),
      ).toBe(CampaignPageType.ERROR);
    });

    it('OTP_ONLY routes HOME to OTP then CONFIRM', () => {
      const cfg = engine.getDefaultFlowConfig('OTP_ONLY');
      expect(engine.nextPage(cfg, CampaignPageType.HOME, 'DEFAULT')).toBe(
        CampaignPageType.OTP,
      );
      expect(engine.nextPage(cfg, CampaignPageType.OTP, 'OTP_VERIFIED')).toBe(
        CampaignPageType.CONFIRM,
      );
    });

    it('BOTH requires OTP (HOME -> OTP by default)', () => {
      const cfg = engine.getDefaultFlowConfig('BOTH');
      expect(engine.nextPage(cfg, CampaignPageType.HOME, 'DEFAULT')).toBe(
        CampaignPageType.OTP,
      );
    });

    it('CONFIRM terminal branches map to THANKYOU / BLOCKED / ERROR', () => {
      const cfg = engine.getDefaultFlowConfig('BOTH');
      expect(engine.nextPage(cfg, CampaignPageType.CONFIRM, 'SUBSCRIBED')).toBe(
        CampaignPageType.THANKYOU,
      );
      expect(engine.nextPage(cfg, CampaignPageType.CONFIRM, 'BLOCKED')).toBe(
        CampaignPageType.BLOCKED,
      );
      expect(engine.nextPage(cfg, CampaignPageType.CONFIRM, 'ERROR')).toBe(
        CampaignPageType.ERROR,
      );
    });
  });

  describe('nextPage', () => {
    it('falls back to a DEFAULT edge when the condition has no specific edge', () => {
      const cfg = engine.getDefaultFlowConfig('OTP_ONLY');
      // No MSISDN_RESOLVED edge exists in OTP_ONLY; falls back to DEFAULT (OTP).
      expect(
        engine.nextPage(cfg, CampaignPageType.HOME, 'MSISDN_RESOLVED'),
      ).toBe(CampaignPageType.OTP);
    });

    it('returns null when no config is provided', () => {
      expect(engine.nextPage(null, CampaignPageType.HOME, 'DEFAULT')).toBeNull();
    });
  });

  describe('validate', () => {
    it('flags missing OTP node for OTP_ONLY / BOTH', () => {
      const cfg = engine.getDefaultFlowConfig('MSISDN_ONLY'); // has no OTP edges, but node exists
      // Remove the OTP node to force the error.
      cfg.nodes = cfg.nodes.filter((n) => n.pageType !== CampaignPageType.OTP);
      const res = engine.validate(cfg, 'BOTH');
      expect(res.ok).toBe(false);
      expect(res.errors.join(' ')).toContain('OTP');
    });

    it('passes a valid BOTH graph', () => {
      const cfg = engine.getDefaultFlowConfig('BOTH');
      const res = engine.validate(cfg, 'BOTH');
      expect(res.ok).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('flags unreachable nodes from the start page', () => {
      const cfg = engine.getDefaultFlowConfig('BOTH');
      // Drop all edges so only the start page is reachable.
      cfg.edges = [];
      const res = engine.validate(cfg, 'BOTH');
      expect(res.ok).toBe(false);
      expect(res.errors.join(' ')).toContain('Unreachable from start page');
    });

    it('allows OTP as the configured start page', () => {
      const cfg = engine.getDefaultFlowConfig('OTP_ONLY');
      cfg.entryPage = CampaignPageType.OTP;
      cfg.edges = cfg.edges.filter(
        (e) => e.source !== CampaignPageType.HOME && e.target !== CampaignPageType.HOME,
      );
      cfg.nodes = cfg.nodes.filter((n) => n.pageType !== CampaignPageType.HOME);
      const res = engine.validate(cfg, 'OTP_ONLY');
      expect(res.ok).toBe(true);
    });
  });
});
