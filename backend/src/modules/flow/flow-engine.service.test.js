import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { flowEngineService } from './flow-engine.service.js';

describe('getDefaultFlowConfig packs_on_home', () => {
  it('OTP_ONLY: OTP_VERIFIED → HOME, CONFIRM stays reachable', () => {
    const cfg = flowEngineService.getDefaultFlowConfig('OTP_ONLY', {
      funnelLayout: 'packs_on_home',
    });
    assert.equal(
      flowEngineService.nextPage(cfg, 'OTP', 'OTP_VERIFIED'),
      'HOME',
    );
    assert.equal(flowEngineService.nextPage(cfg, 'HOME', 'DEFAULT'), 'OTP');
    const { ok, errors } = flowEngineService.validate(cfg, 'OTP_ONLY');
    assert.equal(ok, true, errors.join(' '));
  });

  it('BOTH: OTP_VERIFIED → HOME; HE hit still reaches CONFIRM', () => {
    const cfg = flowEngineService.getDefaultFlowConfig('BOTH', {
      funnelLayout: 'packs_on_home',
    });
    assert.equal(
      flowEngineService.nextPage(cfg, 'OTP', 'OTP_VERIFIED'),
      'HOME',
    );
    assert.equal(
      flowEngineService.nextPage(cfg, 'HOME', 'HEADER_RESOLVED'),
      'CONFIRM',
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
