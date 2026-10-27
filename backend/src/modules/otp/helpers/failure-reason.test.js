import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFailureReason } from './failure-reason.js';

describe('normalizeFailureReason', () => {
  it('identifies Wrong PIN from invalid_otp clientResponse or code 1002', () => {
    assert.equal(
      normalizeFailureReason({ clientResponse: 'invalid_otp' }),
      'Wrong PIN',
    );
    assert.equal(normalizeFailureReason({ responseCode: 1002 }), 'Wrong PIN');
    assert.equal(normalizeFailureReason({ code: 'INVALID_OTP' }), 'Wrong PIN');
    assert.equal(
      normalizeFailureReason({ error: 'Wrong PIN entered' }),
      'Wrong PIN',
    );
    assert.equal(
      normalizeFailureReason({ error: 'Incorrect or expired PIN entered' }),
      'Wrong PIN',
    );
    assert.equal(
      normalizeFailureReason({
        error: 'OTP mismatch. Please check the code and try again.',
      }),
      'Wrong PIN',
    );
  });

  it('identifies Expired / Timeout from code 1001, 504, or keyword', () => {
    assert.equal(
      normalizeFailureReason({ responseCode: 1001 }),
      'Expired / Timeout',
    );
    assert.equal(
      normalizeFailureReason({ httpStatus: 504 }),
      'Expired / Timeout',
    );
    assert.equal(
      normalizeFailureReason({ error: 'GATEWAY_TIMEOUT' }),
      'Expired / Timeout',
    );
    assert.equal(
      normalizeFailureReason({ error: 'Session expired' }),
      'Expired / Timeout',
    );
  });

  it('identifies Rate Limited from 429 or brute force / too many attempts', () => {
    assert.equal(normalizeFailureReason({ httpStatus: 429 }), 'Rate Limited');
    assert.equal(
      normalizeFailureReason({
        error: 'Too many failed verification attempts',
      }),
      'Rate Limited',
    );
    assert.equal(
      normalizeFailureReason({ code: 'RATE_LIMIT_EXCEEDED' }),
      'Rate Limited',
    );
  });

  it('identifies Offer Capped from held or DCB_HELD', () => {
    assert.equal(normalizeFailureReason({ held: true }), 'Offer Capped');
    assert.equal(
      normalizeFailureReason({ code: 'DCB_HELD' }),
      'Offer Capped',
    );
    assert.equal(
      normalizeFailureReason({ error: 'Offer is stopped due to capping limit' }),
      'Offer Capped',
    );
  });

  it('identifies Provider Error from 500, 502, 503 or upstream message', () => {
    assert.equal(normalizeFailureReason({ httpStatus: 500 }), 'Provider Error');
    assert.equal(normalizeFailureReason({ httpStatus: 502 }), 'Provider Error');
    assert.equal(
      normalizeFailureReason({ error: 'Partner internal server error' }),
      'Provider Error',
    );
    assert.equal(
      normalizeFailureReason({ error: 'Upstream gateway error' }),
      'Provider Error',
    );
  });

  it('identifies Invalid Request from missing params or correlation failure', () => {
    assert.equal(
      normalizeFailureReason({ code: 'DCB_CORRELATION_REQUIRED' }),
      'Invalid Request',
    );
    assert.equal(
      normalizeFailureReason({ error: 'requestId is missing or expired' }),
      'Invalid Request',
    );
    assert.equal(
      normalizeFailureReason({ error: 'PIN is required' }),
      'Invalid Request',
    );
  });

  it('falls back to Wrong PIN for OTP_VERIFY and Send Failed for OTP_SEND', () => {
    assert.equal(normalizeFailureReason({}, 'OTP_VERIFY'), 'Wrong PIN');
    assert.equal(normalizeFailureReason({}, 'OTP_SEND'), 'Send Failed');
    assert.equal(
      normalizeFailureReason(
        { error: 'OTP verification failed' },
        'OTP_VERIFY',
      ),
      'Wrong PIN',
    );
  });
});
