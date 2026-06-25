import type { Editor } from 'grapesjs'
import { getActivePageSnapshot } from './exportSite'
import * as campaignsApi from '../../services/api/campaigns'

export async function saveCampaignPage(
  editor: Editor,
  campaignId: string,
  pageType: string,
) {
  const projectData = editor.getProjectData() as Record<string, unknown>
  const { html, css } = getActivePageSnapshot(editor)

  return campaignsApi.saveCampaignPage(campaignId, pageType, {
    projectData,
    html,
    css,
  })
}
