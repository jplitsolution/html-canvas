import { getActivePageSnapshot } from './exportSite'
import * as campaignsApi from '../../services/api/campaigns'

export async function saveCampaignPage(
  editor,
  campaignId,
  pageType,
  customWidth,
  customHeight,
) {
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
