import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  funnelTotalsFromRows,
  parseCompareEvents,
  pivotFunnelTimeSeries,
} from './funnel-compare.js';

describe('funnel-compare', () => {
  it('parses chosen events and caps at 4', () => {
    assert.deepEqual(parseCompareEvents('VISIT,CG_REDIRECT'), [
      'VISIT',
      'CG_REDIRECT',
    ]);
    assert.deepEqual(parseCompareEvents('visit, home_view, visit'), [
      'VISIT',
      'HOME_VIEW',
    ]);
    assert.equal(
      parseCompareEvents('A,B,C,D,E').length,
      4,
    );
    assert.deepEqual(parseCompareEvents(''), ['VISIT', 'CG_REDIRECT']);
  });

  it('pivots only the chosen events', () => {
    const series = pivotFunnelTimeSeries(
      [
        { groupkey: '2026-08-26', eventType: 'VISIT', count: 12 },
        { groupkey: '2026-08-26', eventType: 'CG_REDIRECT', count: 4 },
        { groupkey: '2026-08-26', eventType: 'HOME_VIEW', count: 9 },
      ],
      ['VISIT', 'CG_REDIRECT'],
    );
    assert.equal(series[0].VISIT, 12);
    assert.equal(series[0].CG_REDIRECT, 4);
    assert.equal(series[0].HOME_VIEW, undefined);
  });

  it('sums totals for chosen events', () => {
    const totals = funnelTotalsFromRows(
      [
        { eventType: 'VISIT', count: 12 },
        { eventType: 'CG_REDIRECT', count: 4 },
        { eventType: 'HOME_VIEW', count: 9 },
      ],
      ['VISIT', 'CG_REDIRECT'],
    );
    assert.equal(totals.VISIT, 12);
    assert.equal(totals.CG_REDIRECT, 4);
    assert.equal(totals.HOME_VIEW, undefined);
  });
});
