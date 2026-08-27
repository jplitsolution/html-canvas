import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOWS,
  resolveFlow,
  resolveFlowOrBoth,
  wapBlockedError,
} from './index.js';
import { defaultStartConfig } from '../helpers/start-config.js';
import { shouldRunHeOnDetect } from '../helpers/he-detect-gate.js';
import { resolvePacksOnHomeNoPhone } from '../helpers/funnel-layout.js';
import { DCB_WAP_BLOCKED, OTP_WAP_BLOCKED } from './graph.js';

describe('backend flow registry', () => {
  it('registers every verification mode', () => {
    assert.deepEqual(Object.keys(FLOWS).sort(), [
      'BOTH',
      'CG_HOME',
      'HEADER_INJECTION',
      'NONE',
      'OTP_ONLY',
      'UNIVERSE_DCB',
    ]);
  });

  it('aliases MSISDN_ONLY but not NULL (NULL keeps HE start defaults)', () => {
    assert.equal(resolveFlow('MSISDN_ONLY').id, 'HEADER_INJECTION');
    assert.equal(resolveFlow('NULL'), null);
    assert.equal(resolveFlowOrBoth('NULL').id, 'BOTH');
    assert.equal(defaultStartConfig('NULL').runHe, true);
    assert.equal(defaultStartConfig('NONE').runHe, false);
  });

  it('flags match previous mode helpers', () => {
    assert.equal(resolveFlow('NONE').isLandingCg, true);
    assert.equal(resolveFlow('CG_HOME').isLandingCg, false);
    assert.equal(resolveFlow('CG_HOME').isSubscribeCg, true);
    assert.equal(resolveFlow('NONE').isNullIdentity, true);
    assert.equal(resolveFlow('OTP_ONLY').allowsHe, false);
    assert.equal(resolveFlow('HEADER_INJECTION').allowsHe, true);
    assert.equal(resolveFlow('UNIVERSE_DCB').allowsApiExpose, true);
    assert.equal(resolveFlow('OTP_ONLY').allowsApiExpose, true);
    assert.equal(resolveFlow('BOTH').allowsApiExpose, false);
  });

  it('API expose WAP errors stay mode-specific', () => {
    const dcb = wapBlockedError('UNIVERSE_DCB');
    const otp = wapBlockedError('OTP_ONLY');
    const fallback = wapBlockedError('BOTH');
    assert.equal(dcb.statusCode, 400);
    assert.equal(dcb.message, DCB_WAP_BLOCKED);
    assert.equal(otp.message, OTP_WAP_BLOCKED);
    assert.equal(fallback.message, OTP_WAP_BLOCKED);
  });

  it('startConfig + HE gate stay aligned', () => {
    assert.equal(shouldRunHeOnDetect('HEADER_INJECTION'), true);
    assert.equal(shouldRunHeOnDetect('UNIVERSE_DCB'), true);
    assert.equal(shouldRunHeOnDetect('OTP_ONLY'), false);
    assert.equal(shouldRunHeOnDetect('NONE'), false);
    assert.equal(shouldRunHeOnDetect('CG_HOME'), false);
    assert.deepEqual(defaultStartConfig('OTP_ONLY'), {
      runHe: false,
      runBlocklist: true,
      runChecksub: true,
    });
  });

  it('packs_on_home no-phone landing stays the same', () => {
    assert.deepEqual(resolvePacksOnHomeNoPhone('HEADER_INJECTION'), {
      nextPage: 'ERROR',
      useFailRedirect: true,
    });
    assert.deepEqual(resolvePacksOnHomeNoPhone('MSISDN_ONLY'), {
      nextPage: 'ERROR',
      useFailRedirect: true,
    });
    assert.deepEqual(resolvePacksOnHomeNoPhone('OTP_ONLY'), {
      nextPage: 'OTP',
      useFailRedirect: false,
    });
    assert.deepEqual(resolvePacksOnHomeNoPhone('UNIVERSE_DCB'), {
      nextPage: null,
      useFailRedirect: false,
    });
    assert.deepEqual(resolvePacksOnHomeNoPhone('NULL'), {
      nextPage: null,
      useFailRedirect: false,
    });
  });
});
