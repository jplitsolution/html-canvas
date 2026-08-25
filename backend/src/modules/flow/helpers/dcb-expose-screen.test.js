import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildDcbExposeHtmlScreen,
  buildDcbExposeScreenUrls,
} from './dcb-expose-screen.js';

describe('buildDcbExposeScreenUrls', () => {
  it('builds vendor-scoped pincode, confirm, status, and screen URLs', () => {
    assert.deepEqual(buildDcbExposeScreenUrls('https://wap.example', 16, 6), {
      base: 'https://wap.example/api/flow/dcb/16/6',
      configUrl: 'https://wap.example/api/flow/dcb/16/6/config',
      pincodeUrl: 'https://wap.example/api/flow/dcb/16/6/pincode',
      confirmUrl: 'https://wap.example/api/flow/dcb/16/6/confirm',
      statusUrl: 'https://wap.example/api/flow/dcb/16/6/status',
      screenUrl: 'https://wap.example/api/flow/dcb/16/6/screen',
    });
  });
});

describe('buildDcbExposeHtmlScreen', () => {
  const html = buildDcbExposeHtmlScreen({
    origin: 'https://wap.example',
    campaignId: 16,
    vendorId: 6,
  });

  it('is a self-contained operator screen for pincode → confirm → status', () => {
    assert.match(html, /<!DOCTYPE html>/);
    assert.match(html, /Enter your number/);
    assert.match(html, /Confirm billing PIN/);
    assert.match(html, /\/api\/flow\/dcb\/16\/6\/config/);
    assert.match(html, /\/api\/flow\/dcb\/16\/6\/pincode/);
    assert.match(html, /\/api\/flow\/dcb\/16\/6\/confirm/);
    assert.match(html, /\/api\/flow\/dcb\/16\/6\/status/);
    assert.doesNotMatch(html, /bilunipal|tickhighs|\/api\/dcb\/pincode/);
  });

  it('uses relative WAP Manager APIs by default, absolute when requested', () => {
    assert.doesNotMatch(html, /https:\/\/wap\.example\/api\/flow\/dcb/);
    const abs = buildDcbExposeHtmlScreen({
      origin: 'https://wap.example',
      campaignId: 16,
      vendorId: 6,
      absolute: true,
    });
    assert.match(abs, /https:\/\/wap\.example\/api\/flow\/dcb\/16\/6\/pincode/);
    assert.doesNotMatch(abs, /bilunipal|tickhighs/);
  });

  it('sends requestId + pin on confirm and does not put attribution on API URLs', () => {
    assert.match(html, /requestId:\s*state\.requestId/);
    assert.match(html, /pin:\s*state\.pin/);
    assert.match(html, /CFG\.configUrl/);
    assert.match(html, /loadPacks/);
    assert.doesNotMatch(html, /RenewalDaily|hardcoded daily/i);
    assert.doesNotMatch(html, /click_id|clickId|rcid/);
  });
});
