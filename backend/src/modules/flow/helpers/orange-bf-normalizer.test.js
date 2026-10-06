import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOrangeBfMsisdn } from './orange-bf-normalizer.js';

describe('normalizeOrangeBfMsisdn', () => {
  it('prepends 226 to local 8-digit numbers', () => {
    assert.equal(normalizeOrangeBfMsisdn('70123456'), '22670123456');
    assert.equal(normalizeOrangeBfMsisdn('+226 70 12 34 56'), '22670123456');
  });

  it('keeps numbers that already include 226', () => {
    assert.equal(normalizeOrangeBfMsisdn('22670123456'), '22670123456');
  });

  it('strips a national leading zero before prefixing', () => {
    assert.equal(normalizeOrangeBfMsisdn('070123456'), '22670123456');
  });

  it('returns empty for blank input', () => {
    assert.equal(normalizeOrangeBfMsisdn(''), '');
    assert.equal(normalizeOrangeBfMsisdn(null), '');
  });
});
