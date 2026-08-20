import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesHitFilters,
  matchesNumberFilters,
  paginateItems,
  parseReportQuery,
} from './report-filters.js';

describe('parseReportQuery', () => {
  it('reads campaign, vendor, outcome, hit, search, paging', () => {
    const q = parseReportQuery({
      campaignId: '12',
      vendorId: '4',
      filter: 'he_fail_cg',
      hitType: 'unmatched',
      q: ' 2547 ',
      view: 'hits',
      page: '2',
      limit: '25',
    });
    assert.equal(q.campaignId, 12);
    assert.equal(q.vendorId, 4);
    assert.equal(q.outcome, 'he_fail_cg');
    assert.equal(q.hitType, 'unmatched');
    assert.equal(q.q, '2547');
    assert.equal(q.view, 'hits');
    assert.equal(q.page, 2);
    assert.equal(q.limit, 25);
  });

  it('drops unknown filters and caps limit', () => {
    const q = parseReportQuery({ filter: 'nope', hitType: 'nope', view: 'nope', limit: '999' });
    assert.equal(q.outcome, 'all');
    assert.equal(q.hitType, 'all');
    assert.equal(q.view, '');
    assert.equal(q.limit, 200);
    assert.equal(q.campaignId, null);
  });
});

describe('matchesNumberFilters', () => {
  const row = {
    campaignId: 3,
    vendorId: 4,
    outcome: 'complete',
    msisdn: '254700000001',
    clickId: 'clk-1',
    rcid: 'aff-9',
  };

  it('applies campaign + vendor + outcome together', () => {
    assert.equal(
      matchesNumberFilters(row, { campaignId: 3, vendorId: 4, outcome: 'complete' }),
      true,
    );
    assert.equal(
      matchesNumberFilters(row, { campaignId: 3, vendorId: 9, outcome: 'complete' }),
      false,
    );
    assert.equal(
      matchesNumberFilters(row, { campaignId: 3, outcome: 'he_fail_cg' }),
      false,
    );
  });

  it('searches msisdn / click / rcid', () => {
    assert.equal(matchesNumberFilters(row, { q: '000001' }), true);
    assert.equal(matchesNumberFilters(row, { q: 'clk-1' }), true);
    assert.equal(matchesNumberFilters(row, { q: 'zzz' }), false);
  });
});

describe('matchesHitFilters', () => {
  const hit = {
    callType: 'billing_callback',
    ok: false,
    unmatched: true,
    msisdnReceived: false,
    msisdn: '',
    clickId: 'ext-1',
    campaignId: 3,
    vendorId: 4,
  };

  it('filters unmatched billing without a number', () => {
    assert.equal(
      matchesHitFilters(hit, { hitType: 'unmatched', campaignId: 3 }),
      true,
    );
    assert.equal(matchesHitFilters(hit, { hitType: 'with_msisdn' }), false);
    assert.equal(matchesHitFilters(hit, { hitType: 'vendor_postback' }), false);
    assert.equal(matchesHitFilters(hit, { vendorId: 9 }), false);
    assert.equal(matchesHitFilters(hit, { q: 'ext-1' }), true);
  });
});

describe('paginateItems', () => {
  it('slices and reports totals', () => {
    const items = [1, 2, 3, 4, 5];
    const page = paginateItems(items, 2, 2);
    assert.deepEqual(page.items, [3, 4]);
    assert.equal(page.total, 5);
    assert.equal(page.totalPages, 3);
  });
});
