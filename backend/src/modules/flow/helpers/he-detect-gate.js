import { flowEngineService } from '../flow-engine.service.js';
import { normalizeStartConfig } from './start-config.js';

/**
 * HE on landing: mode allows it AND startConfig.runHe is not false.
 * OTP_ONLY / NONE → no HE unless someone forced runHe (still capped by mode).
 */
export function shouldRunHeOnDetect(verificationMode, startConfig) {
  const mode = flowEngineService.normalizeMode(verificationMode) || 'BOTH';
  const modeAllows = mode === 'HEADER_INJECTION' || mode === 'BOTH';
  if (!modeAllows) return false;
  const cfg = normalizeStartConfig(startConfig, mode);
  return cfg.runHe !== false;
}
