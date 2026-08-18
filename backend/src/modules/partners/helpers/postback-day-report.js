import { ConversionPostbackStatus } from '../../../database/entities/conversion-postback.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { DEFAULT_TIMEZONE, normalizeTimezone } from '../../../common/zoned-day.js';

export const DAY_REPORT_LOG_TYPES = [
  ApiCallType.BILLING_CALLBACK,
  ApiCallType.VENDOR_POSTBACK,
  ApiCallType.HE_REDIRECT,
  ApiCallType.CHECKSUB,
  ApiCallType.SUBSCRIBE,
];

export const DAY_REPORT_EVENT_TYPES = [
  VisitEventType.POSTBACK_PENDING,
  VisitEventType.POSTBACK_SENT,
  VisitEventType.POSTBACK_FAILED,
  VisitEventType.CALLBACK_RECEIVED,
];

export const DAY_REPORT_MAX_NUMBERS = 1500;

export function digitsMsisdn(value) {
  return String(value || '').replace(/\D/g, '');
}

export function todayYmd(timezone, now = new Date()) {
  const tz = normalizeTimezone(timezone || DEFAULT_TIMEZONE);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function formatInZone(date, timezone) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  const tz = normalizeTimezone(timezone || DEFAULT_TIMEZONE);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const bag = {};
  for (const part of fmt.formatToParts(d)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  const abbr = tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta' ? 'IST' : tz;
  return `${bag.year}-${bag.month}-${bag.day} ${bag.hour}:${bag.minute}:${bag.second} ${abbr}`;
}

function yn(value) {
  return value ? 'YES' : 'NO ';
}

function clip(value, max = 400) {
  if (value == null || value === '') return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

function pickLatest(items, getTime) {
  if (!items?.length) return null;
  return items.reduce((best, cur) => {
    const bt = getTime(best);
    const ct = getTime(cur);
    if (!ct) return best;
    if (!bt) return cur;
    return ct > bt ? cur : best;
  });
}

function ts(value) {
  if (!value) return 0;
  const n = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(n) ? 0 : n;
}

/**
 * One MSISDN → three answers ops people actually ask:
 * queued? billing received? vendor fired?
 */
export function buildNumberStory({
  msisdn,
  postback = null,
  logs = [],
  events = [],
  vendor = null,
  campaign = null,
} = {}) {
  const billingLogs = logs.filter((l) => l.callType === ApiCallType.BILLING_CALLBACK);
  const vendorLogs = logs.filter((l) => l.callType === ApiCallType.VENDOR_POSTBACK);
  const callbackEvents = events.filter(
    (e) => e.eventType === VisitEventType.CALLBACK_RECEIVED,
  );
  const pendingEvents = events.filter(
    (e) => e.eventType === VisitEventType.POSTBACK_PENDING,
  );

  const status = String(postback?.status || '').toLowerCase();
  const queued = Boolean(postback) || pendingEvents.length > 0;

  const billingFromStatus =
    status === ConversionPostbackStatus.SENT ||
    status === ConversionPostbackStatus.FAILED;
  const billingReceived =
    billingLogs.length > 0 || callbackEvents.length > 0 || billingFromStatus;

  const latestBilling = pickLatest(
    [...billingLogs, ...callbackEvents],
    (item) => ts(item.createdAt),
  );
  const latestVendorLog = pickLatest(vendorLogs, (item) => ts(item.createdAt));

  const vendorFired =
    Boolean(postback?.sentAt) ||
    status === ConversionPostbackStatus.SENT ||
    status === ConversionPostbackStatus.FAILED ||
    status === ConversionPostbackStatus.SKIPPED ||
    vendorLogs.length > 0;

  let vendorFireStatus = 'none';
  if (status === ConversionPostbackStatus.SENT || latestVendorLog?.success === true) {
    vendorFireStatus = ConversionPostbackStatus.SENT;
  } else if (
    status === ConversionPostbackStatus.FAILED ||
    latestVendorLog?.success === false
  ) {
    vendorFireStatus = ConversionPostbackStatus.FAILED;
  } else if (status === ConversionPostbackStatus.SKIPPED) {
    vendorFireStatus = ConversionPostbackStatus.SKIPPED;
  } else if (vendorFired) {
    vendorFireStatus = status || 'fired';
  } else if (queued) {
    vendorFireStatus = ConversionPostbackStatus.PENDING;
  }

  let outcome = 'not_queued';
  let outcomeLabel =
    'NOT QUEUED — no conversion_postbacks row. Vendor CPA was never armed for this number.';

  if (!queued && billingReceived) {
    outcome = 'callback_no_row';
    outcomeLabel =
      'CALLBACK WITH NO QUEUE — operator hit /callback but there was no pending postback row for this MSISDN, so vendor CPA was not fired.';
  } else if (status === ConversionPostbackStatus.SENT || vendorFireStatus === 'sent') {
    outcome = 'complete';
    outcomeLabel =
      'COMPLETE — billing callback received and vendor CPA postback fired successfully.';
  } else if (status === ConversionPostbackStatus.FAILED || vendorFireStatus === 'failed') {
    outcome = 'fire_failed';
    outcomeLabel =
      'FIRE FAILED — billing callback received (or fire attempted) but vendor CPA HTTP failed.';
  } else if (status === ConversionPostbackStatus.SKIPPED) {
    outcome = 'skipped';
    outcomeLabel =
      'SKIPPED — queued, but vendor fire was skipped (usually no postback URL on vendor).';
  } else if (queued && !billingReceived) {
    outcome = 'waiting_callback';
    outcomeLabel =
      'WAITING — postback queued. Billing/operator callback not received yet. Vendor CPA not fired.';
  } else if (queued && billingReceived && !vendorFired) {
    outcome = 'waiting_fire';
    outcomeLabel =
      'CALLBACK RECEIVED — billing arrived but vendor CPA has not been marked fired yet.';
  } else if (queued) {
    outcome = 'waiting_callback';
    outcomeLabel =
      'WAITING — postback queued. Billing callback not confirmed. Vendor CPA not fired.';
  }

  const timeline = [
    ...logs.map((l) => ({
      at: l.createdAt || null,
      source: 'api_call_logs',
      type: l.callType,
      ok: l.success !== false,
      http: l.responseStatus ?? null,
      url: l.requestUrl || '',
      body: clip(l.responseBody || l.requestBody, 500),
      error: l.errorMessage || '',
      detail: [
        l.success === false ? 'FAILED' : 'OK',
        l.responseStatus != null ? `HTTP ${l.responseStatus}` : '',
        l.errorMessage || '',
      ]
        .filter(Boolean)
        .join('  '),
    })),
    ...events.map((e) => ({
      at: e.createdAt || null,
      source: 'visit_events',
      type: e.eventType,
      ok: e.eventType !== VisitEventType.POSTBACK_FAILED,
      http: null,
      url: '',
      body: clip(e.metadata, 400),
      error: '',
      detail: e.eventType,
    })),
  ].sort((a, b) => ts(a.at) - ts(b.at));

  return {
    msisdn: String(msisdn || ''),
    visitId: postback?.visitId || logs.find((l) => l.visitId)?.visitId || null,
    clickId: postback?.clickId || logs.find((l) => l.clickId)?.clickId || null,
    rcid: postback?.rcid || logs.find((l) => l.rcid)?.rcid || null,
    campid: postback?.campid || null,
    trackingCampid: postback?.trackingCampid || null,
    campaignId: postback?.campaignId || campaign?.id || null,
    campaignName: campaign?.name || null,
    vendorId: postback?.vendorId || vendor?.id || null,
    vendorName: vendor?.name || null,
    vendorCode: vendor?.code || null,
    postbackId: postback?.id || null,
    queued,
    queuedAt: postback?.createdAt || pendingEvents[0]?.createdAt || null,
    status: status || null,
    billingReceived,
    billingReceivedAt:
      latestBilling?.createdAt ||
      (billingFromStatus ? postback?.sentAt || postback?.updatedAt : null) ||
      null,
    billingHttp: latestBilling?.responseStatus ?? null,
    vendorFired,
    vendorFireStatus,
    vendorFiredAt:
      postback?.sentAt || latestVendorLog?.createdAt || null,
    vendorHttp: postback?.httpStatus ?? latestVendorLog?.responseStatus ?? null,
    vendorUrl: postback?.postbackUrl || latestVendorLog?.requestUrl || '',
    vendorResponse: clip(postback?.responseBody || latestVendorLog?.responseBody, 800),
    vendorError: postback?.errorMessage || latestVendorLog?.errorMessage || '',
    outcome,
    outcomeLabel,
    timeline,
  };
}

export function summarizeStories(numbers) {
  const summary = {
    numbers: numbers.length,
    queued: 0,
    billingReceived: 0,
    billingMissing: 0,
    vendorSent: 0,
    vendorFailed: 0,
    vendorPending: 0,
    skipped: 0,
    notQueued: 0,
    callbackNoRow: 0,
    complete: 0,
    waitingCallback: 0,
    fireFailed: 0,
  };
  for (const n of numbers) {
    if (n.queued) summary.queued += 1;
    else summary.notQueued += 1;
    if (n.billingReceived) summary.billingReceived += 1;
    else summary.billingMissing += 1;
    if (n.vendorFireStatus === ConversionPostbackStatus.SENT) summary.vendorSent += 1;
    else if (n.vendorFireStatus === ConversionPostbackStatus.FAILED) {
      summary.vendorFailed += 1;
    } else if (n.vendorFireStatus === ConversionPostbackStatus.SKIPPED) {
      summary.skipped += 1;
    } else if (n.queued) {
      summary.vendorPending += 1;
    }
    if (n.outcome === 'complete') summary.complete += 1;
    else if (n.outcome === 'waiting_callback') summary.waitingCallback += 1;
    else if (n.outcome === 'fire_failed') summary.fireFailed += 1;
    else if (n.outcome === 'callback_no_row') summary.callbackNoRow += 1;
  }
  return summary;
}

export function formatDayReportText(report, timezone) {
  const tz = normalizeTimezone(timezone || report.timezone || DEFAULT_TIMEZONE);
  const lines = [];
  const bar = '='.repeat(80);
  const thin = '-'.repeat(80);
  const summary = report.summary || summarizeStories(report.numbers || []);
  const generated = formatInZone(report.generatedAt || new Date(), tz);

  lines.push(bar);
  lines.push('WAP MANAGER — POSTBACK DAY LOG  (source of truth for ops)');
  lines.push(`Date: ${report.date || ''}   timezone: ${tz}`);
  if (report.from && report.to && report.from !== report.to) {
    lines.push(`Range: ${report.from} → ${report.to}`);
  }
  lines.push(`Generated: ${generated}`);
  if (report.truncated) {
    lines.push(
      `NOTE: truncated to ${DAY_REPORT_MAX_NUMBERS} numbers (oldest extras dropped).`,
    );
  }
  lines.push(bar);
  lines.push('');
  lines.push('SUMMARY');
  lines.push(`  Numbers in this file     : ${summary.numbers}`);
  lines.push(`  Queued (postback row)    : ${summary.queued}`);
  lines.push(`  Billing callback YES     : ${summary.billingReceived}`);
  lines.push(`  Billing callback NO      : ${summary.billingMissing}`);
  lines.push(`  Vendor fire SENT         : ${summary.vendorSent}`);
  lines.push(`  Vendor fire FAILED       : ${summary.vendorFailed}`);
  lines.push(`  Vendor fire not yet      : ${summary.vendorPending}`);
  lines.push(`  Skipped                  : ${summary.skipped}`);
  lines.push(`  Complete (recv+fired OK) : ${summary.complete}`);
  lines.push(`  Waiting for callback     : ${summary.waitingCallback}`);
  lines.push(`  Fire failed              : ${summary.fireFailed}`);
  lines.push(`  Callback with no queue   : ${summary.callbackNoRow}`);
  lines.push(`  Not queued at all        : ${summary.notQueued}`);
  lines.push('');
  lines.push('HOW TO READ EACH NUMBER');
  lines.push('  1. QUEUED   — did we create a conversion_postbacks row?');
  lines.push('  2. RECEIVED — did billing/operator hit /api/flow/callback?');
  lines.push('  3. FIRED    — did we GET the vendor CPA postback URL?');
  lines.push('');

  const numbers = report.numbers || [];
  if (!numbers.length) {
    lines.push(thin);
    lines.push('No postback / callback / vendor-fire activity for this date.');
    lines.push(thin);
    return `${lines.join('\n')}\n`;
  }

  for (const n of numbers) {
    lines.push(bar);
    lines.push(`MSISDN  ${n.msisdn || '(unknown)'}`);
    lines.push(bar);
    lines.push(
      `  1. QUEUED     ${yn(n.queued)}  ${formatInZone(n.queuedAt, tz) || '—'}  ${
        n.postbackId ? `row#${n.postbackId}` : 'no row'
      }  status=${n.status || '—'}`,
    );
    lines.push(
      `  2. RECEIVED   ${yn(n.billingReceived)}  ${
        formatInZone(n.billingReceivedAt, tz) || '—'
      }${n.billingHttp != null ? `  HTTP ${n.billingHttp}` : ''}`,
    );
    const fireWord =
      n.vendorFireStatus === 'sent'
        ? 'YES'
        : n.vendorFireStatus === 'failed'
          ? 'FAIL'
          : n.vendorFired
            ? 'YES'
            : 'NO ';
    lines.push(
      `  3. FIRED      ${fireWord}  ${formatInZone(n.vendorFiredAt, tz) || '—'}  ${
        n.vendorFireStatus
      }${n.vendorHttp != null ? `  HTTP ${n.vendorHttp}` : ''}`,
    );
    lines.push('');
    lines.push(`  Verdict: ${n.outcomeLabel}`);
    if (n.vendorName) {
      lines.push(
        `  Vendor: ${n.vendorName}${n.vendorCode ? ` (${n.vendorCode})` : ''}`,
      );
    }
    if (n.campaignName || n.campaignId || n.trackingCampid || n.campid) {
      lines.push(
        `  Campaign: ${n.campaignName || '—'}  id=${n.campaignId || '—'}  tracking_campid=${n.trackingCampid || '—'}  campid=${n.campid || '—'}`,
      );
    }
    lines.push(
      `  Visit: ${n.visitId != null ? `#${n.visitId}` : '—'}  click_id=${n.clickId || '—'}  rcid=${n.rcid || '—'}`,
    );
    if (n.vendorUrl) lines.push(`  Vendor URL: ${n.vendorUrl}`);
    if (n.vendorError) lines.push(`  Vendor error: ${n.vendorError}`);
    if (n.vendorResponse) lines.push(`  Vendor response: ${clip(n.vendorResponse, 300)}`);
    lines.push('');
    lines.push('  Timeline:');
    if (!n.timeline?.length) {
      lines.push('    (no api_call_logs / visit_events for this number on this date)');
    } else {
      for (const ev of n.timeline) {
        const t = formatInZone(ev.at, tz) || '—';
        lines.push(
          `    ${t}  ${String(ev.type || '').padEnd(20)}  ${ev.detail || ''}`,
        );
        if (ev.url) lines.push(`      URL: ${ev.url}`);
        if (ev.error) lines.push(`      error: ${ev.error}`);
        if (ev.body && (ev.type === ApiCallType.VENDOR_POSTBACK || ev.type === ApiCallType.BILLING_CALLBACK)) {
          lines.push(`      body: ${clip(ev.body, 240)}`);
        }
      }
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

export function emptyDayReport({ date, timezone, from, to, rangeClamped }) {
  return {
    date,
    timezone,
    from,
    to,
    generatedAt: new Date().toISOString(),
    truncated: false,
    rangeClamped: Boolean(rangeClamped),
    summary: summarizeStories([]),
    numbers: [],
    text: formatDayReportText(
      {
        date,
        timezone,
        from,
        to,
        generatedAt: new Date().toISOString(),
        truncated: false,
        summary: summarizeStories([]),
        numbers: [],
      },
      timezone,
    ),
  };
}
