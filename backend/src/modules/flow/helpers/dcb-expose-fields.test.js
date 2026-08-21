import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickDcbExposeRequestId } from './dcb-expose-fields.js';

describe('pickDcbExposeRequestId', () => {
  it('reads requestId, request_id, or id', () => {
    assert.equal(pickDcbExposeRequestId({ requestId: '16726123' }), '16726123');
    assert.equal(pickDcbExposeRequestId({ request_id: 'abc' }), 'abc');
    assert.equal(pickDcbExposeRequestId({ id: '9' }), '9');
  });

  it('prefers requestId over aliases', () => {
    assert.equal(
      pickDcbExposeRequestId({ requestId: 'first', request_id: 'second', id: 'third' }),
      'first',
    );
  });

  it('returns empty when missing', () => {
    assert.equal(pickDcbExposeRequestId({}), '');
    assert.equal(pickDcbExposeRequestId({ pin: '1234', msisdn: '566891023' }), '');
  });
});
