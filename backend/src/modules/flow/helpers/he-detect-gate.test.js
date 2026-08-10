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
});
