import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  dayReportFilename,
  writeDayReportFile,
} from './postback-day-report-file.js';

describe('dayReportFilename', () => {
  it('uses YYYY-MM-DD', () => {
    assert.equal(dayReportFilename('2026-08-18'), 'postback-logs-2026-08-18.txt');
  });

  it('uses from-to for a range', () => {
    assert.equal(
      dayReportFilename('2026-08-01', '2026-08-18'),
      'postback-logs-2026-08-01-to-2026-08-18.txt',
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
