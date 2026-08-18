import { mkdir, writeFile } from 'fs/promises';
import { join, relative } from 'path';
import getConfig from '../../../config/configuration.js';

function ymd(value) {
  const match = /^(\d{4}-\d{2}-\d{2})$/.exec(String(value || '').trim());
  return match ? match[1] : '';
}

export function dayReportFilename(from, to) {
  const start = ymd(from);
  const end = ymd(to);
  if (!start && !end) return 'postback-logs-unknown.txt';
  if (!end || end === start) return `postback-logs-${start || end}.txt`;
  return `postback-logs-${start}-to-${end}.txt`;
}

export function resolvePostbackLogsDir() {
  const config = getConfig();
  return config.postbackLogs?.dir || join(process.cwd(), 'logs', 'postbacks');
}

/** Writes the greppable log onto the API host. Overwrites the same range file. */
export async function writeDayReportFile(text, range, dirOverride) {
  const from = typeof range === 'string' ? range : range?.from;
  const to = typeof range === 'string' ? range : range?.to;
  const dir = dirOverride || resolvePostbackLogsDir();
  await mkdir(dir, { recursive: true });
  const filename = dayReportFilename(from, to);
  const absolutePath = join(dir, filename);
  const body = String(text || '');
  await writeFile(absolutePath, body, 'utf8');
  return {
    filename,
    absolutePath,
    relativePath: relative(process.cwd(), absolutePath) || filename,
    bytes: Buffer.byteLength(body, 'utf8'),
    writtenAt: new Date().toISOString(),
  };
}
