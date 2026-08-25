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
  status: 'pending',
};

const makeDeps = ({ pending = null, visitByClick = null, visitByPhone = null } = {}) => {
  const calls = { registerPending: [], firePostback: [], logApiCall: [], appendHit: [] };
  const qbState = { whereClick: false };

  const getPostbackRepo = () => ({
    findOne: async () => pending,
    save: async (row) => row,
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
      logApiCall: async (input) => {
        calls.logApiCall.push(input);
      },
      appendHit: async (input) => {
        calls.appendHit.push(input);
      },
      logEvent: async () => {},
      setVisitPhone: async () => {},
      registerPending: async (input) => {
        calls.registerPending.push(input);
        return { success: true, id: 101, status: 'received' };
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
    const { deps, calls } = makeDeps();
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({});
    assert.equal(out.success, false);
    assert.equal(out.skipped, true);
    assert.match(out.reason, /msisdn or click_id/);
    assert.equal(calls.logApiCall.length, 1);
    assert.equal(calls.logApiCall[0].success, false);
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

  it('click_id only: stores conversion even when visit has no msisdn', async () => {
    const { deps, calls } = makeDeps({ visitByClick: { ...visit, phone: '' } });
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({ click_id: 'clk-he-fail' });
    assert.equal(out.id, 101);
    assert.equal(calls.registerPending[0].clickId, 'clk-he-fail');
    assert.equal(calls.registerPending[0].msisdn, null);
    assert.equal(calls.registerPending[0].visitId, 9);
    assert.deepEqual(calls.firePostback, [101]);
    assert.equal(calls.logApiCall[0].success, true);
  });

  it('click_id not in system: stores log as unmatched', async () => {
    const { deps, calls } = makeDeps({ visitByClick: null });
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({ click_id: 'unknown-click' });
    assert.equal(out.success, false);
    assert.match(out.reason, /No visit for click_id/);
    assert.equal(calls.firePostback.length, 0);
    assert.equal(calls.logApiCall.length, 1);
    assert.equal(calls.logApiCall[0].success, false);
  });

  it('msisdn only not in system: stores log as unmatched', async () => {
    const { deps, calls } = makeDeps();
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({ msisdn: '254700000099' });
    assert.equal(out.success, false);
    assert.match(out.reason, /msisdn not in system/);
    assert.equal(calls.firePostback.length, 0);
    assert.equal(calls.logApiCall[0].success, false);
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

  it('always writes the hit file for skip / false / unmatched queries', async () => {
    const { deps, calls } = makeDeps();
    const { processOperatorCallback } = createPostbackCallback(deps);

    await processOperatorCallback({});
    await processOperatorCallback({ status: 'false' });
    await processOperatorCallback({ click_id: 'unknown-click' });
    await processOperatorCallback({ msisdn: '254700000099' });

    assert.equal(calls.appendHit.length, 4);
    for (const hit of calls.appendHit) {
      assert.equal(hit.callType, 'billing_callback');
      assert.equal(hit.success, false);
      assert.ok(['SKIPPED', 'FAILED'].includes(hit.statusLabel));
      assert.ok(hit.query);
    }
    const empty = calls.appendHit.find((h) => !h.query?.status && !h.query?.click_id && !h.query?.msisdn);
    const statusFalse = calls.appendHit.find((h) => String(h.query?.status) === 'false');
    const unknownClick = calls.appendHit.find((h) => h.query?.click_id === 'unknown-click');
    const unknownMsisdn = calls.appendHit.find((h) => h.query?.msisdn === '254700000099');

    assert.ok(empty);
    assert.match(String(empty.reason), /msisdn or click_id/);
    assert.ok(statusFalse);
    assert.equal(statusFalse.statusLabel, 'SKIPPED');
    assert.match(String(statusFalse.reason), /msisdn or click_id/);
    assert.ok(unknownClick);
    assert.match(String(unknownClick.reason), /No visit for click_id/);
    assert.ok(unknownMsisdn);
    assert.match(String(unknownMsisdn.reason), /msisdn not in system/);
  });

  it('holds grace (and any non-billable status) without firing vendor postback', async () => {
    const row = { ...pendingRow };
    const { deps, calls } = makeDeps({ pending: row });
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({
      msisdn: '254700000001',
      status: 'grace',
    });
    assert.equal(out.success, true);
    assert.equal(out.vendorFired, false);
    assert.equal(out.operatorStatus, 'grace');
    assert.equal(row.operatorStatus, 'grace');
    assert.equal(calls.firePostback.length, 0);
    assert.equal(calls.logApiCall[0].statusLabel, 'GRACE');
  });

  it('grace on visit by click_id queues pending and does not fire', async () => {
    const { deps, calls } = makeDeps({
      visitByClick: { ...visit, phone: '254711111111' },
    });
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({
      click_id: 'clk-he-fail',
      status: 'GRACE',
    });
    assert.equal(out.vendorFired, false);
    assert.equal(calls.firePostback.length, 0);
    assert.equal(calls.registerPending[0].asReceived, false);
    assert.equal(calls.registerPending[0].operatorStatus, 'grace');
    assert.equal(calls.logApiCall[0].statusLabel, 'GRACE');
  });

  it('active still fires vendor postback', async () => {
    const { deps, calls } = makeDeps({ pending: pendingRow });
    const { processOperatorCallback } = createPostbackCallback(deps);
    const out = await processOperatorCallback({
      msisdn: '254700000001',
      status: 'active',
    });
    assert.equal(out.vendorFired, true);
    assert.deepEqual(calls.firePostback, [77]);
    assert.equal(calls.logApiCall[0].statusLabel, 'ACTIVE');
  });

  it('fires postback on custom status (e.g. grace, custom_ok) when allowed on vendor/campaign', async () => {
    const row = { ...pendingRow, vendorId: 5, campaignId: 3 };
    const { deps, calls } = makeDeps({ pending: row });

    deps.getVendorRepo = () => ({
      findOne: async () => ({ id: 5, allowedCallbackStatuses: 'grace, custom_ok' }),
    });

    const { processOperatorCallback } = createPostbackCallback(deps);
    const outGrace = await processOperatorCallback({
      msisdn: '254700000001',
      status: 'grace',
    });
    assert.equal(outGrace.vendorFired, true);
    assert.deepEqual(calls.firePostback, [77]);

    calls.firePostback.length = 0;
    const outCustom = await processOperatorCallback({
      msisdn: '254700000001',
      status: 'custom_ok',
    });
    assert.equal(outCustom.vendorFired, true);
    assert.deepEqual(calls.firePostback, [77]);

    calls.firePostback.length = 0;
    const outUnsub = await processOperatorCallback({
      msisdn: '254700000001',
      status: 'unsub',
    });
    assert.equal(outUnsub.vendorFired, false);
    assert.equal(calls.firePostback.length, 0);
  });
});
