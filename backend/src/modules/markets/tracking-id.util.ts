export type ParsedTrackingId = {
  countryCode: string;
  operatorCode: string;
  campaignId: number;
};

/** Composite tracking id: IN-AIRTEL-12 */
export function buildTrackingId(
  countryCode: string,
  operatorCode: string,
  campaignId: number,
): string {
  return `${String(countryCode).toUpperCase()}-${String(operatorCode).toUpperCase()}-${campaignId}`;
}

const COMPOSITE_RE = /^([A-Z0-9]+)-([A-Z0-9]+)-(\d+)$/i;

export function parseTrackingId(campid?: string | null): ParsedTrackingId | null {
  if (!campid || typeof campid !== 'string') return null;
  const m = COMPOSITE_RE.exec(campid.trim());
  if (!m) return null;
  return {
    countryCode: m[1].toUpperCase(),
    operatorCode: m[2].toUpperCase(),
    campaignId: Number(m[3]),
  };
}

export function isNumericCampid(campid?: string | null): boolean {
  if (!campid || typeof campid !== 'string') return false;
  return /^\d+$/.test(campid.trim());
}

const KNOWN_COUNTRY_CODES: Record<string, string> = {
  india: 'IN',
  pakistan: 'PK',
  bangladesh: 'BD',
  indonesia: 'ID',
  nigeria: 'NG',
  kenya: 'KE',
  ghana: 'GH',
  'south africa': 'ZA',
  egypt: 'EG',
  uae: 'AE',
  'united arab emirates': 'AE',
  'saudi arabia': 'SA',
};

/** Derive a stable country code from a display name (migration / create helpers). */
export function deriveCountryCode(name: string): string {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'XX';
  if (/^[A-Za-z]{2,3}$/.test(trimmed)) return trimmed.toUpperCase();
  const known = KNOWN_COUNTRY_CODES[trimmed.toLowerCase()];
  if (known) return known;
  const slug = trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return (slug.slice(0, 8) || 'XX').toUpperCase();
}

export function deriveOperatorCode(name: string): string {
  const slug = String(name || '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return (slug.slice(0, 32) || 'OP').toUpperCase();
}

export function normalizeCode(code: string): string {
  return String(code || '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}
