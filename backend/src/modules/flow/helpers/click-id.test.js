import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CLICK_ID_LENGTH, mintClickId } from './click-id.js';

describe('mintClickId', () => {
  it('returns 24 URL-safe chars', () => {
    const id = mintClickId();
    assert.equal(id.length, CLICK_ID_LENGTH);
    assert.match(id, /^[A-Za-z0-9_-]{24}$/);
  });

  it('does not collide in a small sample', () => {
    const seen = new Set(Array.from({ length: 200 }, () => mintClickId()));
    assert.equal(seen.size, 200);
  });
});
