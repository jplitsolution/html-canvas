import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldRunHeOnDetect } from './he-detect-gate.js';

describe('shouldRunHeOnDetect', () => {
  it('runs HE for HEADER_INJECTION and BOTH', () => {
    assert.equal(shouldRunHeOnDetect('HEADER_INJECTION'), true);
    assert.equal(shouldRunHeOnDetect('MSISDN_ONLY'), true);
    assert.equal(shouldRunHeOnDetect('BOTH'), true);
    assert.equal(shouldRunHeOnDetect(null), true);
    assert.equal(shouldRunHeOnDetect(undefined), true);
  });

  it('skips HE for OTP_ONLY and NONE', () => {
    assert.equal(shouldRunHeOnDetect('OTP_ONLY'), false);
    assert.equal(shouldRunHeOnDetect('NONE'), false);
    assert.equal(shouldRunHeOnDetect('NULL'), false);
  });

  it('respects startConfig.runHe=false on HE modes', () => {
    assert.equal(
      shouldRunHeOnDetect('HEADER_INJECTION', { runHe: false }),
      false,
    );
    assert.equal(shouldRunHeOnDetect('BOTH', { runHe: false }), false);
  });

  it('keeps HE on when startConfig.runHe=true', () => {
    assert.equal(
      shouldRunHeOnDetect('HEADER_INJECTION', { runHe: true }),
      true,
    );
  });

  it('never enables HE for OTP_ONLY even if startConfig.runHe=true', () => {
    assert.equal(shouldRunHeOnDetect('OTP_ONLY', { runHe: true }), false);
  });
});
