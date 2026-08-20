import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DCB_OUTCOMES,
  normalizeUniverseDcbResponse,
} from './universe-dcb-normalizer.js';

const response = (items) => ({ data: { items } });

describe('normalizeUniverseDcbResponse', () => {
  it('requires active, entitled and current for entitlement', () => {
    assert.equal(
      normalizeUniverseDcbResponse(
        response([
          {
            status: 'ACTIVE',
            entitlementActive: true,
            current: true,
            serviceId: 'svc',
          },
        ]),
        {},
        { serviceId: 'svc' },
      ).outcome,
      DCB_OUTCOMES.ENTITLED,
    );
    for (const item of [
      { status: 'ACTIVE', entitlementActive: false, current: true },
      { status: 'TRIAL_ACTIVE', entitlementActive: true, current: false },
    ]) {
      assert.equal(
        normalizeUniverseDcbResponse(response([item])).outcome,
        DCB_OUTCOMES.NEW,
      );
    }
  });

  it('uses the requested service and then its current record', () => {
    const result = normalizeUniverseDcbResponse(
      response([
        {
          serviceId: 'other',
          status: 'ACTIVE',
          entitlementActive: true,
          current: true,
        },
        {
          serviceId: 'wanted',
          status: 'EXPIRED',
          entitlementActive: false,
          current: false,
        },
        {
          providerServiceId: 'wanted',
          status: 'TRIAL_ACTIVE',
          entitlementActive: true,
          current: true,
        },
      ]),
      {},
      { serviceId: 'wanted' },
    );
    assert.equal(result.outcome, DCB_OUTCOMES.ENTITLED);
    assert.equal(result.status, 'TRIAL_ACTIVE');
  });

  it('returns NEW when successful items are empty or service is absent', () => {
    assert.equal(
      normalizeUniverseDcbResponse(response([])).outcome,
      DCB_OUTCOMES.NEW,
    );
    assert.equal(
      normalizeUniverseDcbResponse(
        response([{ serviceId: 'one', status: 'ACTIVE', current: true }]),
        {},
        { serviceId: 'two' },
      ).outcome,
      DCB_OUTCOMES.NEW,
    );
  });

  it('maps pending, low balance and terminal statuses', () => {
    const expected = new Map([
      ['PENDING_PIN', DCB_OUTCOMES.PENDING],
      ['PENDING_CONFIRMATION', DCB_OUTCOMES.PENDING],
      ['PARKED_NO_BALANCE', DCB_OUTCOMES.LOW_BALANCE],
      ['SUSPENDED', DCB_OUTCOMES.LOW_BALANCE],
      ['DEACTIVATED', DCB_OUTCOMES.TERMINAL_FAILURE],
      ['EXPIRED', DCB_OUTCOMES.TERMINAL_FAILURE],
      ['FAILED', DCB_OUTCOMES.TERMINAL_FAILURE],
      ['CANCELLED', DCB_OUTCOMES.TERMINAL_FAILURE],
    ]);
    for (const [status, outcome] of expected) {
      assert.equal(
        normalizeUniverseDcbResponse(
          response([{ status, entitlementActive: false, current: true }]),
        ).outcome,
        outcome,
      );
    }
  });

  it('supports configurable nested paths and status sets', () => {
    const result = normalizeUniverseDcbResponse(
      {
        result: {
          subscriptions: [
            { meta: { state: 'waiting' }, flags: { current: true } },
          ],
        },
      },
      {
        normalizer: {
          itemsPath: 'result.subscriptions',
          statusPath: 'meta.state',
          currentPath: 'flags.current',
          entitlementActivePath: 'flags.entitled',
          pendingStatuses: ['WAITING'],
        },
      },
    );
    assert.equal(result.outcome, DCB_OUTCOMES.PENDING);
    assert.equal(result.status, 'WAITING');
  });

  it('accepts campaign responsePaths and bracket notation', () => {
    const result = normalizeUniverseDcbResponse(
      {
        result: {
          groups: [
            {
              subscriptions: [
                { state: 'PENDING_PIN', flags: { current: true } },
              ],
            },
          ],
        },
      },
      {
        responsePaths: {
          items: 'result.groups[0].subscriptions',
          status: 'state',
          current: 'flags.current',
        },
      },
    );
    assert.equal(result.outcome, DCB_OUTCOMES.PENDING);
  });

  it('returns PARSE_ERROR for null, malformed and unknown responses', () => {
    for (const payload of [
      null,
      {},
      { data: { items: null } },
      { success: false, data: { items: [] } },
      response([null]),
      response([{ status: 'SOMETHING_NEW' }]),
    ]) {
      assert.equal(
        normalizeUniverseDcbResponse(payload).outcome,
        DCB_OUTCOMES.PARSE_ERROR,
      );
    }
  });
});
