import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPostbackForward } from './postback-forward.js';

const pendingRow = {
  id: 11,
  visitId: null,
  campaignId: 3,
  vendorId: 4,
  clickId: 'clk-1',
  rcid: 'aff-1',
  campid: 'v-camp',
  trackingCampid: 'BF-OBF-3',
  msisdn: '226700000001',
  status: 'pending',
  postbackUrl: 'https://vendor.example/pb?click={click_id}&msisdn={msisdn}',
};

const makeForward = ({ row, vendor, visit = null, trackings = [], http } = {}) => {
  const saved = [];
  const logs = [];
  const httpCalls = [];
  const { firePostback } = createPostbackForward({
    getPostbackRepo: () => ({
      findOne: async () => (row ? { ...row } : null),
      save: async (next) => {
        saved.push({ ...next });
        return next;
      },
    }),
    getVendorRepo: () => ({
      findOne: async () => vendor || null,
    }),
    getTrackingRepo: () => ({
      find: async () => trackings,
    }),
    getVisitRepo: () => ({
      findOne: async () => (visit ? { ...visit } : null),
    }),
    indexPostbackEvent: async () => {},
    logVisitEvent: async () => {},
    logApiCall: async (input) => {
      logs.push(input);
    },
    httpClient: {
      get: async (url, opts) => {
        httpCalls.push({ url, opts });
        if (http) return http(url, opts);
        return { status: 200, data: 'OK' };
      },
    },
  });
  return { firePostback, saved, logs, httpCalls };
};

describe('firePostback', () => {
  it('skips already sent unless force is set', async () => {
    const { firePostback, httpCalls } = makeForward({
      row: { ...pendingRow, status: 'sent' },
      vendor: { id: 4, code: 'v1', postbackUrl: pendingRow.postbackUrl },
    });
    const skipped = await firePostback(11);
    assert.equal(skipped.skipped, true);
    assert.equal(skipped.reason, 'already sent');
    assert.equal(httpCalls.length, 0);

    const forced = await firePostback(11, { force: true, manual: true });
    assert.equal(forced.success, true);
    assert.equal(forced.status, 'sent');
    assert.equal(httpCalls.length, 1);
  });

  it('fills missing postback URL from the vendor before firing', async () => {
    const { firePostback, httpCalls } = makeForward({
      row: { ...pendingRow, postbackUrl: null },
      vendor: {
        id: 4,
        code: 'v1',
        postbackUrl: 'https://vendor.example/pb?click={click_id}',
      },
    });
    const out = await firePostback(11, { manual: true });
    assert.equal(out.success, true);
    assert.match(httpCalls[0].url, /click=aff-1/);
  });

  it('does not fire when no vendor URL can be resolved', async () => {
    const { firePostback, httpCalls } = makeForward({
      row: { ...pendingRow, postbackUrl: null },
      vendor: { id: 4, code: 'v1', postbackUrl: '' },
    });
    const out = await firePostback(11, { manual: true });
    assert.equal(out.vendorSkipped, true);
    assert.equal(out.reason, 'no postback_url on vendor');
    assert.equal(httpCalls.length, 0);
  });

  it('fills {click_id} with affiliate rcid, not our minted click', async () => {
    const { firePostback, httpCalls } = makeForward({
      row: {
        ...pendingRow,
        postbackUrl: 'https://demo.track-myads.com/postback?click_id={click_id}',
      },
      vendor: { id: 4, code: 'v1' },
    });
    const out = await firePostback(11);
    assert.equal(out.success, true);
    assert.equal(
      httpCalls[0].url,
      'https://demo.track-myads.com/postback?click_id=aff-1',
    );
    assert.doesNotMatch(httpCalls[0].url, /clk-1/);
  });

  it('fills click_id={rcid} with the affiliate rcid, not our minted click', async () => {
    const { firePostback, httpCalls, logs } = makeForward({
      row: {
        ...pendingRow,
        postbackUrl: 'https://tickhigh.track-myads.com/postback?click_id={rcid}',
      },
      vendor: { id: 4, code: 'v1' },
    });
    const out = await firePostback(11);
    assert.equal(out.success, true);
    assert.equal(
      httpCalls[0].url,
      'https://tickhigh.track-myads.com/postback?click_id=aff-1',
    );
    assert.equal(logs[0].requestUrl, httpCalls[0].url);
    assert.doesNotMatch(httpCalls[0].url, /\{rcid\}/);
  });

  it('hydrates empty rcid from the visit before firing', async () => {
    const { firePostback, httpCalls, saved } = makeForward({
      row: {
        ...pendingRow,
        visitId: 88,
        clickId: null,
        rcid: null,
        postbackUrl: 'https://tickhigh.track-myads.com/postback?click_id={rcid}',
      },
      visit: {
        id: 88,
        clickId: 'minted-ours',
        rcid: 'TH-AFF-42',
        landingUrl: 'https://wap.example/?click_id=TH-AFF-42',
      },
      vendor: { id: 4, code: 'v1' },
    });
    const out = await firePostback(11, { manual: true });
    assert.equal(out.success, true);
    assert.equal(
      httpCalls[0].url,
      'https://tickhigh.track-myads.com/postback?click_id=TH-AFF-42',
    );
    assert.equal(saved[0].rcid, 'TH-AFF-42');
  });

  it('recovers rcid from visit landing URL when visits.rcid is empty', async () => {
    const { firePostback, httpCalls } = makeForward({
      row: {
        ...pendingRow,
        visitId: 89,
        clickId: 'minted-ours',
        rcid: null,
        postbackUrl: 'https://tickhigh.track-myads.com/postback?click_id={rcid}',
      },
      visit: {
        id: 89,
        clickId: 'minted-ours',
        rcid: '',
        landingUrl: 'https://wap.example/bf?click_id=FROM-LANDING',
      },
      vendor: { id: 4, code: 'v1' },
    });
    await firePostback(11, { manual: true });
    assert.equal(
      httpCalls[0].url,
      'https://tickhigh.track-myads.com/postback?click_id=FROM-LANDING',
    );
  });
});
