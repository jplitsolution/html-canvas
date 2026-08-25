import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  describeVendorFireDecision,
} from './operator-callback-status.js';

describe('describeVendorFireDecision', () => {
  it('says allowed vs received when status is not in the list', () => {
    const d = describeVendorFireDecision('okefgvdsfv', null);
    assert.equal(d.shouldFire, false);
    assert.equal(d.received, 'okefgvdsfv');
    assert.match(d.allowedLabel, /active/);
    assert.match(d.info, /not in allowed statuses \[active/);
    assert.match(d.info, /received status "okefgvdsfv"/);
    assert.match(d.info, /not sent/);
  });

  it('uses assignment allow-list in the skip message', () => {
    const d = describeVendorFireDecision('unsub', 'parking, grace');
    assert.equal(d.shouldFire, false);
    assert.equal(d.allowedLabel, 'parking, grace');
    assert.match(d.info, /not in allowed statuses \[parking, grace\]/);
    assert.match(d.info, /received status "unsub"/);
  });

  it('confirms a matching status will fire', () => {
    const d = describeVendorFireDecision('grace', 'grace, parking');
    assert.equal(d.shouldFire, true);
    assert.match(d.info, /firing vendor postback/);
    assert.match(d.info, /"grace"/);
  });
});
