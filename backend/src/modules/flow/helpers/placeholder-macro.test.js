import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filledTrackingValue,
  isUnfilledTrackingMacro,
} from './placeholder-macro.js';

describe('placeholder-macro', () => {
  it('treats empty and brace macros as unfilled', () => {
    assert.equal(isUnfilledTrackingMacro(''), true);
    assert.equal(isUnfilledTrackingMacro('{}'), true);
    assert.equal(isUnfilledTrackingMacro('{gclid}'), true);
    assert.equal(isUnfilledTrackingMacro('{click_id}'), true);
    assert.equal(isUnfilledTrackingMacro('{campaignid}'), true);
    assert.equal(isUnfilledTrackingMacro('  {GCLID}  '), true);
  });

  it('keeps real click ids', () => {
    assert.equal(isUnfilledTrackingMacro('Cj0KCQjw'), false);
    assert.equal(isUnfilledTrackingMacro('abc-123'), false);
    assert.equal(filledTrackingValue('{}'), '');
    assert.equal(filledTrackingValue('TeA1click'), 'TeA1click');
  });
});
