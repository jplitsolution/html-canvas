import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPacksOnHome,
  normalizeFunnelLayout,
  resolvePacksOnHomeNoPhone,
  shouldRegisterPostbackAt,
  wantsButtonPostback,
} from './funnel-layout.js';

describe('normalizeFunnelLayout', () => {
  it('defaults to classic', () => {
    assert.equal(normalizeFunnelLayout(null), 'classic');
    assert.equal(normalizeFunnelLayout(''), 'classic');
    assert.equal(normalizeFunnelLayout('CLASSIC'), 'classic');
  });

  it('accepts packs_on_home', () => {
    assert.equal(normalizeFunnelLayout('packs_on_home'), 'packs_on_home');
    assert.equal(normalizeFunnelLayout('PACKS_ON_HOME'), 'packs_on_home');
  });
});

describe('isPacksOnHome', () => {
  it('is false for classic / missing', () => {
    assert.equal(isPacksOnHome({}), false);
    assert.equal(isPacksOnHome({ funnelLayout: 'classic' }), false);
  });

  it('is true for packs_on_home', () => {
    assert.equal(isPacksOnHome({ funnelLayout: 'packs_on_home' }), true);
  });
});

describe('resolvePacksOnHomeNoPhone', () => {
  it('HE-only → ERROR + fail redirect', () => {
    assert.deepEqual(resolvePacksOnHomeNoPhone('HEADER_INJECTION'), {
      nextPage: 'ERROR',
      useFailRedirect: true,
    });
    assert.deepEqual(resolvePacksOnHomeNoPhone('MSISDN_ONLY'), {
      nextPage: 'ERROR',
      useFailRedirect: true,
    });
  });

  it('OTP-only → OTP, no fail redirect', () => {
    assert.deepEqual(resolvePacksOnHomeNoPhone('OTP_ONLY'), {
      nextPage: 'OTP',
      useFailRedirect: false,
    });
  });

  it('BOTH → OTP, no fail redirect', () => {
    assert.deepEqual(resolvePacksOnHomeNoPhone('BOTH'), {
      nextPage: 'OTP',
      useFailRedirect: false,
    });
  });

  it('NONE stays in funnel', () => {
    assert.deepEqual(resolvePacksOnHomeNoPhone('NONE'), {
      nextPage: null,
      useFailRedirect: false,
    });
  });
});

describe('wantsButtonPostback', () => {
  it('defaults on', () => {
    assert.equal(wantsButtonPostback(undefined), true);
    assert.equal(wantsButtonPostback(''), true);
    assert.equal(wantsButtonPostback('1'), true);
  });

  it('treats 0 / false as off', () => {
    assert.equal(wantsButtonPostback(false), false);
    assert.equal(wantsButtonPostback('0'), false);
    assert.equal(wantsButtonPostback('false'), false);
  });
});

describe('shouldRegisterPostbackAt', () => {
  it('packs_on_home queues on confirm/subscribe click by default, not OTP or detect', () => {
    const c = { funnelLayout: 'packs_on_home', postbackRegisterAt: 'confirm' };
    assert.equal(shouldRegisterPostbackAt(c, 'confirm'), true);
    assert.equal(shouldRegisterPostbackAt(c, 'otp'), false);
    assert.equal(shouldRegisterPostbackAt(c, 'detect'), false);
  });

  it('packs_on_home advanced otp|both also queues on OTP verify, never detect', () => {
    const both = { funnelLayout: 'packs_on_home', postbackRegisterAt: 'both' };
    assert.equal(shouldRegisterPostbackAt(both, 'confirm'), true);
    assert.equal(shouldRegisterPostbackAt(both, 'otp'), true);
    assert.equal(shouldRegisterPostbackAt(both, 'detect'), false);
    const otp = { funnelLayout: 'packs_on_home', postbackRegisterAt: 'otp' };
    assert.equal(shouldRegisterPostbackAt(otp, 'otp'), true);
    assert.equal(shouldRegisterPostbackAt(otp, 'confirm'), true);
  });

  it('skips when queuePostback is false', () => {
    const c = { funnelLayout: 'packs_on_home' };
    assert.equal(
      shouldRegisterPostbackAt(c, 'confirm', { queuePostback: false }),
      false,
    );
    assert.equal(
      shouldRegisterPostbackAt(c, 'confirm', { queuePostback: '0' }),
      false,
    );
    assert.equal(
      shouldRegisterPostbackAt(c, 'confirm', { queuePostback: true }),
      true,
    );
  });

  it('classic respects postbackRegisterAt', () => {
    assert.equal(
      shouldRegisterPostbackAt({ postbackRegisterAt: 'confirm' }, 'confirm'),
      true,
    );
    assert.equal(
      shouldRegisterPostbackAt({ postbackRegisterAt: 'confirm' }, 'otp'),
      false,
    );
    assert.equal(
      shouldRegisterPostbackAt({ postbackRegisterAt: 'otp' }, 'otp'),
      true,
    );
    assert.equal(
      shouldRegisterPostbackAt({ postbackRegisterAt: 'both' }, 'otp'),
      true,
    );
    assert.equal(
      shouldRegisterPostbackAt({ postbackRegisterAt: 'both' }, 'confirm'),
      true,
    );
  });
});
