import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  dayReportFilename,
  hitLogFilename,
  writeDayReportFile,
  appendPostbackHit,
} from './postback-day-report-file.js';

describe('dayReportFilename', () => {
  it('uses YYYY-MM-DD', () => {
    assert.equal(dayReportFilename('2026-08-18'), 'postback-logs-2026-08-18.txt');
  });

  it('uses from-to for a csv range', () => {
    assert.equal(
      dayReportFilename('2026-08-01', '2026-08-18', 'csv'),
      'postback-logs-2026-08-01-to-2026-08-18.csv',
    );
  });

  it('rejects path traversal', () => {
    assert.equal(dayReportFilename('../etc/passwd'), 'postback-logs-unknown.txt');
    assert.equal(dayReportFilename(''), 'postback-logs-unknown.txt');
  });
});

describe('writeDayReportFile', () => {
  it('creates the txt file in the given server directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pb-logs-'));
    try {
      const result = await writeDayReportFile('hello msisdn\n', '2026-08-18', dir);
      assert.equal(result.filename, 'postback-logs-2026-08-18.txt');
      const body = await readFile(result.absolutePath, 'utf8');
      assert.equal(body, 'hello msisdn\n');
      assert.ok(result.bytes > 0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('appendPostbackHit', () => {
  it('appends pass and fail hits to the daily file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pb-hits-'));
    try {
      await appendPostbackHit(
        {
          callType: 'billing_callback',
          success: false,
          clickId: 'missing',
          createdAt: '2026-08-20T06:00:00.000Z',
          requestBody: JSON.stringify({
            action: 'unmatched',
            matched: false,
            reason: 'No visit for click_id',
          }),
        },
        dir,
      );
      await appendPostbackHit(
        {
          callType: 'vendor_postback',
          success: true,
          msisdn: '254700000001',
          clickId: 'clk-ok',
          responseStatus: 200,
          createdAt: '2026-08-20T06:01:00.000Z',
        },
        dir,
      );
      const filename = hitLogFilename('2026-08-20');
      const body = await readFile(join(dir, filename), 'utf8');
      assert.match(body, /UNMATCHED/);
      assert.match(body, /msisdn=NO/);
      assert.match(body, /msisdn=254700000001/);
      assert.match(body, /vendor_postback/);
      assert.equal(body.trim().split('\n').length, 2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('writes skip / false callback queries including raw query string', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pb-hits-skip-'));
    try {
      await appendPostbackHit(
        {
          callType: 'billing_callback',
          success: false,
          statusLabel: 'SKIPPED',
          clickId: '',
          createdAt: '2026-08-20T06:05:00.000Z',
          query: { status: 'false', foo: 'bar' },
          reason: 'status=false ignored',
          requestBody: JSON.stringify({
            query: { status: 'false', foo: 'bar' },
            skipped: true,
            reason: 'status=false ignored',
          }),
        },
        dir,
      );
      const filename = hitLogFilename('2026-08-20');
      const body = await readFile(join(dir, filename), 'utf8');
      assert.match(body, /SKIPPED/);
      assert.match(body, /status=false ignored/);
      assert.match(body, /"foo":"bar"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
