import { flowEngineService } from '../flow-engine.service.js';

/**
 * HE on landing only for modes that use header/API resolve.
 * OTP_ONLY / NONE → visit mint only, no HE partner calls / he_redirect log.
 */
export function shouldRunHeOnDetect(verificationMode) {
  const mode = flowEngineService.normalizeMode(verificationMode) || 'BOTH';
  return mode === 'HEADER_INJECTION' || mode === 'BOTH';
}
