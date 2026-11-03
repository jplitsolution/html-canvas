import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VisitStatus } from '../../../database/entities/visit.entity.js';
import {
  exposeVisitStatusPatch,
  isAlreadySubscribedText,
  isTerminalExposeVisit,
} from './expose-visit.js';

describe('exposeVisitStatusPatch', () => {
  it('does not downgrade a verified visit to OTP_SHOWN', () => {
    const existing = {
      visitStatus: VisitStatus.SUCCESS,
      otpVerifiedAt: new Date(),
    };
    assert.equal(
      exposeVisitStatusPatch(existing, VisitStatus.OTP_SHOWN),
      undefined,
    );
    assert.equal(isTerminalExposeVisit(existing), true);
  });

  it('does not downgrade SUBSCRIBED', () => {
    assert.equal(
      exposeVisitStatusPatch(
        { visitStatus: VisitStatus.SUBSCRIBED },
        VisitStatus.OTP_SHOWN,
      ),
      undefined,
    );
  });

  it('sets OTP_SHOWN on a fresh visit', () => {
    assert.equal(
      exposeVisitStatusPatch(
        { visitStatus: VisitStatus.VISIT },
        VisitStatus.OTP_SHOWN,
      ),
      VisitStatus.OTP_SHOWN,
    );
  });
});

describe('isAlreadySubscribedText', () => {
  it('matches partner already-subscribed payloads', () => {
    assert.equal(isAlreadySubscribedText('already subscribed'), true);
    assert.equal(
      isAlreadySubscribedText(null, { message: 'Already Subscribed' }),
      true,
    );
    assert.equal(isAlreadySubscribedText('OTP send failed'), false);
  });
});
