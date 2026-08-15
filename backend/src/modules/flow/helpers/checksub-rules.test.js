import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractChecksubStatus,
  evaluateChecksubRules,
  parseChecksubConfig,
} from './checksub-rules.js';

describe('extractChecksubStatus', () => {
  it('reads plain-text body when statusField=body', () => {
    assert.equal(extractChecksubStatus('INACTIVE', 'body'), 'INACTIVE');
    assert.equal(extractChecksubStatus('  ACTIVE\n', 'body'), 'ACTIVE');
  });

  it('reads flat and nested JSON fields', () => {
    assert.equal(
      extractChecksubStatus({ currentStatus: 'parking' }, 'currentStatus'),
      'parking',
    );
    assert.equal(
      extractChecksubStatus({ data: { status: 'pending' } }, 'status'),
      'pending',
    );
  });

  it('parses JSON-as-string when field is a key', () => {
    assert.equal(
      extractChecksubStatus('{"currentStatus":"active"}', 'currentStatus'),
      'active',
    );
  });

  it('returns empty for non-JSON string when field is a key (no throw)', () => {
    assert.equal(extractChecksubStatus('INACTIVE', 'currentStatus'), '');
  });
});

describe('evaluateChecksubRules', () => {
  const bodyConfig = {
    statusField: 'body',
    rules: [
      { value: 'ACTIVE', go: 'page', page: 'THANKYOU', url: '' },
      { value: 'INACTIVE', go: 'continue', page: 'THANKYOU', url: '' },
      { value: 'parking', go: 'page', page: 'LOW_BALANCE', url: '' },
      {
        value: 'blocked',
        go: 'external',
        page: 'THANKYOU',
        url: 'https://example.com/block',
      },
    ],
    missGo: 'continue',
    missPage: 'ERROR',
    missUrl: '',
  };

  it('maps ACTIVE → thank you (skip + active)', () => {
    const r = evaluateChecksubRules('ACTIVE', bodyConfig);
    assert.equal(r.go, 'page');
    assert.equal(r.page, 'THANKYOU');
    assert.equal(r.isActive, true);
    assert.equal(r.shouldSkipSubscribe, true);
  });

  it('maps INACTIVE → continue funnel', () => {
    const r = evaluateChecksubRules('INACTIVE', bodyConfig);
    assert.equal(r.go, 'continue');
    assert.equal(r.shouldSkipSubscribe, false);
    assert.equal(r.isActive, false);
  });

  it('maps parking → LOW_BALANCE', () => {
    const r = evaluateChecksubRules('parking', bodyConfig);
    assert.equal(r.page, 'LOW_BALANCE');
    assert.equal(r.shouldSkipSubscribe, true);
    assert.equal(r.isActive, false);
  });

  it('maps external rule', () => {
    const r = evaluateChecksubRules('blocked', bodyConfig);
    assert.equal(r.go, 'external');
    assert.equal(r.url, 'https://example.com/block');
    assert.equal(r.shouldSkipSubscribe, true);
  });

  it('uses missGo when no rule matches', () => {
    const r = evaluateChecksubRules('weird', bodyConfig);
    assert.equal(r.go, 'continue');
  });

  it('matches JSON field config case-insensitively', () => {
    const cfg = parseChecksubConfig({
      statusField: 'currentStatus',
      rules: [{ value: 'Parking', go: 'page', page: 'LOW_BALANCE' }],
      missGo: 'continue',
    });
    const r = evaluateChecksubRules(
      { data: { currentStatus: 'PARKING' } },
      cfg,
    );
    assert.equal(r.page, 'LOW_BALANCE');
    assert.equal(r.status, 'parking');
  });

  it('returns null when config empty (legacy path)', () => {
    assert.equal(evaluateChecksubRules('ACTIVE', null), null);
    assert.equal(evaluateChecksubRules('ACTIVE', '{}'), null);
  });

  it('matches boolean true on success field as continue funnel', () => {
    const cfg = parseChecksubConfig({
      statusField: 'success',
      rules: [
        { value: 'true', go: 'continue' },
        { value: 'false', go: 'external', url: 'https://www.pw.live/' },
      ],
      missGo: 'continue',
    });
    const r = evaluateChecksubRules({ success: true, message: 'Hello World' }, cfg);
    assert.equal(r.go, 'continue');
    assert.equal(r.shouldSkipSubscribe, false);
  });
});
