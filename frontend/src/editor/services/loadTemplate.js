import { transformReactComponentsInHtml } from '../utils/styleUtils'
import { sanitizeSavedPageHtml } from './wysiwygContract'

export function loadIntoEditor(editor, data) {
  const hasProjectData =
    data.projectData &&
    typeof data.projectData === 'object' &&
    Object.keys(data.projectData).length > 0

  if (hasProjectData) {
    editor.loadProjectData(data.projectData)
    return
  }

  editor.setStyle(data.css || '')
  // Sanitize before setComponents so stray absolute CTAs never enter the canvas off-card
  const compiledHtml = transformReactComponentsInHtml(
    sanitizeSavedPageHtml(data.html || ''),
  )
  editor.setComponents(compiledHtml)
}

export function extractEditorData(editor) {
  return {
    projectData: editor.getProjectData(),
    html: editor.getHtml(),
    css: editor.getCss(),
  }
}
