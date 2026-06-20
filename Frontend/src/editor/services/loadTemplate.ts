import type { Editor } from 'grapesjs'
import type { GrapesEditorData } from '../types'

export function loadIntoEditor(editor: Editor, data: GrapesEditorData) {
  const hasProjectData =
    data.projectData &&
    typeof data.projectData === 'object' &&
    Object.keys(data.projectData).length > 0

  if (hasProjectData) {
    editor.loadProjectData(data.projectData as Record<string, unknown>)
    return
  }

  editor.setComponents(data.html || '')
  editor.setStyle(data.css || '')
}

export function extractEditorData(editor: Editor): GrapesEditorData {
  return {
    projectData: editor.getProjectData() as Record<string, unknown>,
    html: editor.getHtml(),
    css: editor.getCss(),
  }
}
