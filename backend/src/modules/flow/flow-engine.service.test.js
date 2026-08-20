import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { flowEngineService } from './flow-engine.service.js';

describe('verification modes', () => {
  it('accepts UNIVERSE_DCB without changing legacy aliases', () => {
    assert.equal(
      flowEngineService.normalizeMode('universe_dcb'),
      'UNIVERSE_DCB',
    );
    assert.equal(
      flowEngineService.normalizeMode('MSISDN_ONLY'),
      'HEADER_INJECTION',
    );
    assert.equal(flowEngineService.normalizeMode('NULL'), 'NONE');
  });

  it('builds isolated Universe DCB defaults', () => {
    const cfg = flowEngineService.getDefaultFlowConfig('UNIVERSE_DCB');
    assert.equal(cfg.startConfig.runHe, true);
    assert.equal(
      cfg.nodes.some((node) => node.pageType === 'CONFIRM'),
      false,
    );
    assert.equal(
      flowEngineService.nextPage(cfg, 'OTP', 'MSISDN_CHECKED'),
      'HOME',
    );
    assert.equal(
      flowEngineService.nextPage(cfg, 'HOME', 'PIN_REQUESTED'),
      'OTP',
    );
    assert.equal(
      flowEngineService.nextPage(cfg, 'OTP', 'PIN_CONFIRMED'),
      'INPROGRESS',
    );
    assert.equal(
      flowEngineService.nextPage(cfg, 'INPROGRESS', 'ACTIVATED'),
      'THANKYOU',
    );
  });
});

describe('getDefaultFlowConfig packs_on_home', () => {
  it('OTP_ONLY: OTP_VERIFIED → HOME, no Confirm node', () => {
    const cfg = flowEngineService.getDefaultFlowConfig('OTP_ONLY', {
      funnelLayout: 'packs_on_home',
    });
    assert.equal(
      flowEngineService.nextPage(cfg, 'OTP', 'OTP_VERIFIED'),
      'HOME',
    );
    assert.equal(cfg.entryPage, 'OTP');
    assert.equal(
      (cfg.nodes || []).some((n) => n.pageType === 'CONFIRM'),
      false,
    );
    const { ok, errors } = flowEngineService.validate(cfg, 'OTP_ONLY');
    assert.equal(ok, true, errors.join(' '));
  });

  it('BOTH: OTP_VERIFIED → HOME; HE hit stays on HOME', () => {
    const cfg = flowEngineService.getDefaultFlowConfig('BOTH', {
      funnelLayout: 'packs_on_home',
    });
    assert.equal(
      flowEngineService.nextPage(cfg, 'OTP', 'OTP_VERIFIED'),
      'HOME',
    );
    assert.equal(
      flowEngineService.nextPage(cfg, 'HOME', 'HEADER_UNRESOLVED'),
      'OTP',
    );
    assert.equal(
      (cfg.nodes || []).some((n) => n.pageType === 'CONFIRM'),
      false,
    );
  });

  it('classic OTP_ONLY still goes OTP → CONFIRM', () => {
    const cfg = flowEngineService.getDefaultFlowConfig('OTP_ONLY');
    assert.equal(
      flowEngineService.nextPage(cfg, 'OTP', 'OTP_VERIFIED'),
      'CONFIRM',
    );
  });

  it('classic HEADER_INJECTION has no Confirm; HOME is subscribe canvas', () => {
    const cfg = flowEngineService.getDefaultFlowConfig('HEADER_INJECTION');
    assert.equal(
      (cfg.nodes || []).some((n) => n.pageType === 'CONFIRM'),
      false,
    );
    assert.equal(
      flowEngineService.nextPage(cfg, 'HOME', 'HEADER_RESOLVED'),
      null,
    );
    assert.equal(
      flowEngineService.nextPage(cfg, 'HOME', 'SUBSCRIBED'),
      'THANKYOU',
    );
    const { ok, errors } = flowEngineService.validate(cfg, 'HEADER_INJECTION');
    assert.equal(ok, true, errors.join(' '));
  });
});
