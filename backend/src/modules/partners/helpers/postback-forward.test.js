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

const makeForward = ({ row, vendor, trackings = [], http } = {}) => {
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
    indexPostbackEvent: async () => {},
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
    assert.match(httpCalls[0].url, /click=clk-1/);
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
});
