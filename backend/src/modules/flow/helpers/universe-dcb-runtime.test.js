import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decorateUniverseDcbDetectResponse,
  decorateUniverseDcbPageResponse,
  dcbFlowContextForPage,
} from './universe-dcb-runtime.js';

describe('Universe DCB detect runtime', () => {
  it('routes a missing phone to manual MSISDN on OTP', () => {
    const result = decorateUniverseDcbDetectResponse(
      { phone: '', nextPage: null, successRedirectUrl: 'https://example.test' },
      null,
    );
    assert.equal(result.nextPage, 'OTP');
    assert.equal(result.successRedirectUrl, null);
    assert.equal(result.flowContext.stage, 'MANUAL_MSISDN');
    assert.equal(result.verificationMode, 'UNIVERSE_DCB');
  });

  it('maps normalized outcomes to funnel pages', () => {
    const expected = new Map([
      ['ENTITLED', 'THANKYOU'],
      ['NEW', 'HOME'],
      ['LOW_BALANCE', 'LOW_BALANCE'],
      ['PENDING', 'INPROGRESS'],
      ['TERMINAL_FAILURE', 'ERROR'],
      ['PARSE_ERROR', 'ERROR'],
    ]);
    for (const [outcome, page] of expected) {
      const result = decorateUniverseDcbDetectResponse(
        { phone: '9725550001', successRedirectUrl: 'https://example.test' },
        { outcome, status: outcome },
      );
      assert.equal(result.nextPage, page);
      assert.equal(result.flowContext.outcome, outcome);
      assert.equal(result.successRedirectUrl, null);
    }
  });
});

describe('Universe DCB page runtime', () => {
  it('provides identity and PIN stages from phone presence', () => {
    assert.equal(dcbFlowContextForPage('HOME', '').stage, 'MANUAL_MSISDN');
    assert.equal(dcbFlowContextForPage('OTP', '').stage, 'MANUAL_MSISDN');
    assert.equal(dcbFlowContextForPage('HOME', '555').stage, 'PLAN_SELECT');
    assert.equal(dcbFlowContextForPage('OTP', '555').stage, 'PIN_REQUIRED');
  });

  it('adds polling timings and outcome contexts', () => {
    const response = decorateUniverseDcbPageResponse(
      { pageType: 'INPROGRESS' },
      '555',
      { pollIntervalMs: 2500, pollTimeoutMs: 45000 },
    );
    assert.equal(response.verificationMode, 'UNIVERSE_DCB');
    assert.equal(response.flowContext.stage, 'POLLING');
    assert.equal(response.flowContext.pollIntervalMs, 2500);
    assert.equal(response.flowContext.pollTimeoutMs, 45000);
    assert.equal(dcbFlowContextForPage('THANKYOU', '555').outcome, 'ENTITLED');
    assert.equal(
      dcbFlowContextForPage('LOW_BALANCE', '555').outcome,
      'LOW_BALANCE',
    );
    assert.equal(
      dcbFlowContextForPage('ERROR', '555').outcome,
      'TERMINAL_FAILURE',
    );
  });
});
