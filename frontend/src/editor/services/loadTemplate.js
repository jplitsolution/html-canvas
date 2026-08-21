import { transformReactComponentsInHtml } from '../utils/styleUtils'
import { sanitizeSavedPageHtml } from './wysiwygContract'

export function loadIntoEditor(editor, data) {
  const html = typeof data?.html === 'string' ? data.html.trim() : ''

  // Live subscription serves html/css. Prefer that snapshot so the editor
  // does not reopen a stale GrapesJS projectData from an older template.
  if (html) {
    editor.setStyle(data.css || '')
    const compiledHtml = transformReactComponentsInHtml(
      sanitizeSavedPageHtml(data.html || ''),
    )
    editor.setComponents(compiledHtml)
    return
  }

  const hasProjectData =
    data.projectData &&
    typeof data.projectData === 'object' &&
    Object.keys(data.projectData).length > 0

  if (hasProjectData) {
    editor.loadProjectData(data.projectData)
  }
}

export function extractEditorData(editor) {
  return {
    projectData: editor.getProjectData(),
    html: editor.getHtml(),
    css: editor.getCss(),
  }
}
