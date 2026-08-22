import * as campaignsApi from '../../services/api/campaigns'
import { healEditorHotspot } from '../utils/overlayStacking'
import { healFlowButtonsInEditor } from '../utils/textSizeAlign'
import {
  buildSavePayload,
  layoutKeyForDevice,
  parseDeviceLayouts,
  snapshotLayout,
} from './deviceLayouts'

function healAllHotspots(editor) {
  const wrapper = editor?.getWrapper?.()
  if (!wrapper) return
  const walk = (cmp) => {
    if (cmp.getAttributes?.()?.['data-tc-type'] === 'hotspot') {
      try {
        healEditorHotspot(cmp, editor)
      } catch (_) {
        /* noop */
      }
    }
    cmp.components?.()?.forEach?.(walk)
  }
  walk(wrapper)
}

/**
 * Persist campaign page content from GrapesJS.
 * Snapshot = component html/css + projectData; runtime chrome (responsive/fonts)
 * is applied at Preview/live via flowRuntimeCss — do not expect those rules in DB css.
 */
export async function saveCampaignPage(
  editor,
  campaignId,
  pageType,
  customWidth,
  customHeight,
) {
  // Persist hotspot geometry as % so live preview matches the canvas
  healAllHotspots(editor)
  // Strip accidental absolute CTAs before save (keeps in-card OTP/SUBSCRIBE in flow)
  healFlowButtonsInEditor(editor)

  const deviceName = String(editor.Devices?.getSelected?.()?.get?.('name') || 'Desktop')
  const currentKey = layoutKeyForDevice(deviceName)
  const currentSnapshot = snapshotLayout(editor, deviceName, customWidth, customHeight)
  const layouts = editor.__tcLayouts || parseDeviceLayouts({}, currentSnapshot.html, currentSnapshot.css)
  layouts[currentKey] = currentSnapshot
  editor.__tcLayouts = layouts

  const { projectData, html, css } = buildSavePayload(
    editor,
    layouts,
    currentKey,
    currentSnapshot,
    customWidth,
    customHeight,
  )

  return campaignsApi.saveCampaignPage(campaignId, pageType, {
    projectData,
    html,
    css,
  })
}
