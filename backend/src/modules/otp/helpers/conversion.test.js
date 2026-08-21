import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { campaignVendorPerf, otpConversionStats } from './conversion.js';

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

describe('campaignVendorPerf', () => {
  it('WAP conv % is subscribe success over clicks', () => {
    const row = campaignVendorPerf({
      clicks: 200,
      subscribeSuccess: 50,
    });
    assert.equal(row.totalClicks, 200);
    assert.equal(row.conversions, 50);
    assert.equal(row.convPercent, 25);
  });

  it('API conv % is verified / requested and pub is after hold', () => {
    const row = campaignVendorPerf({
      clicks: 80,
      requested: 100,
      liveVerified: 50,
      held: 10,
      failedApi: 12,
      apiExpose: true,
    });
    assert.equal(row.totalClicks, 80);
    assert.equal(row.requestedApi, 100);
    assert.equal(row.verifiedApi, 50);
    assert.equal(row.failedApi, 12);
    assert.equal(row.convPercent, 50);
    assert.equal(row.pubConvPercent, 40);
  });
});
