import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';

const PAGE_TYPES = new Set(Object.values(CampaignPageType));

const normalizeGo = (raw) => {
  const g = String(raw || 'continue')
    .trim()
    .toLowerCase();
  if (g === 'page' || g === 'external' || g === 'continue') return g;
  return 'continue';
};

const normalizePage = (raw) => {
  const p = String(raw || '')
    .trim()
    .toUpperCase();
  return PAGE_TYPES.has(p) ? p : null;
};

const readObjectField = (obj, key) => {
  if (!obj || typeof obj !== 'object' || !key) return null;
  if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  const lower = String(key).toLowerCase();
  for (const [k, v] of Object.entries(obj)) {
    if (String(k).toLowerCase() === lower && v != null) return v;
  }
  return null;
};

/**
 * Parse api_configs.checksub_config_json.
 * Returns null when empty → callers keep legacy pageTypeForSubscriptionStatus.
 */
export function parseChecksubConfig(raw) {
  if (raw == null || raw === '') return null;
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const rulesIn = Array.isArray(parsed.rules) ? parsed.rules : [];
  const rules = rulesIn
    .map((r) => ({
      value: r?.value != null ? String(r.value).trim() : '',
      go: normalizeGo(r?.go),
      page: normalizePage(r?.page) || CampaignPageType.THANKYOU,
      url: r?.url != null ? String(r.url).trim() : '',
    }))
    .filter((r) => r.value !== '');

  const statusField =
    String(parsed.statusField || 'currentStatus').trim() || 'currentStatus';
  const missGo = normalizeGo(parsed.missGo || 'continue');
  const missPage = normalizePage(parsed.missPage) || CampaignPageType.ERROR;
  const missUrl = parsed.missUrl != null ? String(parsed.missUrl).trim() : '';

  if (rules.length === 0 && !parsed.statusField && !parsed.missGo) {
    return null;
  }

  return { statusField, rules, missGo, missPage, missUrl };
}

/**
 * Extract status string from partner checksub body (plain text OR JSON).
 * statusField=body → whole response text; otherwise JSON key (incl. nested data.*).
 */
export function extractChecksubStatus(rawData, statusField = 'currentStatus') {
  const field = String(statusField || 'currentStatus').trim();
  const fieldLower = field.toLowerCase();
  const isBody =
    fieldLower === 'body' || fieldLower === '__body__' || fieldLower === '*';

  if (isBody) {
    if (typeof rawData === 'string') return rawData.trim();
    if (rawData == null) return '';
    if (typeof rawData === 'object') {
      const nestedBody = readObjectField(rawData, 'body');
      if (typeof nestedBody === 'string') return nestedBody.trim();
    }
    return '';
  }

  let data = rawData;
  if (typeof rawData === 'string') {
    const trimmed = rawData.trim();
    if (!trimmed) return '';
    try {
      data = JSON.parse(trimmed);
    } catch {
      return '';
    }
  }
  if (!data || typeof data !== 'object') return '';

  // 1. Support dot-notation path (e.g. data.currentStatus, payload.status)
  if (field.includes('.')) {
    const parts = field.split('.');
    let cur = data;
    for (const part of parts) {
      if (!cur || typeof cur !== 'object') {
        cur = null;
        break;
      }
      cur = readObjectField(cur, part);
    }
    if (cur != null && typeof cur !== 'object') {
      return String(cur).trim();
    }
  }

  // 2. Direct lookup at top-level
  const top = readObjectField(data, field);
  if (top != null && typeof top !== 'object') return String(top).trim();

  // 3. Auto-fallback into nested data / result / payload objects
  const nested = (data.data && typeof data.data === 'object' ? data.data : null) ||
                 (data.result && typeof data.result === 'object' ? data.result : null) ||
                 (data.payload && typeof data.payload === 'object' ? data.payload : null);

  if (nested) {
    const fromNested = readObjectField(nested, field);
    if (fromNested != null && typeof fromNested !== 'object') {
      return String(fromNested).trim();
    }
  }
  return '';
}

const buildOutcome = (statusRaw, go, page, url) => {
  const status = String(statusRaw || '')
    .trim()
    .toLowerCase();
  const g = normalizeGo(go);
  const p = normalizePage(page) || CampaignPageType.THANKYOU;
  const u = String(url || '').trim();

  let isActive = false;
  let shouldSkipSubscribe = false;
  if (g === 'page') {
    shouldSkipSubscribe = true;
    isActive = p === CampaignPageType.THANKYOU;
  } else if (g === 'external') {
    shouldSkipSubscribe = Boolean(u);
    isActive = false;
  }

  return {
    status: status || 'unknown',
    currentStatus: status || null,
    subscriptionStatus: null,
    isActive,
    shouldSkipSubscribe,
    go: g,
    page: g === 'page' ? p : null,
    url: g === 'external' && u ? u : null,
  };
};

/**
 * Legacy mapping when campaign has no checksubConfigJson rules.
 * Only `new` continues the funnel; active / parking / grace / … skip subscribe.
 */
export function mapLegacyChecksubBody(rawData) {
  const data =
    typeof rawData === 'string'
      ? (() => {
          try {
            return JSON.parse(rawData);
          } catch {
            return {};
          }
        })()
      : rawData && typeof rawData === 'object'
        ? rawData
        : {};
  const nested = data.data ?? data;
  const currentStatus = String(nested.currentStatus || '')
    .trim()
    .toLowerCase();
  const subscriptionStatus = String(nested.subscriptionStatus || '')
    .trim()
    .toLowerCase();

  let isActive =
    currentStatus === 'active' || subscriptionStatus === 'active';
  if (!isActive && !currentStatus && !subscriptionStatus) {
    isActive = Boolean(
      nested.subscribed ??
        nested.isSubscribed ??
        nested.active ??
        data.subscribed ??
        data.isSubscribed ??
        data.active,
    );
  }

  const apiStatus = String(nested.status || data.status || '')
    .trim()
    .toLowerCase();
  const reason = String(nested.reason || data.reason || '')
    .trim()
    .toLowerCase();

  let status =
    currentStatus ||
    subscriptionStatus ||
    (isActive ? 'active' : 'unknown');

  if (
    !isActive &&
    !currentStatus &&
    !subscriptionStatus &&
    (reason === 'servicenotexists' || apiStatus === 'new')
  ) {
    status = 'new';
  }

  const shouldSkipSubscribe =
    isActive ||
    (Boolean(status) && status !== 'new' && status !== 'unknown');

  return {
    currentStatus: currentStatus || null,
    subscriptionStatus: subscriptionStatus || null,
    status,
    isActive,
    shouldSkipSubscribe,
    go: null,
    page: null,
    url: null,
  };
}

/**
 * Campaign rules if configured, otherwise legacy new/active mapping.
 */
export function interpretChecksubResponse(rawData, checksubConfigJson) {
  const ruled = evaluateChecksubRules(rawData, checksubConfigJson);
  return ruled || mapLegacyChecksubBody(rawData);
}

/**
 * Evaluate campaign checksub rules against partner response.
 * @returns {null|object} null when no config (use legacy path)
 */
export function evaluateChecksubRules(rawData, configOrJson) {
  const config =
    configOrJson && typeof configOrJson === 'object' && configOrJson.rules
      ? configOrJson
      : parseChecksubConfig(configOrJson);
  if (!config) return null;

  const status = extractChecksubStatus(rawData, config.statusField);
  const statusNorm = status.toLowerCase();

  for (const rule of config.rules) {
    if (String(rule.value).toLowerCase() === statusNorm) {
      return buildOutcome(status, rule.go, rule.page, rule.url);
    }
  }

  return buildOutcome(status, config.missGo, config.missPage, config.missUrl);
}
