import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPostbackCallback,
  parseCallbackClickId,
  parseCallbackMsisdn,
} from './postback-callback.js';

describe('parseCallbackClickId / parseCallbackMsisdn', () => {
  it('reads click_id, clickId, and ext_id', () => {
    assert.equal(parseCallbackClickId({ click_id: 'a1' }), 'a1');
    assert.equal(parseCallbackClickId({ clickId: 'b2' }), 'b2');
    assert.equal(parseCallbackClickId({ ext_id: 'c3' }), 'c3');
    assert.equal(parseCallbackClickId({}), '');
  });

  it('strips non-digits from msisdn / phone', () => {
    assert.equal(parseCallbackMsisdn({ msisdn: '+254 712' }), '254712');
    assert.equal(parseCallbackMsisdn({ phone: '254-700' }), '254700');
    assert.equal(parseCallbackMsisdn({}), '');
  });
});

const visit = {
  id: 9,
  campaignId: 3,
  vendorId: 4,
  clickId: 'clk-he-fail',
  rcid: 'aff-1',
  campid: 'v-camp',
  trackingCampid: 'KE-SAF-3',
  phone: '',
};

const pendingRow = {
  id: 77,
  visitId: 8,
  campaignId: 3,
  clickId: 'clk-pending',
  rcid: 'aff-2',
  campid: 'v-camp',
  trackingCampid: 'KE-SAF-3',
  msisdn: '254700000001',
};

const makeDeps = ({ pending = null, visitByClick = null, visitByPhone = null } = {}) => {
  const calls = { registerPending: [], firePostback: [] };
  const qbState = { whereClick: false };

  const getPostbackRepo = () => ({
    findOne: async () => pending,
  });

  const getVisitRepo = () => ({
    createQueryBuilder: () => {
      const qb = {
        where: (sql) => {
          qbState.whereClick = String(sql).includes('click_id');
          return qb;
        },
        andWhere: () => qb,
        orderBy: () => qb,
        getOne: async () => (qbState.whereClick ? visitByClick : visitByPhone),
      };
      return qb;
    },
  });

  return {
    deps: {
      getPostbackRepo,
      getVisitRepo,
      logApiCall: async () => {},
      logEvent: async () => {},
      setVisitPhone: async () => {},
      registerPending: async (input) => {
        calls.registerPending.push(input);
        return { success: true, id: 101, status: 'pending' };
      },
      firePostback: async (id) => {
        calls.firePostback.push(id);
        return { success: true, id, status: 'sent' };
      },
    },
    calls,
  };
};

describe('processOperatorCallback shapes', () => {
  it('skips when neither msisdn nor click_id is present', async () => {
    const { deps } = makeDeps();
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({});
    assert.equal(out.skipped, true);
    assert.match(out.reason, /msisdn or click_id/);
  });

  it('msisdn only: fires existing pending', async () => {
    const { deps, calls } = makeDeps({ pending: pendingRow });
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({ msisdn: '254700000001' });
    assert.equal(out.id, 77);
    assert.deepEqual(calls.firePostback, [77]);
    assert.equal(calls.registerPending.length, 0);
  });

  it('msisdn only: no pending → visit by phone then register and fire', async () => {
    const { deps, calls } = makeDeps({
      visitByPhone: { ...visit, phone: '254700000001', clickId: 'clk-ok' },
    });
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({ msisdn: '254700000001' });
    assert.equal(out.id, 101);
    assert.equal(calls.registerPending[0].msisdn, '254700000001');
    assert.equal(calls.registerPending[0].clickId, 'clk-ok');
    assert.deepEqual(calls.firePostback, [101]);
  });

  it('click_id + msisdn: visit by click, insert with subscribe number', async () => {
    const { deps, calls } = makeDeps({ visitByClick: { ...visit, phone: '' } });
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({
      ext_id: 'clk-he-fail',
      msisdn: '254799999999',
    });
    assert.equal(out.id, 101);
    assert.equal(calls.registerPending[0].msisdn, '254799999999');
    assert.equal(calls.registerPending[0].clickId, 'clk-he-fail');
    assert.equal(calls.registerPending[0].visitId, 9);
    assert.deepEqual(calls.firePostback, [101]);
  });

  it('click_id only: uses visit.phone', async () => {
    const { deps, calls } = makeDeps({
      visitByClick: { ...visit, phone: '254711111111' },
    });
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({ click_id: 'clk-he-fail' });
    assert.equal(out.id, 101);
    assert.equal(calls.registerPending[0].msisdn, '254711111111');
    assert.deepEqual(calls.firePostback, [101]);
  });

  it('click_id only: skips when visit has no phone', async () => {
    const { deps, calls } = makeDeps({ visitByClick: { ...visit, phone: '' } });
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({ click_id: 'clk-he-fail' });
    assert.equal(out.skipped, true);
    assert.match(out.reason, /no msisdn/i);
    assert.equal(calls.firePostback.length, 0);
  });

  it('click_id + msisdn with no visit falls back to pending by msisdn', async () => {
    const { deps, calls } = makeDeps({ pending: pendingRow, visitByClick: null });
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({
      click_id: 'unknown-click',
      msisdn: '254700000001',
    });
    assert.equal(out.id, 77);
    assert.deepEqual(calls.firePostback, [77]);
  });
});
