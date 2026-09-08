import { filledTrackingValue } from '../../flow/helpers/placeholder-macro.js';

/** Affiliate click from landing `?rcid=` / `?click_id=` when visits.rcid was never stored. */
export const affiliateRcidFromLandingUrl = (landingUrl) => {
  const raw = String(landingUrl || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw, 'http://local.invalid');
    return (
      filledTrackingValue(u.searchParams.get('rcid') || '') ||
      filledTrackingValue(u.searchParams.get('click_id') || '') ||
      filledTrackingValue(u.searchParams.get('clickId') || '') ||
      ''
    );
  } catch {
    return '';
  }
};

export const affiliateRcidFromVisit = (visit) => {
  if (!visit) return '';
  return (
    filledTrackingValue(visit.rcid || '') ||
    affiliateRcidFromLandingUrl(visit.landingUrl) ||
    ''
  );
};

export const applyVisitAttributionToPostback = (row, visit) => {
  if (!row || !visit) return row;
  if (!row.clickId && visit.clickId) row.clickId = visit.clickId;
  const rcid = affiliateRcidFromVisit(visit);
  if (!row.rcid && rcid) row.rcid = rcid;
  if (!row.campid && visit.campid) row.campid = visit.campid;
  if (!row.trackingCampid && visit.trackingCampid) {
    row.trackingCampid = visit.trackingCampid;
  }
  if (!row.campaignId && visit.campaignId) row.campaignId = visit.campaignId;
  if (!row.vendorId && visit.vendorId) row.vendorId = visit.vendorId;
  return row;
};

export const serializeBody = (data) => {
  if (data == null) return null;
  try {
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch {
    return String(data);
  }
};

export const fillTemplate = (template, vars) => {
  let url = String(template || '');
  for (const [key, val] of Object.entries(vars)) {
    const encoded = encodeURIComponent(val ?? '');
    url = url.split(`{{${key}}}`).join(encoded);
    url = url.split(`{${key}}`).join(encoded);
    url = url.split(`%7B${key}%7D`).join(encoded);
    url = url.split(`%7B${key}%7d`).join(encoded);
    url = url.split(`%7b${key}%7d`).join(encoded);
    url = url.split(`%7b${key}%7D`).join(encoded);
  }
  return url;
};
