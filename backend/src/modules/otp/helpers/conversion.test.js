import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { otpConversionStats } from './conversion.js';

describe('otpConversionStats', () => {
  it('requested vs verified ratio and hold split', () => {
    const stats = otpConversionStats({
      requested: 100,
      liveVerified: 50,
      held: 10,
    });
    assert.equal(stats.requested, 100);
    assert.equal(stats.verifiedLive, 50);
    assert.equal(stats.verifiedVendor, 40);
    assert.equal(stats.held, 10);
    assert.equal(stats.liveConvPercent, 50);
    assert.equal(stats.vendorConvPercent, 40);
    assert.equal(stats.holdPercent, 20);
  });

  it('zeros when nothing requested', () => {
    const stats = otpConversionStats({});
    assert.equal(stats.liveConvPercent, 0);
    assert.equal(stats.vendorConvPercent, 0);
    assert.equal(stats.holdPercent, 0);
  });

  it('cannot hold more than live verifies', () => {
    const stats = otpConversionStats({
      requested: 10,
      liveVerified: 4,
      held: 9,
    });
    assert.equal(stats.held, 4);
    assert.equal(stats.verifiedVendor, 0);
  });
});
