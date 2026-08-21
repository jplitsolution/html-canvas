import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DUMMY_DCB_MASTER_PIN,
  createDummyDcbHandlers,
  matchDummyNumber,
} from './dummy-dcb.js';

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

describe('Dummy Universe DCB APIs', () => {
  it('maps fixture numbers by suffix', () => {
    assert.equal(matchDummyNumber('972500000001'), '500000001');
    assert.equal(matchDummyNumber('500000003'), '500000003');
    assert.equal(matchDummyNumber('566891023'), null);
  });

  it('returns dummy purchase types and fixture directory', () => {
    const handlers = createDummyDcbHandlers({ log: () => {} });
    const configRes = mockRes();
    handlers.publicConfig({}, configRes);
    assert.equal(configRes.body.success, true);
    assert.equal(configRes.body.data.serviceId, 581);
    assert.equal(configRes.body.data.purchaseTypes.length, 6);

    const dirRes = mockRes();
    handlers.directory({}, dirRes);
    assert.equal(dirRes.body.masterPin, DUMMY_DCB_MASTER_PIN);
    assert.equal(dirRes.body.numbers.length, 6);
  });

  it('returns ACTIVE for 500000001 and empty items for a new number', async () => {
    const handlers = createDummyDcbHandlers({ log: () => {} });
    const active = mockRes();
    await handlers.subscriptions(
      { query: { msisdn: '500000001', serviceId: '581', current: 'true' } },
      active,
    );
    assert.equal(active.body.data.items[0].status, 'ACTIVE');
    assert.equal(active.body.data.items[0].entitlementActive, true);

    const fresh = mockRes();
    await handlers.subscriptions({ query: { msisdn: '500000002' } }, fresh);
    assert.deepEqual(fresh.body.data.items, []);

    const parked = mockRes();
    await handlers.subscriptions({ query: { msisdn: '500000003' } }, parked);
    assert.equal(parked.body.data.items[0].status, 'PARKED_NO_BALANCE');
  });

  it('prints a PIN and activates after confirm + polling', async () => {
    const logs = [];
    const handlers = createDummyDcbHandlers({
      log: (message) => logs.push(message),
    });
    const pinRes = mockRes();
    await handlers.pincode(
      {
        body: {
          merchantId: 169,
          serviceId: 581,
          purchaseTypeId: 3,
          msisdn: '588800099',
          transactionChannel: 'Wifi',
          operator: 'WM',
          subscription: '',
        },
      },
      pinRes,
    );
    assert.equal(pinRes.statusCode, 200);
    assert.match(logs[0], /billing PIN for 588800099: \d{4}/);
    const requestId = pinRes.body.data.requestId;
    const pin = pinRes.body.data.pin;
    assert.ok(requestId);
    assert.match(pin, /^\d{4}$/);
    assert.equal(pinRes.body.data.pinCode, pin);

    const bad = mockRes();
    await handlers.confirm(
      {
        body: {
          requestId,
          pinCode: '0000',
          msisdn: '588800099',
          serviceId: 581,
          purchaseTypeId: 3,
        },
      },
      bad,
    );
    assert.equal(bad.statusCode, 422);

    const ok = mockRes();
    await handlers.confirm(
      {
        body: {
          requestId,
          pinCode: DUMMY_DCB_MASTER_PIN,
          msisdn: '588800099',
          serviceId: 581,
          purchaseTypeId: 3,
        },
      },
      ok,
    );
    assert.equal(ok.body.success, true);

    const firstPoll = mockRes();
    await handlers.subscriptions({ query: { msisdn: '588800099' } }, firstPoll);
    assert.equal(firstPoll.body.data.items[0].status, 'PENDING_CONFIRMATION');

    const secondPoll = mockRes();
    await handlers.subscriptions({ query: { msisdn: '588800099' } }, secondPoll);
    assert.equal(secondPoll.body.data.items[0].status, 'ACTIVE');
    assert.equal(secondPoll.body.data.items[0].entitlementActive, true);
  });
});
