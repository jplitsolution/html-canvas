import { buildHtmlDocument, downloadTextFile, slugifyFilename } from '../editor/services/exportSite'

export function downloadProjectHtml(project) {
  const html = project.html || ''
  const css = project.css || ''
  const title = project.title || 'Untitled'
  downloadTextFile(`${slugifyFilename(title)}.html`, buildHtmlDocument(title, html, css))
}

export function projectHasContent(project) {
  return Boolean(project?.html?.trim() || Object.keys(project?.projectData || {}).length > 0)
}
