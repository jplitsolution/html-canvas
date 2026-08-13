import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSubscribeUrlOverride,
  mapSubServiceId,
  fillSubscribeTemplate,
} from './pack-url.js';

describe('normalizeSubscribeUrlOverride', () => {
  it('allows http(s) URLs', () => {
    assert.equal(
      normalizeSubscribeUrlOverride(
        'https://op.example/sub?msisdn={{msisdn}}&pack={{pack}}',
      ),
      'https://op.example/sub?msisdn={{msisdn}}&pack={{pack}}',
    );
  });

  it('rejects javascript and empty', () => {
    assert.equal(normalizeSubscribeUrlOverride('javascript:alert(1)'), '');
    assert.equal(normalizeSubscribeUrlOverride(''), '');
    assert.equal(normalizeSubscribeUrlOverride('/relative'), '');
  });
});

describe('mapSubServiceId', () => {
  it('maps weekly / monthly / daily', () => {
    assert.equal(mapSubServiceId('weekly'), 'HWeekly');
    assert.equal(mapSubServiceId('monthly'), 'HMonthly');
    assert.equal(mapSubServiceId('daily'), 'HDaily');
    assert.equal(mapSubServiceId(''), 'HDaily');
  });
});

describe('fillSubscribeTemplate', () => {
  it('substitutes override URL placeholders as-is', () => {
    const url = fillSubscribeTemplate(
      'https://op.example/sub?msisdn={{msisdn}}&pkg={{pack}}&sid={{subServiceId}}&plan={{planId}}',
      {
        msisdn: '254700000001',
        pack: 'weekly',
        planId: 'weekly',
        subServiceId: mapSubServiceId('weekly'),
      },
    );
    assert.equal(
      url,
      'https://op.example/sub?msisdn=254700000001&pkg=weekly&sid=HWeekly&plan=weekly',
    );
  });
});
