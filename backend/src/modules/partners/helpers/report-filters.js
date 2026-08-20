import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';

export const REPORT_OUTCOMES = new Set([
  'all',
  'complete',
  'waiting_callback',
  'waiting_fire',
  'fire_failed',
  'he_fail_cg',
  'callback_unmatched',
  'callback_no_row',
  'not_queued',
  'skipped',
]);

export const REPORT_HIT_FILTERS = new Set([
  'all',
  'billing_callback',
  'vendor_postback',
  'ok',
  'failed',
  'unmatched',
  'with_msisdn',
  'without_msisdn',
]);

export const REPORT_VIEWS = new Set(['numbers', 'hits', 'stats']);

function toInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseReportQuery(query = {}) {
  const outcome = String(query.outcome || query.filter || 'all').trim();
  const hitType = String(query.hitType || query.hitFilter || 'all').trim();
  const view = String(query.view || '').trim();
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 50));
  return {
    campaignId: toInt(query.campaignId),
    vendorId: toInt(query.vendorId),
    outcome: REPORT_OUTCOMES.has(outcome) ? outcome : 'all',
    hitType: REPORT_HIT_FILTERS.has(hitType) ? hitType : 'all',
    q: String(query.q || '').trim(),
    view: REPORT_VIEWS.has(view) ? view : '',
    page,
    limit,
    writeFile: String(query.writeFile || '') === '1' || query.writeFile === true,
  };
}

function haystackOf(parts) {
  return parts
    .filter((v) => v != null && v !== '')
    .join(' ')
    .toLowerCase();
}

export function matchesNumberFilters(row, filters = {}) {
  if (filters.campaignId && Number(row.campaignId) !== Number(filters.campaignId)) {
    return false;
  }
  if (filters.vendorId && Number(row.vendorId) !== Number(filters.vendorId)) {
    return false;
  }
  if (filters.outcome && filters.outcome !== 'all' && row.outcome !== filters.outcome) {
    return false;
  }
  const needle = String(filters.q || '').trim().toLowerCase();
  if (!needle) return true;
  return haystackOf([
    row.msisdn,
    row.clickId,
    row.rcid,
    row.campid,
    row.trackingCampid,
    row.vendorName,
    row.vendorCode,
    row.campaignName,
    row.visitId,
    row.postbackId,
    row.cgUrl,
    row.outcome,
    row.heError,
  ]).includes(needle);
}

export function matchesHitFilters(hit, filters = {}) {
  if (filters.campaignId && Number(hit.campaignId) !== Number(filters.campaignId)) {
    return false;
  }
  if (filters.vendorId && Number(hit.vendorId) !== Number(filters.vendorId)) {
    return false;
  }
  const hitType = filters.hitType || 'all';
  if (hitType === 'billing_callback' && hit.callType !== ApiCallType.BILLING_CALLBACK) {
    return false;
  }
  if (hitType === 'vendor_postback' && hit.callType !== ApiCallType.VENDOR_POSTBACK) {
    return false;
  }
  if (hitType === 'ok' && (hit.ok !== true || hit.unmatched)) return false;
  if (hitType === 'failed' && (hit.ok !== false || hit.unmatched)) return false;
  if (hitType === 'unmatched' && !hit.unmatched) return false;
  if (hitType === 'with_msisdn' && !hit.msisdnReceived) return false;
  if (hitType === 'without_msisdn' && hit.msisdnReceived) return false;
  const needle = String(filters.q || '').trim().toLowerCase();
  if (!needle) return true;
  return haystackOf([
    hit.msisdn,
    hit.clickId,
    hit.rcid,
    hit.visitId,
    hit.campaignId,
    hit.url,
    hit.reason,
    hit.error,
    hit.statusLabel,
    hit.callType,
  ]).includes(needle);
}

export function paginateItems(items, page = 1, limit = 50) {
  const list = Array.isArray(items) ? items : [];
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 50);
  const total = list.length;
  const start = (safePage - 1) * safeLimit;
  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    items: list.slice(start, start + safeLimit),
  };
}
