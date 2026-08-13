/**
 * Pure helpers for flow service (no I/O).
 */

export const API_HE_PROVIDERS = new Set([
  'safaricom_masked',
  'custom_http',
  'custom',
]);

export const isApiHeProvider = (provider) =>
  API_HE_PROVIDERS.has(String(provider || '').toLowerCase());

export const normalizePack = (pack) => {
  const value = (pack || 'daily').toLowerCase();
  if (value === 'weekly' || value === 'monthly') return value;
  return 'daily';
};

/** Partner subscribeApi {{subServiceId}} for daily / weekly / monthly. */
export const mapSubServiceId = (pack) => {
  const p = normalizePack(pack);
  if (p === 'weekly') return 'HWeekly';
  if (p === 'monthly') return 'HMonthly';
  return 'HDaily';
};

/** Button-level pack params — never a full URL. */
export const sanitizeSubscribeParam = (raw, max = 80) => {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|https?):/i.test(s)) return '';
  if (/\{\{|\}\}/.test(s)) return '';
  return s.slice(0, max);
};

/** Substitute {{msisdn}} / {{pack}} / {{planId}} / {{subServiceId}} etc. */
export const fillSubscribeTemplate = (template, vars = {}) => {
  let result = String(template || '');
  for (const [key, val] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(val ?? '');
  }
  return result;
};

export const formatPlanLabel = (pack) => {
  const normalized = normalizePack(pack);
  if (normalized === 'weekly') return 'Weekly Pack';
  if (normalized === 'monthly') return 'Monthly Pack';
  return 'Daily Pack';
};

export const buildSubscriptionUrl = (campaign, pack) => {
  const params = new URLSearchParams({
    country: campaign.country,
    operator: campaign.operator,
    pack,
  });
  return `/subscription?${params.toString()}`;
};

/**
 * Null-flow / HE CG redirect.
 * Never auto-append click_id / campid / rcid to third-party URLs — keep those
 * internal only. Only substitute placeholders that are already in the URL,
 * and optionally append msisdn when known and not already present.
 */
export const buildCgRedirectUrl = (rawUrl, attrs = {}) => {
  const ourClickId = String(attrs.clickId || '').trim();
  const rcid = String(attrs.rcid || '').trim();
  const msisdn = String(attrs.msisdn || attrs.phone || '')
    .replace(/\D/g, '')
    .trim();
  let url = String(rawUrl || '').trim();
  if (!url) return '';

  const vars = {
    click_id: ourClickId,
    rcid,
    clickId: ourClickId,
    vid: attrs.vid || '',
    aff_id: attrs.affId || '',
    campid: attrs.campid != null ? String(attrs.campid) : '',
    tracking_campid:
      attrs.trackingCampid != null ? String(attrs.trackingCampid) : '',
    msisdn,
    phone: msisdn,
  };
  const original = url;
  for (const [key, val] of Object.entries(vars)) {
    url = url.split(`{{${key}}}`).join(encodeURIComponent(val));
    url = url.split(`{${key}}`).join(encodeURIComponent(val));
  }

  const hadMsisdnPlaceholder = /\{\{?(?:msisdn|phone)\}?\}/.test(original);

  try {
    const u = new URL(url);
    // Do not append click_id / rcid / campid — open configured URL as-is.
    if (msisdn && !hadMsisdnPlaceholder && !u.searchParams.has('msisdn')) {
      u.searchParams.set('msisdn', msisdn);
    }
    return u.toString();
  } catch {
    let out = url;
    if (msisdn && !hadMsisdnPlaceholder && !/[?&]msisdn=/.test(out)) {
      const sep = out.includes('?') ? '&' : '?';
      out = `${out}${sep}msisdn=${encodeURIComponent(msisdn)}`;
    }
    return out;
  }
};

/** Per-button subscribe API override. http(s) only; placeholders allowed. */
export const normalizeSubscribeUrlOverride = (raw) => {
  const url = String(raw || '').trim();
  if (!url) return '';
  if (/^javascript:/i.test(url) || /^data:/i.test(url)) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return '';
};
