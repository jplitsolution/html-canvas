import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCallbackHit,
  buildNumberStory,
  digitsMsisdn,
  formatDayReportCsv,
  formatDayReportText,
  formatHitLogLine,
  summarizeHits,
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

  it('unmatched callback without a number still appears', () => {
    const story = buildNumberStory({
      msisdn: '',
      logs: [
        {
          callType: 'billing_callback',
          success: false,
          clickId: 'unknown-click',
          createdAt: '2026-08-20T06:00:00.000Z',
          requestBody: JSON.stringify({
            action: 'unmatched',
            matched: false,
            reason: 'No visit for click_id',
            clickId: 'unknown-click',
          }),
        },
      ],
    });
    assert.equal(story.queued, false);
    assert.equal(story.msisdnReceived, false);
    assert.equal(story.unmatched, true);
    assert.equal(story.outcome, 'callback_unmatched');
    assert.match(story.outcomeLabel, /No visit for click_id/);
    assert.equal(story.rowKey, 'click:unknown-click');
  });

  it('unmatched callback with msisdn not in system', () => {
    const story = buildNumberStory({
      msisdn: '254700000099',
      logs: [
        {
          callType: 'billing_callback',
          success: false,
          msisdn: '254700000099',
          createdAt: '2026-08-20T06:00:00.000Z',
          requestBody: JSON.stringify({
            action: 'unmatched',
            matched: false,
            reason: 'msisdn not in system',
          }),
        },
      ],
    });
    assert.equal(story.msisdnReceived, true);
    assert.equal(story.outcome, 'callback_unmatched');
    const summary = summarizeStories([story]);
    assert.equal(summary.callbackUnmatched, 1);
    assert.equal(summary.billingReceived, 1);
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

  it('HE fail → CG when token/resolve did not return a number', () => {
    const story = buildNumberStory({
      msisdn: '',
      logs: [
        {
          id: 1,
          callType: 'he_token',
          success: true,
          visitId: 44,
          clickId: 'clk-fail',
          campaignId: 3,
          createdAt: '2026-08-18T04:10:00.000Z',
        },
        {
          id: 2,
          callType: 'he_redirect',
          success: false,
          visitId: 44,
          clickId: 'clk-fail',
          campaignId: 3,
          requestUrl: 'https://cg.example/pay',
          requestBody: JSON.stringify({
            outcome: 'fail',
            heProvider: 'custom_http',
            heError: 'MSISDN not found',
          }),
          errorMessage: 'MSISDN not found',
          createdAt: '2026-08-18T04:10:01.000Z',
        },
      ],
    });
    assert.equal(story.queued, false);
    assert.equal(story.msisdn, '');
    assert.equal(story.outcome, 'he_fail_cg');
    assert.equal(story.redirectedToCg, true);
    assert.equal(story.cgUrl, 'https://cg.example/pay');
    assert.match(story.heError, /MSISDN not found/);
    assert.equal(story.rowKey, 'visit:44');
    assert.equal(story.visitId, 44);
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

  it('csv has YES/NO columns per number', () => {
    const complete = buildNumberStory({
      msisdn: '254711111111',
      postback: {
        id: 99,
        status: 'sent',
        createdAt: '2026-08-18T04:30:00.000Z',
        sentAt: '2026-08-18T04:31:00.000Z',
      },
      logs: [
        { callType: 'billing_callback', success: true, createdAt: '2026-08-18T04:30:50.000Z' },
      ],
    });
    const csv = formatDayReportCsv(
      { numbers: [complete], timezone: 'Asia/Kolkata' },
      'Asia/Kolkata',
    );
    assert.match(csv, /254711111111/);
    assert.match(csv, /YES/);
    assert.match(csv, /billing_received/);
  });

  it('csv includes he_fail_cg rows without msisdn', () => {
    const fail = buildNumberStory({
      msisdn: '',
      logs: [
        {
          callType: 'he_redirect',
          success: false,
          visitId: 9,
          requestUrl: 'https://cg.example/pay',
          createdAt: '2026-08-18T04:10:01.000Z',
        },
      ],
    });
    const csv = formatDayReportCsv(
      { numbers: [fail], timezone: 'Asia/Kolkata' },
      'Asia/Kolkata',
    );
    assert.match(csv, /he_fail_cg/);
    assert.match(csv, /https:\/\/cg\.example\/pay/);
    const summary = summarizeStories([fail]);
    assert.equal(summary.heFailCg, 1);
    assert.equal(summary.notQueued, 0);
    const text = formatDayReportText(
      {
        date: '2026-08-18',
        timezone: 'Asia/Kolkata',
        generatedAt: '2026-08-18T07:00:00.000Z',
        summary,
        numbers: [fail],
      },
      'Asia/Kolkata',
    );
    assert.match(text, /\(no MSISDN\)/);
    assert.match(text, /No MSISDN → CG redirect\s+: 1/);
  });

  it('includes every callback/vendor hit datewise with number YES/NO', () => {
    const unmatched = buildCallbackHit(
      {
        id: 1,
        callType: 'billing_callback',
        success: false,
        clickId: 'no-visit',
        createdAt: '2026-08-20T06:01:00.000Z',
        requestBody: JSON.stringify({
          action: 'unmatched',
          matched: false,
          reason: 'No visit for click_id',
        }),
      },
      'Asia/Kolkata',
    );
    const fired = buildCallbackHit(
      {
        id: 2,
        callType: 'vendor_postback',
        success: true,
        msisdn: '254700000001',
        clickId: 'clk-1',
        responseStatus: 200,
        createdAt: '2026-08-20T06:02:00.000Z',
        requestUrl: 'https://vendor.example/pb',
      },
      'Asia/Kolkata',
    );
    const hits = [unmatched, fired];
    const text = formatDayReportText(
      {
        date: '2026-08-20',
        timezone: 'Asia/Kolkata',
        generatedAt: '2026-08-20T07:00:00.000Z',
        summary: { ...summarizeStories([]), ...summarizeHits(hits) },
        numbers: [],
        hits,
      },
      'Asia/Kolkata',
    );
    assert.match(text, /HIT LOG/);
    assert.match(text, /msisdn=NO/);
    assert.match(text, /UNMATCHED/);
    assert.match(text, /msisdn=254700000001/);
    assert.match(text, /Number missing\s+: 1/);
    assert.match(text, /Number received\s+: 1/);
    assert.match(formatHitLogLine(unmatched, 'Asia/Kolkata'), /billing_callback/);
  });
});
