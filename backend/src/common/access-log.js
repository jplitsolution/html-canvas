import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import { DEFAULT_TIMEZONE, normalizeTimezone } from './zoned-day.js';

export function accessLogFilename(dateYmd) {
  const day = /^(\d{4}-\d{2}-\d{2})$/.exec(String(dateYmd || '').trim())?.[1];
  return day ? `access-${day}.log` : 'access-unknown.log';
}

export function accessLogDay(timezone = DEFAULT_TIMEZONE, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizeTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Public URL the client hit (scheme + host + path + query). */
export function requestFullUrl(req) {
  const forwardedProto = String(req.get?.('x-forwarded-proto') || '')
    .split(',')[0]
    .trim();
  const proto = forwardedProto || req.protocol || 'http';
  const forwardedHost = String(req.get?.('x-forwarded-host') || '')
    .split(',')[0]
    .trim();
  const host = forwardedHost || req.get?.('host') || req.headers?.host || '';
  const path = req.originalUrl || req.url || '';
  return host ? `${proto}://${host}${path}` : path;
}

export const ACCESS_LOG_FORMAT =
  ':date[iso] :method :full-url :status :response-time ms :remote-addr :res[content-length] ":user-agent"';

export function registerAccessLogTokens(morganLib) {
  morganLib.token('full-url', requestFullUrl);
}

/**
 * Writable stream for morgan: one file per IST calendar day.
 * Midnight rollover opens `access-YYYY-MM-DD.log` automatically.
 */
export function createDailyAccessLogStream({
  dir,
  timezone = DEFAULT_TIMEZONE,
  now = () => new Date(),
} = {}) {
  if (!dir) throw new Error('access log dir is required');
  mkdirSync(dir, { recursive: true });

  let currentDay = null;
  let fileStream = null;

  function rotateIfNeeded() {
    const day = accessLogDay(timezone, now());
    if (day === currentDay && fileStream) return fileStream;
    if (fileStream) {
      fileStream.end();
      fileStream = null;
    }
    currentDay = day;
    fileStream = createWriteStream(join(dir, accessLogFilename(day)), {
      flags: 'a',
    });
    return fileStream;
  }

  return {
    write(chunk, encoding, callback) {
      try {
        const stream = rotateIfNeeded();
        const ok = stream.write(chunk, encoding);
        if (typeof callback === 'function') {
          if (ok) callback();
          else stream.once('drain', callback);
        }
        return ok;
      } catch (err) {
        if (typeof callback === 'function') callback(err);
        else {
          console.warn(`access log write failed: ${err?.message || err}`);
        }
        return false;
      }
    },
    end(cb) {
      if (fileStream) fileStream.end(cb);
      else if (typeof cb === 'function') cb();
    },
  };
}
