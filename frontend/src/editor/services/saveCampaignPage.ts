import type { Editor } from 'grapesjs'
import { getActivePageSnapshot } from './exportSite'
import * as campaignsApi from '../../services/api/campaigns'

export async function saveCampaignPage(
  editor: Editor,
  campaignId: string,
  pageType: string,
  customWidth?: string,
  customHeight?: string,
) {
  const projectData = editor.getProjectData() as Record<string, unknown>
  if (customWidth) projectData.customWidth = customWidth
  if (customHeight) projectData.customHeight = customHeight

  const { html, css } = getActivePageSnapshot(editor)

  return campaignsApi.saveCampaignPage(campaignId, pageType, {
    projectData,
    html,
    css,
  })
}
