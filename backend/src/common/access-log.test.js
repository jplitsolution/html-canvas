import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  accessLogFilename,
  accessLogDay,
  createDailyAccessLogStream,
} from './access-log.js';

function writeLine(stream, line) {
  return new Promise((resolve, reject) => {
    stream.write(line, 'utf8', (err) => (err ? reject(err) : resolve()));
  });
}

function closeStream(stream) {
  return new Promise((resolve) => stream.end(resolve));
}

describe('accessLogFilename', () => {
  it('uses access-YYYY-MM-DD.log', () => {
    assert.equal(accessLogFilename('2026-08-27'), 'access-2026-08-27.log');
  });

  it('rejects path traversal', () => {
    assert.equal(accessLogFilename('../etc/passwd'), 'access-unknown.log');
  });
});

describe('accessLogDay', () => {
  it('uses Asia/Kolkata calendar day', () => {
    const justAfterMidnightIst = new Date('2026-08-26T18:40:00.000Z');
    assert.equal(accessLogDay('Asia/Kolkata', justAfterMidnightIst), '2026-08-27');
  });
});

describe('createDailyAccessLogStream', () => {
  it('appends hits to the current IST day file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'access-logs-'));
    try {
      const stream = createDailyAccessLogStream({
        dir,
        now: () => new Date('2026-08-27T12:00:00+05:30'),
      });
      await writeLine(stream, 'GET /api/campaigns 200\n');
      await closeStream(stream);
      const body = await readFile(join(dir, 'access-2026-08-27.log'), 'utf8');
      assert.match(body, /GET \/api\/campaigns 200/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('opens a new file after midnight IST', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'access-rotate-'));
    try {
      let current = new Date('2026-08-27T23:50:00+05:30');
      const stream = createDailyAccessLogStream({
        dir,
        now: () => current,
      });
      await writeLine(stream, 'day-one\n');
      current = new Date('2026-08-28T00:10:00+05:30');
      await writeLine(stream, 'day-two\n');
      await closeStream(stream);

      const files = (await readdir(dir)).sort();
      assert.deepEqual(files, ['access-2026-08-27.log', 'access-2026-08-28.log']);
      assert.equal(
        await readFile(join(dir, 'access-2026-08-27.log'), 'utf8'),
        'day-one\n',
      );
      assert.equal(
        await readFile(join(dir, 'access-2026-08-28.log'), 'utf8'),
        'day-two\n',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
