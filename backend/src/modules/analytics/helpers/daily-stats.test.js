import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addMetrics,
  bumpMetric,
  bumpOperatorStatus,
  eachYmd,
  emptyMetrics,
  flattenOperatorStatus,
  groupStatsRows,
  statsGrainKey,
  totalsFromRows,
} from './daily-stats.js';

describe('daily-stats helpers', () => {
  it('eachYmd walks inclusive calendar days', () => {
    assert.deepEqual(eachYmd('2026-08-18', '2026-08-20'), [
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
    ]);
    assert.deepEqual(eachYmd('2026-08-20', '2026-08-20'), ['2026-08-20']);
    assert.deepEqual(eachYmd('bad', '2026-08-20'), []);
  });

  it('bumpMetric merges grains and counts', () => {
    const map = new Map();
    bumpMetric(map, 3, 4, 'visits', 2);
    bumpMetric(map, 3, 4, 'vendorSent', 1);
    bumpMetric(map, null, 4, 'visits', 1);
    assert.equal(map.get(statsGrainKey(3, 4)).visits, 2);
    assert.equal(map.get(statsGrainKey(3, 4)).vendorSent, 1);
    assert.equal(map.get(statsGrainKey(0, 4)).visits, 1);
  });

  it('groupStatsRows sums by campaign and keeps names', () => {
    const grouped = groupStatsRows(
      [
        {
          statDate: '2026-08-18',
          campaignId: 1,
          vendorId: 8,
          campaignName: 'KE Saf',
          vendorName: 'Acme',
          visits: 10,
          vendorSent: 2,
        },
        {
          statDate: '2026-08-19',
          campaignId: 1,
          vendorId: 9,
          campaignName: 'KE Saf',
          vendorName: 'Beta',
          visits: 5,
          vendorSent: 1,
        },
      ],
      'campaign',
    );
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0].visits, 15);
    assert.equal(grouped[0].vendorSent, 3);
    assert.equal(grouped[0].campaignName, 'KE Saf');
    assert.equal(grouped[0].campaignId, 1);
    assert.equal(grouped[0].vendorId, null);
  });

  it('date grouping does not pin a campaign filter', () => {
    const grouped = groupStatsRows(
      [
        { statDate: '2026-08-18', campaignId: 1, vendorId: 8, visits: 10 },
        { statDate: '2026-08-18', campaignId: 2, vendorId: 9, visits: 5 },
      ],
      'date',
    );
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0].visits, 15);
    assert.equal(grouped[0].campaignId, null);
    assert.equal(grouped[0].vendorId, null);
    assert.equal(grouped[0].statDate, '2026-08-18');
  });

  it('totalsFromRows adds every metric', () => {
    const totals = totalsFromRows([
      { ...emptyMetrics(), visits: 4, heFailCg: 1 },
      { ...emptyMetrics(), visits: 6, vendorSent: 2 },
    ]);
    assert.equal(totals.visits, 10);
    assert.equal(totals.heFailCg, 1);
    assert.equal(totals.vendorSent, 2);
    assert.equal(addMetrics(emptyMetrics(), { visits: 3 }).visits, 3);
  });

  it('merges operator callback statuses across grains', () => {
    const map = new Map();
    bumpOperatorStatus(map, 1, 2, 'grace', 3);
    bumpOperatorStatus(map, 1, 2, 'active', 5);
    bumpOperatorStatus(map, 1, 9, 'grace', 1);
    const grouped = groupStatsRows(
      [
        {
          statDate: '2026-08-24',
          campaignId: 1,
          vendorId: 2,
          visits: 1,
          operatorStatus: map.get(statsGrainKey(1, 2)).operatorStatus,
        },
        {
          statDate: '2026-08-24',
          campaignId: 1,
          vendorId: 9,
          visits: 1,
          operatorStatus: map.get(statsGrainKey(1, 9)).operatorStatus,
        },
      ],
      'date',
    );
    const mix = flattenOperatorStatus(grouped);
    assert.deepEqual(mix, [
      { status: 'active', count: 5 },
      { status: 'grace', count: 4 },
    ]);
  });
});
