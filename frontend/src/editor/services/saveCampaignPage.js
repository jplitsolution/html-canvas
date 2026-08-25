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
    const children = cmp.components?.()
    if (children?.length) {
      const hotspots = []
      const len = children.length || 0
      for (let i = 0; i < len; i++) {
        const child = typeof children.at === 'function' ? children.at(i) : children.models?.[i]
        if (child?.getAttributes?.()?.['data-tc-type'] === 'hotspot') {
          hotspots.push(child)
        }
      }
      if (hotspots.length > 1) {
        const customPlaced = hotspots.filter((h) => {
          const st = h.getStyle?.() || {}
          return st.top !== '40%' || st.left !== '25%' || st.width !== '50%'
        })
        if (customPlaced.length > 0) {
          hotspots.forEach((h) => {
            if (!customPlaced.includes(h)) {
              try { children.remove(h) } catch (_) {}
            }
          })
        }
      }
      children.forEach((child) => {
        if (child?.getAttributes?.()?.['data-tc-type'] === 'hotspot') {
          try {
            healEditorHotspot(child, editor)
          } catch (_) {
            /* noop */
          }
        }
      })
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
  if (!layouts.desktop) {
    layouts.desktop = currentSnapshot
  }
  if (!layouts.mobile) {
    layouts.mobile = cloneLayout(currentSnapshot, { customWidth: '375' })
  }
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
