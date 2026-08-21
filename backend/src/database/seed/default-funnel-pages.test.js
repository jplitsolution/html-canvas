import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultFunnelPageData,
  isClassicDefaultFunnelHtml,
} from './default-funnel-pages.js';

describe('Universe DCB default funnel pages', () => {
  it('uses pack-selection HOME and billing PIN OTP for UNIVERSE_DCB', () => {
    const home = getDefaultFunnelPageData('HOME', { verificationMode: 'UNIVERSE_DCB' });
    const otp = getDefaultFunnelPageData('OTP', { verificationMode: 'UNIVERSE_DCB' });

    assert.match(home.html, /dcb-home/);
    assert.match(home.html, /Choose your access pack/);
    assert.match(home.html, /data-pack="weekly"/);
    assert.match(home.html, /data-action="SUBSCRIBE"/);

    assert.match(otp.html, /Confirm billing PIN/);
    assert.match(otp.html, /data-dcb-field="pin"/);
    assert.match(otp.html, /data-otp-field="otp"/);
    assert.match(otp.html, /data-dcb-action="confirm-pin"/);
    assert.doesNotMatch(otp.html, /Verify Mobile Number/);
    assert.doesNotMatch(otp.html, />Get OTP</);
  });

  it('keeps classic SMS OTP and subscribe HOME for other modes', () => {
    const home = getDefaultFunnelPageData('HOME');
    const otp = getDefaultFunnelPageData('OTP', { verificationMode: 'BOTH' });

    assert.match(home.html, /Premium Mobile Service/);
    assert.match(home.html, /Subscribe Now/);
    assert.match(otp.html, /Verify Mobile Number/);
    assert.match(otp.html, /Get OTP/);
  });

  it('detects classic defaults so DCB campaigns can be upgraded', () => {
    const classicHome = getDefaultFunnelPageData('HOME').html;
    const classicOtp = getDefaultFunnelPageData('OTP').html;
    const dcbHome = getDefaultFunnelPageData('HOME', {
      verificationMode: 'UNIVERSE_DCB',
    }).html;
    const dcbOtp = getDefaultFunnelPageData('OTP', {
      verificationMode: 'UNIVERSE_DCB',
    }).html;

    assert.equal(isClassicDefaultFunnelHtml('HOME', classicHome), true);
    assert.equal(isClassicDefaultFunnelHtml('OTP', classicOtp), true);
    assert.equal(isClassicDefaultFunnelHtml('HOME', dcbHome), false);
    assert.equal(isClassicDefaultFunnelHtml('OTP', dcbOtp), false);
  });
});
