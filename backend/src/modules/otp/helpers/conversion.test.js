import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiExposePinStats,
  campaignVendorPerf,
  otpConversionStats,
} from './conversion.js';

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
    assert.equal(row.pubConvPercent, 0);
  });

  it('CG conv % is matched operator callbacks over clicks', () => {
    const row = campaignVendorPerf({
      clicks: 100,
      subscribeSuccess: 0,
      postbacksMatched: 8,
      postbacksSent: 6,
    });
    assert.equal(row.conversions, 8);
    assert.equal(row.convPercent, 8);
    assert.equal(row.pubConvPercent, 6);
  });

  it('WAP uses the larger of subscribe success and matched callbacks', () => {
    const row = campaignVendorPerf({
      clicks: 50,
      subscribeSuccess: 10,
      postbacksMatched: 4,
      postbacksSent: 4,
    });
    assert.equal(row.conversions, 10);
    assert.equal(row.convPercent, 20);
    assert.equal(row.pubConvPercent, 8);
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

  it('carries the PIN leg breakdown for API expose rows', () => {
    const row = campaignVendorPerf({
      clicks: 120,
      requested: 90,
      liveVerified: 40,
      held: 8,
      apiExpose: true,
      pinRequest: 120,
      uniquePinSend: 70,
      pinValRequest: 60,
      uniquePinValRequest: 45,
      uniquePinVal: 33,
    });
    assert.equal(row.pinRequest, 120);
    assert.equal(row.pinSendSuccess, 90);
    assert.equal(row.uniquePinSend, 70);
    assert.equal(row.pinValRequest, 60);
    assert.equal(row.uniquePinValRequest, 45);
    assert.equal(row.pinValSuccess, 40);
    assert.equal(row.uniquePinVal, 33);
    assert.equal(row.sendConversion, 32);
    assert.equal(row.advCrPercent, 33.3);
    assert.equal(row.pubCrPercent, 26.7);
  });
});

describe('apiExposePinStats', () => {
  it('send conversion is validated minus the payout hold', () => {
    const stats = apiExposePinStats({
      pinRequest: 200,
      pinSendSuccess: 180,
      uniquePinSend: 150,
      pinValRequest: 100,
      uniquePinValRequest: 90,
      pinValSuccess: 50,
      uniquePinVal: 48,
      held: 10,
    });
    assert.equal(stats.sendConversion, 40);
    assert.equal(stats.held, 10);
    assert.equal(stats.advCrPercent, 25);
    assert.equal(stats.pubCrPercent, 20);
  });

  it('reports no money fields', () => {
    const stats = apiExposePinStats({ pinRequest: 10, pinValSuccess: 5 });
    for (const key of Object.keys(stats)) {
      assert.ok(!/amount|profit|revenue|payout/i.test(key), `unexpected key ${key}`);
    }
  });

  it('clamps requests below their own success counts and unique above total', () => {
    const stats = apiExposePinStats({
      pinRequest: 2,
      pinSendSuccess: 9,
      uniquePinSend: 99,
      pinValRequest: 1,
      uniquePinValRequest: 40,
      pinValSuccess: 7,
      uniquePinVal: 30,
      held: 100,
    });
    assert.equal(stats.pinRequest, 9);
    assert.equal(stats.uniquePinSend, 9);
    assert.equal(stats.pinValRequest, 7);
    assert.equal(stats.uniquePinValRequest, 7);
    assert.equal(stats.uniquePinVal, 7);
    assert.equal(stats.held, 7);
    assert.equal(stats.sendConversion, 0);
    assert.equal(stats.pubCrPercent, 0);
  });

  it('zeros out an empty vendor', () => {
    const stats = apiExposePinStats();
    assert.equal(stats.pinRequest, 0);
    assert.equal(stats.sendConversion, 0);
    assert.equal(stats.advCrPercent, 0);
  });
});
