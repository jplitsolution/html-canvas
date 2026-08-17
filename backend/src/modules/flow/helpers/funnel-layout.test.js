import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPacksOnHome,
  normalizeFunnelLayout,
  resolvePacksOnHomeNoPhone,
  continueFunnelPageAfterOtp,
  shouldRegisterPostbackAt,
  wantsButtonPostback,
  flowHasConfirmNode,
  packCanvasPage,
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

describe('flowHasConfirmNode / packCanvasPage', () => {
  it('unknown flow keeps classic Confirm', () => {
    assert.equal(flowHasConfirmNode({}), true);
    assert.equal(packCanvasPage({}), 'CONFIRM');
    assert.equal(packCanvasPage({ funnelLayout: 'classic' }), 'CONFIRM');
  });

  it('packs_on_home is HOME even if Confirm exists', () => {
    assert.equal(
      packCanvasPage({
        funnelLayout: 'packs_on_home',
        flowConfig: JSON.stringify({
          nodes: [{ id: 'CONFIRM', pageType: 'CONFIRM' }],
          edges: [],
        }),
      }),
      'HOME',
    );
  });

  it('classic layout with Confirm removed from graph uses HOME', () => {
    const campaign = {
      funnelLayout: 'classic',
      flowConfig: JSON.stringify({
        nodes: [
          { id: 'HOME', pageType: 'HOME' },
          { id: 'THANKYOU', pageType: 'THANKYOU' },
        ],
        edges: [],
      }),
    };
    assert.equal(flowHasConfirmNode(campaign), false);
    assert.equal(packCanvasPage(campaign), 'HOME');
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

describe('continueFunnelPageAfterOtp', () => {
  it('packs_on_home continue → HOME even if graph says Thank you', () => {
    assert.equal(
      continueFunnelPageAfterOtp(
        { funnelLayout: 'packs_on_home' },
        'THANKYOU',
      ),
      'HOME',
    );
    assert.equal(
      continueFunnelPageAfterOtp({ funnelLayout: 'packs_on_home' }, 'OTP'),
      'HOME',
    );
  });

  it('classic continue → CONFIRM when graph is Thank you / OTP', () => {
    assert.equal(continueFunnelPageAfterOtp({}, 'THANKYOU'), 'CONFIRM');
    assert.equal(continueFunnelPageAfterOtp({}, 'OTP'), 'CONFIRM');
    assert.equal(continueFunnelPageAfterOtp({}, 'CONFIRM'), 'CONFIRM');
  });

  it('classic layout without Confirm node continues to HOME', () => {
    const campaign = {
      funnelLayout: 'classic',
      flowConfig: JSON.stringify({
        nodes: [
          { id: 'HOME', pageType: 'HOME' },
          { id: 'THANKYOU', pageType: 'THANKYOU' },
        ],
        edges: [],
      }),
    };
    assert.equal(continueFunnelPageAfterOtp(campaign, 'THANKYOU'), 'HOME');
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
