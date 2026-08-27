import { flowEngineService } from '../flow-engine.service.js';
import { normalizeStartConfig } from './start-config.js';
import { resolveFlowOrBoth } from '../flows/index.js';

/**
 * HE on landing: mode allows it AND startConfig.runHe is not false.
 * OTP_ONLY / NONE / CG_HOME → no HE unless someone forced runHe (still capped by mode).
 */
export function shouldRunHeOnDetect(verificationMode, startConfig) {
  const mode = flowEngineService.normalizeMode(verificationMode) || 'BOTH';
  if (!resolveFlowOrBoth(mode).allowsHe) return false;
  const cfg = normalizeStartConfig(startConfig, mode);
  return cfg.runHe !== false;
}
