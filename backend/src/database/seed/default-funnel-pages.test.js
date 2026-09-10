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

  it('provides dedicated and separated default pages for all flows', () => {
    // 1. Orange BF remains untouched
    const orangeBfHome = getDefaultFunnelPageData('HOME', { verificationMode: 'ORANGE_BF' });
    const orangeBfOtp = getDefaultFunnelPageData('OTP', { verificationMode: 'ORANGE_BF' });
    assert.match(orangeBfHome.html, /bf-wellness-container/);
    assert.match(orangeBfHome.html, /Orange Burkina Faso/);
    assert.match(orangeBfOtp.html, /Vérifiez votre/);

    // 2. Header Injection (1-Click)
    const heHome = getDefaultFunnelPageData('HOME', { verificationMode: 'HEADER_INJECTION' });
    assert.match(heHome.html, /he-home/);
    assert.match(heHome.html, /1-Click Direct Access/);
    assert.match(heHome.html, /1-Click Activate/);

    // 3. OTP Only
    const otpHome = getDefaultFunnelPageData('HOME', { verificationMode: 'OTP_ONLY' });
    const otpPage = getDefaultFunnelPageData('OTP', { verificationMode: 'OTP_ONLY' });
    assert.match(otpHome.html, /otp-flow-home/);
    assert.match(otpPage.html, /otp-flow-verify/);
    assert.match(otpPage.html, /data-otp-field="phone"/);

    // 4. BOTH (Hybrid)
    const bothHome = getDefaultFunnelPageData('HOME', { verificationMode: 'BOTH' });
    const bothOtp = getDefaultFunnelPageData('OTP', { verificationMode: 'BOTH' });
    assert.match(bothHome.html, /both-flow-home/);
    assert.match(bothOtp.html, /both-flow-otp/);

    // 5. CG Home (Consent Gateway)
    const cgHome = getDefaultFunnelPageData('HOME', { verificationMode: 'CG_HOME' });
    assert.match(cgHome.html, /cg-flow-home/);
    assert.match(cgHome.html, /Official Service Access/);
    assert.match(cgHome.html, /Proceed to {{operator}} Gateway/);

    // 6. NONE (Direct Redirect)
    const noneHome = getDefaultFunnelPageData('HOME', { verificationMode: 'NONE' });
    assert.match(noneHome.html, /none-flow-home/);
    assert.match(noneHome.html, /Connecting to {{operator}}/);
  });
});

