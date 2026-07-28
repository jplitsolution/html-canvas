import { getActivePageSnapshot, collectPageExports, pageExportFilename } from './exportSite'

export function getTemplatePayload(editor, name) {
  const { html, css } = getActivePageSnapshot(editor)
  const selected = editor.Pages.getSelected()
  const pageName = String(selected?.get('name') || 'page')
  const isHome = selected?.getId() === 'home' || pageName.toLowerCase() === 'home'
  const activePageFilename = pageExportFilename(pageName, String(selected?.getId()), isHome)
  return {
    name,
    projectData: editor.getProjectData(),
    html,
    css,
    pages: collectPageExports(editor),
    activePageFilename,
  }
}
