import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { flowEngineService } from './flow-engine.service.js';

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
});
