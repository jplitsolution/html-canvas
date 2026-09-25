import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Redis from 'ioredis';
import { reserveOtpSend } from './send-limit.js';

let server;
let client;
let directory;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'otp-limit-'));
  const socket = join(directory, 'redis.sock');
  server = spawn('redis-server', [
    '--port', '0', '--unixsocket', socket, '--save', '', '--appendonly', 'no',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Redis startup timed out')), 5000);
    let output = '';
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Redis exited: ${code}: ${output}`)));
    server.stdout.on('data', (data) => {
      output += data.toString();
      if (output.toLowerCase().includes('ready to accept connections')) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  client = new Redis(socket);
  await client.ping();
});

after(async () => {
  if (client) await client.quit();
  if (server && server.exitCode === null) {
    await new Promise((resolve) => {
      server.once('exit', resolve);
      server.kill();
    });
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

const ageFirstSend = async (key) => {
  const [seconds, microseconds] = await client.time();
  const now = Number(seconds) * 1000 + Math.floor(Number(microseconds) / 1000);
  await client.hset(key, 'lastSend', now - 60000);
};

test('first send, cooldown, second send, full 24-hour block, then reset', async () => {
  const phone = '22670000001';
  const key = `otp:send-limit:${phone}`;
  await reserveOtpSend(client, phone);
  await assert.rejects(reserveOtpSend(client, '+226 70-000-001'), { statusCode: 429 });
  assert.equal(await client.hget(key, 'count'), '1');
  await ageFirstSend(key);
  await reserveOtpSend(client, phone);
  assert.equal(await client.hget(key, 'count'), '2');
  assert.ok(await client.pttl(key) > 86399000);
  // Rejected requests must not extend the block.
  await client.pexpire(key, 3600000);
  await assert.rejects(reserveOtpSend(client, phone), { statusCode: 429 });
  assert.ok(await client.pttl(key) <= 3600000);
  // Redis expiry opens a fresh budget.
  await client.pexpire(key, 1);
  await new Promise((resolve) => setTimeout(resolve, 10));
  await reserveOtpSend(client, phone);
  assert.equal(await client.hget(key, 'count'), '1');
});

test('parallel requests cannot bypass either allowed send', async () => {
  const phone = '22670000002';
  const burst = () => Promise.allSettled(
    Array.from({ length: 20 }, () => reserveOtpSend(client, phone)),
  );
  let results = await burst();
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  await ageFirstSend(`otp:send-limit:${phone}`);
  results = await burst();
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.ok(results.filter((r) => r.status === 'rejected').every((r) => r.reason.statusCode === 429));
});

test('different numbers are independent; invalid numbers and unavailable Redis cannot send', async () => {
  await reserveOtpSend(client, '22670000003');
  await reserveOtpSend(client, '22670000004');
  await assert.rejects(reserveOtpSend(client, '---'), { statusCode: 400 });
  await assert.rejects(reserveOtpSend(null, '22670000005'), { statusCode: 503 });
  await assert.rejects(reserveOtpSend({ eval: async () => { throw new Error('offline'); } }, '22670000005'), { statusCode: 503 });
});

test('campaign messages distinguish cooldown from block, including the final block minute', async () => {
  const phone = '22670000006';
  const key = `otp:send-limit:${phone}`;
  const config = {
    otpCooldownMessage: 'Veuillez patienter {{seconds}} secondes.',
    otpBlockedMessage: 'यह नंबर अभी ब्लॉक है।',
    otpUnavailableMessage: 'Service indisponible.',
  };
  await reserveOtpSend(client, phone, config);
  await assert.rejects(reserveOtpSend(client, phone, config), (err) =>
    err.statusCode === 429 && /^Veuillez patienter \d+ secondes\.$/.test(err.message));
  await ageFirstSend(key);
  await reserveOtpSend(client, phone, config);
  await client.pexpire(key, 30000);
  await assert.rejects(reserveOtpSend(client, phone, config), {
    statusCode: 429, message: config.otpBlockedMessage,
  });
  await assert.rejects(reserveOtpSend(null, phone, config), {
    statusCode: 503, message: config.otpUnavailableMessage,
  });
  await assert.rejects(reserveOtpSend(client, phone, { otpBlockedMessage: '   ' }),
    (err) => err.message.startsWith('OTP send limit reached.'));
});
