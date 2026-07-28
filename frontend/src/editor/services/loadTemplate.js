import { transformReactComponentsInHtml } from '../utils/styleUtils'

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
  const compiledHtml = transformReactComponentsInHtml(data.html || '')
  editor.setComponents(compiledHtml)
}

export function extractEditorData(editor) {
  return {
    projectData: editor.getProjectData(),
    html: editor.getHtml(),
    css: editor.getCss(),
  }
}
