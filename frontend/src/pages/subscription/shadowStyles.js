/**
 * Live funnel shadow styles — re-export shared runtime CSS so canvas and
 * SubscriptionPage cannot drift (see editor/services/flowRuntimeCss.js).
 */
import { FLOW_RUNTIME_CSS } from '../../editor/services/flowRuntimeCss'

const FLOW_SHADOW_STYLES = FLOW_RUNTIME_CSS

export { FLOW_SHADOW_STYLES }
