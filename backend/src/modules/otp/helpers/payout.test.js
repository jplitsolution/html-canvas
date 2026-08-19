import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePayoutPercent,
  shouldPayoutOtp,
} from './payout.js';

const payoutCount = (maxN, p) => {
  let paid = 0;
  for (let n = 1; n <= maxN; n += 1) {
    if (shouldPayoutOtp(n, p)) paid += 1;
  }
  return paid;
};

describe('parsePayoutPercent', () => {
  it('defaults missing / invalid to 100', () => {
    assert.equal(parsePayoutPercent(undefined), 100);
    assert.equal(parsePayoutPercent(null), 100);
    assert.equal(parsePayoutPercent(''), 100);
    assert.equal(parsePayoutPercent('nope'), 100);
  });

  it('clamps 0–100', () => {
    assert.equal(parsePayoutPercent(-5), 0);
    assert.equal(parsePayoutPercent(70.4), 70);
    assert.equal(parsePayoutPercent(150), 100);
  });
});

describe('shouldPayoutOtp', () => {
  it('P=100 never holds', () => {
    for (let n = 1; n <= 20; n += 1) {
      assert.equal(shouldPayoutOtp(n, 100), true);
    }
    assert.equal(shouldPayoutOtp(1, undefined), true);
  });

  it('P=0 always holds when seq is valid', () => {
    for (let n = 1; n <= 20; n += 1) {
      assert.equal(shouldPayoutOtp(n, 0), false);
    }
  });

  it('Redis down (n<=0) fail-opens to payout', () => {
    assert.equal(shouldPayoutOtp(0, 70), true);
    assert.equal(shouldPayoutOtp(0, 0), true);
    assert.equal(shouldPayoutOtp(-1, 70), true);
  });

  it('P=70 is exactly 7/10 and 70/100', () => {
    assert.equal(payoutCount(10, 70), 7);
    assert.equal(payoutCount(100, 70), 70);
  });

  it('P=70 spreads instead of a 70-then-30 block', () => {
    const firstTen = [];
    for (let n = 1; n <= 10; n += 1) {
      firstTen.push(shouldPayoutOtp(n, 70) ? 'P' : 'H');
    }
    assert.deepEqual(firstTen, ['H', 'P', 'P', 'H', 'P', 'P', 'H', 'P', 'P', 'P']);
  });
});
