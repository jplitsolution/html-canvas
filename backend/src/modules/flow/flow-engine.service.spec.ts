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
      expect(engine.normalizeMode('header_injection')).toBe('HEADER_INJECTION');
      expect(engine.normalizeMode('none')).toBe('NONE');
    });

    it('maps legacy MSISDN_ONLY to HEADER_INJECTION', () => {
      expect(engine.normalizeMode('msisdn_only')).toBe('HEADER_INJECTION');
      expect(engine.normalizeMode('MSISDN_ONLY')).toBe('HEADER_INJECTION');
    });

    it('maps legacy NULL to NONE', () => {
      expect(engine.normalizeMode('NULL')).toBe('NONE');
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
    it('HEADER_INJECTION routes HOME to CONFIRM on resolved and ERROR on unresolved', () => {
      const cfg = engine.getDefaultFlowConfig('HEADER_INJECTION');
      expect(
        engine.nextPage(cfg, CampaignPageType.HOME, 'HEADER_RESOLVED'),
      ).toBe(CampaignPageType.CONFIRM);
      expect(
        engine.nextPage(cfg, CampaignPageType.HOME, 'HEADER_UNRESOLVED'),
      ).toBe(CampaignPageType.ERROR);
    });

    it('accepts legacy MSISDN_* conditions as aliases of HEADER_*', () => {
      const cfg = engine.getDefaultFlowConfig('HEADER_INJECTION');
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

    it('BOTH: header OK → CONFIRM, missing → OTP', () => {
      const cfg = engine.getDefaultFlowConfig('BOTH');
      expect(
        engine.nextPage(cfg, CampaignPageType.HOME, 'HEADER_RESOLVED'),
      ).toBe(CampaignPageType.CONFIRM);
      expect(
        engine.nextPage(cfg, CampaignPageType.HOME, 'HEADER_UNRESOLVED'),
      ).toBe(CampaignPageType.OTP);
    });

    it('NONE is HOME-only with no graph edges', () => {
      const cfg = engine.getDefaultFlowConfig('NONE');
      expect(cfg.entryPage).toBe(CampaignPageType.HOME);
      expect(cfg.nodes.map((n) => n.pageType)).toEqual([CampaignPageType.HOME]);
      expect(cfg.edges).toHaveLength(0);
    });

    it('HEADER_INJECTION default graph has no OTP node', () => {
      const cfg = engine.getDefaultFlowConfig('HEADER_INJECTION');
      expect(cfg.nodes.some((n) => n.pageType === CampaignPageType.OTP)).toBe(
        false,
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

    it('entry page is always HOME', () => {
      expect(engine.getDefaultFlowConfig('BOTH').entryPage).toBe(
        CampaignPageType.HOME,
      );
      expect(engine.getDefaultFlowConfig('HEADER_INJECTION').entryPage).toBe(
        CampaignPageType.HOME,
      );
    });
  });

  describe('nextPage', () => {
    it('falls back to a DEFAULT edge when the condition has no specific edge', () => {
      const cfg = engine.getDefaultFlowConfig('OTP_ONLY');
      expect(
        engine.nextPage(cfg, CampaignPageType.HOME, 'HEADER_RESOLVED'),
      ).toBe(CampaignPageType.OTP);
    });

    it('returns null when no config is provided', () => {
      expect(engine.nextPage(null, CampaignPageType.HOME, 'DEFAULT')).toBeNull();
    });
  });

  describe('validate', () => {
    it('flags missing OTP node for OTP_ONLY / BOTH', () => {
      const cfg = engine.getDefaultFlowConfig('HEADER_INJECTION');
      cfg.nodes = cfg.nodes.filter((n) => n.pageType !== CampaignPageType.OTP);
      const res = engine.validate(cfg, 'BOTH');
      expect(res.ok).toBe(false);
      expect(res.errors.join(' ')).toContain('OTP');
    });

    it('passes a valid BOTH graph', () => {
      const cfg = engine.getDefaultFlowConfig('BOTH');
      const stripped = engine.stripUnreachableNodes(cfg, 'BOTH');
      const res = engine.validate(stripped, 'BOTH');
      expect(res.ok).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('passes NONE with only HOME', () => {
      const cfg = engine.getDefaultFlowConfig('NONE');
      const res = engine.validate(cfg, 'NONE');
      expect(res.ok).toBe(true);
    });

    it('flags unreachable nodes from the start page', () => {
      const cfg = engine.getDefaultFlowConfig('BOTH');
      cfg.edges = [];
      const res = engine.validate(cfg, 'BOTH');
      expect(res.ok).toBe(false);
      expect(res.errors.join(' ')).toContain('Unreachable from start page');
    });
  });
});
