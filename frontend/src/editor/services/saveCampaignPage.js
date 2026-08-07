import { getActivePageSnapshot } from './exportSite'
import * as campaignsApi from '../../services/api/campaigns'
import { healEditorHotspot } from '../utils/overlayStacking'

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

  const projectData = editor.getProjectData()
  if (customWidth) projectData.customWidth = customWidth
  if (customHeight) projectData.customHeight = customHeight

  const { html, css } = getActivePageSnapshot(editor)

  return campaignsApi.saveCampaignPage(campaignId, pageType, {
    projectData,
    html,
    css,
  })
}
