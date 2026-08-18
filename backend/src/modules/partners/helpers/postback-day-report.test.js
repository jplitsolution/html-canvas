import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNumberStory,
  digitsMsisdn,
  formatDayReportText,
  summarizeStories,
} from './postback-day-report.js';

describe('digitsMsisdn', () => {
  it('strips non-digits', () => {
    assert.equal(digitsMsisdn('+254 712-345-678'), '254712345678');
    assert.equal(digitsMsisdn(''), '');
  });
});

describe('buildNumberStory', () => {
  it('waiting: queued, no callback, not fired', () => {
    const story = buildNumberStory({
      msisdn: '254700000001',
      postback: {
        id: 10,
        status: 'pending',
        createdAt: '2026-08-18T04:30:00.000Z',
        visitId: 9,
        clickId: 'clk-1',
        rcid: 'aff-1',
      },
    });
    assert.equal(story.queued, true);
    assert.equal(story.billingReceived, false);
    assert.equal(story.vendorFired, false);
    assert.equal(story.outcome, 'waiting_callback');
    assert.match(story.outcomeLabel, /WAITING/);
  });

  it('complete: callback log + vendor sent', () => {
    const story = buildNumberStory({
      msisdn: '254700000002',
      postback: {
        id: 11,
        status: 'sent',
        createdAt: '2026-08-18T04:30:00.000Z',
        sentAt: '2026-08-18T04:31:00.000Z',
        httpStatus: 200,
        postbackUrl: 'https://vendor.example/pb?click=clk-2',
        visitId: 12,
      },
      logs: [
        {
          callType: 'billing_callback',
          success: true,
          responseStatus: 200,
          createdAt: '2026-08-18T04:30:50.000Z',
          requestUrl: '/api/flow/callback',
        },
        {
          callType: 'vendor_postback',
          success: true,
          responseStatus: 200,
          createdAt: '2026-08-18T04:31:00.000Z',
          requestUrl: 'https://vendor.example/pb?click=clk-2',
          responseBody: 'OK',
        },
      ],
    });
    assert.equal(story.queued, true);
    assert.equal(story.billingReceived, true);
    assert.equal(story.vendorFired, true);
    assert.equal(story.vendorFireStatus, 'sent');
    assert.equal(story.outcome, 'complete');
    assert.equal(story.timeline.length, 2);
  });

  it('fire failed after callback', () => {
    const story = buildNumberStory({
      msisdn: '254700000003',
      postback: {
        id: 12,
        status: 'failed',
        createdAt: '2026-08-18T04:30:00.000Z',
        sentAt: '2026-08-18T04:31:00.000Z',
        errorMessage: 'HTTP 500',
        httpStatus: 500,
      },
      logs: [
        {
          callType: 'billing_callback',
          success: true,
          createdAt: '2026-08-18T04:30:50.000Z',
        },
        {
          callType: 'vendor_postback',
          success: false,
          responseStatus: 500,
          errorMessage: 'HTTP 500',
          createdAt: '2026-08-18T04:31:00.000Z',
        },
      ],
    });
    assert.equal(story.billingReceived, true);
    assert.equal(story.vendorFireStatus, 'failed');
    assert.equal(story.outcome, 'fire_failed');
  });

  it('callback with no queue row', () => {
    const story = buildNumberStory({
      msisdn: '254700000004',
      logs: [
        {
          callType: 'billing_callback',
          success: true,
          createdAt: '2026-08-18T04:30:50.000Z',
        },
      ],
    });
    assert.equal(story.queued, false);
    assert.equal(story.billingReceived, true);
    assert.equal(story.outcome, 'callback_no_row');
  });

  it('not queued when only checksub exists', () => {
    const story = buildNumberStory({
      msisdn: '254700000005',
      logs: [
        {
          callType: 'checksub',
          success: true,
          createdAt: '2026-08-18T04:10:00.000Z',
        },
      ],
    });
    assert.equal(story.queued, false);
    assert.equal(story.billingReceived, false);
    assert.equal(story.outcome, 'not_queued');
  });
});

describe('formatDayReportText', () => {
  it('prints YES/NO for queued, received, fired per MSISDN', () => {
    const complete = buildNumberStory({
      msisdn: '254711111111',
      postback: {
        id: 99,
        status: 'sent',
        createdAt: '2026-08-18T04:30:00.000Z',
        sentAt: '2026-08-18T04:31:00.000Z',
        httpStatus: 200,
        vendorId: 1,
        campaignId: 3,
        clickId: 'click-99',
        rcid: 'rcid-99',
      },
      logs: [
        {
          callType: 'billing_callback',
          success: true,
          responseStatus: 200,
          createdAt: '2026-08-18T04:30:50.000Z',
        },
        {
          callType: 'vendor_postback',
          success: true,
          responseStatus: 200,
          createdAt: '2026-08-18T04:31:00.000Z',
          requestUrl: 'https://vendor.example/pb',
        },
      ],
      vendor: { name: 'Acme', code: 'ACME' },
      campaign: { id: 3, name: 'KE Funnel' },
    });
    const waiting = buildNumberStory({
      msisdn: '254722222222',
      postback: {
        id: 100,
        status: 'pending',
        createdAt: '2026-08-18T05:00:00.000Z',
      },
    });
    const numbers = [complete, waiting];
    const text = formatDayReportText(
      {
        date: '2026-08-18',
        timezone: 'Asia/Kolkata',
        generatedAt: '2026-08-18T07:00:00.000Z',
        summary: summarizeStories(numbers),
        numbers,
      },
      'Asia/Kolkata',
    );

    assert.match(text, /MSISDN  254711111111/);
    assert.match(text, /1\. QUEUED\s+YES/);
    assert.match(text, /2\. RECEIVED\s+YES/);
    assert.match(text, /3\. FIRED\s+YES/);
    assert.match(text, /COMPLETE/);
    assert.match(text, /MSISDN  254722222222/);
    assert.match(text, /WAITING/);
    assert.match(text, /Vendor fire SENT\s+: 1/);
    assert.match(text, /Waiting for callback\s+: 1/);
  });
});
