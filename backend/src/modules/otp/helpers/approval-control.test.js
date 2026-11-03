import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bucketFromDecisionKey,
  createApprovalControl,
  hashFallbackStatus,
} from './approval-control.js';

const memoryClient = () => {
  const store = new Map();
  const calls = [];
  return {
    calls,
    get: async (key) => (store.has(key) ? store.get(key) : null),
    set: async (key, value) => {
      store.set(key, value);
      return 'OK';
    },
    approvalControl: async (...args) => {
      calls.push(args);
      return ['approved', '1', '1', '1', '1', '70', '2'];
    },
  };
};

describe('determineApprovalStatus', () => {
  it('returns pending at 0 and approved at 100 without Redis', async () => {
    const client = memoryClient();
    const { determineApprovalStatus } = createApprovalControl({
      getClient: () => client,
    });
    assert.equal(
      await determineApprovalStatus({
        entityId: 'c1:v2',
        decisionKey: 'click-a',
        approvalPercentage: 0,
      }),
      'pending',
    );
    assert.equal(
      await determineApprovalStatus({
        entityId: 'c1:v2',
        decisionKey: 'click-b',
        approvalPercentage: 100,
      }),
      'approved',
    );
    assert.equal(client.calls.length, 0);
  });

  it('reuses the stored decision and does not call Lua again', async () => {
    const client = memoryClient();
    const { determineApprovalStatus } = createApprovalControl({
      getClient: () => client,
    });
    const input = {
      entityId: 'c9:v4',
      decisionKey: 'click-same',
      approvalPercentage: 70,
    };
    assert.equal(await determineApprovalStatus(input), 'approved');
    assert.equal(await determineApprovalStatus(input), 'approved');
    assert.equal(client.calls.length, 1);
  });

  it('uses the hash fallback when Redis throws', async () => {
    const client = {
      get: async () => {
        throw new Error('redis down');
      },
      approvalControl: async () => {
        throw new Error('redis down');
      },
    };
    const { determineApprovalStatus } = createApprovalControl({
      getClient: () => client,
    });
    const status = await determineApprovalStatus({
      entityId: 'c3:v8',
      decisionKey: 'click-fallback',
      approvalPercentage: 70,
    });
    assert.equal(status, hashFallbackStatus('click-fallback', 70));
    assert.ok(status === 'approved' || status === 'pending');
  });

  it('bucket is stable in 0..9999', () => {
    const bucket = bucketFromDecisionKey('click-1');
    assert.equal(bucket, bucketFromDecisionKey('click-1'));
    assert.ok(bucket >= 0 && bucket <= 9999);
  });
});
