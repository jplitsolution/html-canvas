import type { Editor } from 'grapesjs'
import * as projectsApi from '../../services/api/projects'
import type { SavedTemplatePayload } from '../types'
import { getActivePageSnapshot, collectPageExports, pageExportFilename } from './exportSite'

export interface SaveTemplateMeta {
  id: string
  name: string
  createdAt?: string
  metadata?: { tags: string[]; description: string }
}

export async function saveTemplate(editor: Editor, meta: SaveTemplateMeta) {
  const projectData = editor.getProjectData() as Record<string, unknown>
  const { html, css } = getActivePageSnapshot(editor)

  const saved = await projectsApi.saveProject({
    id: meta.id,
    title: meta.name,
    editor: 'grapesjs',
    version: 2,
    projectData,
    html,
    css,
    createdAt: meta.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: meta.metadata || { tags: [], description: '' },
  })

  return saved
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
