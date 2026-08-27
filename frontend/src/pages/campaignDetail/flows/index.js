/**
 * Campaign Detail flow registry.
 *
 * New verification mode: add a file next to this one, then register it in FLOWS.
 * Do not add `if (mode === …)` branches back into CampaignDetailPage.
 */

import { normalizeModeId } from '../../../components/flow/verificationModes'
import HeaderInjection from './HeaderInjection'
import OtpOnly from './OtpOnly'
import Both from './Both'
import UniverseDcb from './UniverseDcb'
import None from './None'
import CgHome from './CgHome'

const FLOWS = {
  HEADER_INJECTION: HeaderInjection,
  OTP_ONLY: OtpOnly,
  BOTH: Both,
  UNIVERSE_DCB: UniverseDcb,
  NONE: None,
  CG_HOME: CgHome,
}

const DEFAULT_ASSIGNMENT_ACTIONS = {
  openTracking: false,
  downloadApiGuide: null,
  downloadHtmlScreen: false,
  openHtmlScreen: false,
}

export function resolveCampaignDetailFlow(campaign) {
  const mode = normalizeModeId(campaign?.verificationMode)
  const module = FLOWS[mode] || FLOWS.BOTH
  const flow = typeof module.resolve === 'function' ? module.resolve(campaign) : module
  return {
    ...flow,
    assignmentActions: { ...DEFAULT_ASSIGNMENT_ACTIONS, ...flow.assignmentActions },
  }
}
