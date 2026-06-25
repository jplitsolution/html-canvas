import type { Editor } from 'grapesjs'
import type { SavedTemplatePayload } from '../types'
import { getActivePageSnapshot, collectPageExports, pageExportFilename } from './exportSite'

export interface SaveTemplateMeta {
  id: string
  name: string
  createdAt?: string
  metadata?: { tags: string[]; description: string }
}

export function getTemplatePayload(editor: Editor, name: string): SavedTemplatePayload {
  const { html, css } = getActivePageSnapshot(editor)
  const selected = editor.Pages.getSelected()
  const pageName = String(selected?.get('name') || 'page')
  const isHome = selected?.getId() === 'home' || pageName.toLowerCase() === 'home'
  const activePageFilename = pageExportFilename(pageName, String(selected?.getId()), isHome)
  return {
    name,
    projectData: editor.getProjectData() as Record<string, unknown>,
    html,
    css,
    pages: collectPageExports(editor),
    activePageFilename,
  }
}
