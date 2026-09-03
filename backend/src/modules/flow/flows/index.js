/**
 * Backend flow registry — one file per verification mode.
 *
 * New mode: add a file next to this one, register it in FLOWS.
 * Do not copy detect.js / get-page.js (visit + api_call_logs stay shared).
 *
 * Aliases: MSISDN_ONLY → HEADER_INJECTION. NULL is NOT aliased here —
 * defaultStartConfig('NULL') historically used HE defaults, not NONE.
 */

import HeaderInjection from './HeaderInjection.js';
import OtpOnly from './OtpOnly.js';
import Both from './Both.js';
import UniverseDcb from './UniverseDcb.js';
import OrangeBf from './OrangeBf.js';
import None from './None.js';
import CgHome from './CgHome.js';

export const FLOWS = {
  HEADER_INJECTION: HeaderInjection,
  OTP_ONLY: OtpOnly,
  BOTH: Both,
  UNIVERSE_DCB: UniverseDcb,
  ORANGE_BF: OrangeBf,
  NONE: None,
  CG_HOME: CgHome,
};

export function resolveFlow(mode) {
  const key = String(mode || '').toUpperCase();
  if (key === 'MSISDN_ONLY') return FLOWS.HEADER_INJECTION;
  return FLOWS[key] || null;
}

export function resolveFlowOrBoth(mode) {
  return resolveFlow(mode) || FLOWS.BOTH;
}

export function wapBlockedError(mode) {
  const err = new Error(resolveFlowOrBoth(mode).wapBlockedMessage);
  err.statusCode = 400;
  return err;
}
