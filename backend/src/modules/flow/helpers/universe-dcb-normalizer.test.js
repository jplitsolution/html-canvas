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

  it('supports direct array payloads from provider without current flag', () => {
    const rawArray = [
      {
        id: 77,
        subscriptionUuid: '8c3664fd-6b3c-4f44-a792-2cc441226fb6',
        msisdn: '+972566891023',
        serviceId: 581,
        lifecycleNo: 11,
        status: 'PENDING_PIN',
        billingStatus: null,
        entitlementActive: false,
      },
    ];
    const pendingResult = normalizeUniverseDcbResponse(rawArray, {}, { serviceId: '581' });
    assert.equal(pendingResult.outcome, DCB_OUTCOMES.PENDING);
    assert.equal(pendingResult.status, 'PENDING_PIN');
    assert.equal(pendingResult.current, true);
    assert.equal(pendingResult.subscriptionUuid, '8c3664fd-6b3c-4f44-a792-2cc441226fb6');

    const activeArray = [
      {
        id: 78,
        msisdn: '+972566891023',
        serviceId: 581,
        status: 'ACTIVE',
        entitlementActive: true,
      },
    ];
    const activeResult = normalizeUniverseDcbResponse(activeArray, {}, { serviceId: '581' });
    assert.equal(activeResult.outcome, DCB_OUTCOMES.ENTITLED);
    assert.equal(activeResult.status, 'ACTIVE');
    assert.equal(activeResult.current, true);
  });

  it('supports Spring Data page responses ({ content: [ ... ], totalElements: 1 })', () => {
    const pageResponse = {
      content: [
        {
          id: 101,
          msisdn: '+972566891023',
          serviceId: 581,
          status: 'PARKED_NO_BALANCE',
          entitlementActive: false,
          current: true,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    };
    const result = normalizeUniverseDcbResponse(pageResponse, {}, { serviceId: '581' });
    assert.equal(result.outcome, DCB_OUTCOMES.LOW_BALANCE);
    assert.equal(result.status, 'PARKED_NO_BALANCE');
  });

  it('supports subscription envelope and single subscription object', () => {
    const envelopeResponse = {
      subscription: [
        {
          id: 102,
          serviceId: 581,
          status: 'ACTIVE',
          entitlementActive: true,
        },
      ],
    };
    const envelopeResult = normalizeUniverseDcbResponse(envelopeResponse, {}, { serviceId: '581' });
    assert.equal(envelopeResult.outcome, DCB_OUTCOMES.ENTITLED);
    assert.equal(envelopeResult.status, 'ACTIVE');

    const singleObject = {
      status: 'PARKED_NO_BALANCE',
      serviceId: 581,
    };
    const singleResult = normalizeUniverseDcbResponse(singleObject, {}, { serviceId: '581' });
    assert.equal(singleResult.outcome, DCB_OUTCOMES.LOW_BALANCE);
    assert.equal(singleResult.status, 'PARKED_NO_BALANCE');
  });

  it('handles Capital S Success: false in normalizer', () => {
    const result = normalizeUniverseDcbResponse({
      Success: false,
      ErrorCode: 'UnknownSubscriber',
    });
    assert.equal(result.outcome, DCB_OUTCOMES.PARSE_ERROR);
    assert.equal(result.reason, 'UPSTREAM_UNSUCCESSFUL');
  });
});

