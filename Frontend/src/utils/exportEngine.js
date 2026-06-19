import { generateHTML } from './htmlGenerator'
import { getBlockHTMLGenerator } from '../registry/index'
import { getRootBlocks } from './blockUtils'

export async function generateExport(project, options = {}) {
  const { format = 'html', minify = false, inlineAssets = true, includeStyles = true } = options
  const layout = project.layout || []
  const title = project.title || 'export'

  switch (format) {
    case 'html':
      return exportHTML(layout, title, { minify, includeStyles })
    case 'json':
      return exportJSON(project)
    case 'react':
      return exportReact(layout, title)
    case 'zip':
      return exportZIP(project, { minify, inlineAssets })
    case 'template':
      return exportTemplatePackage(project)
    default:
      return exportHTML(layout, title, { minify, includeStyles })
  }
}

async function exportHTML(layout, title, { minify }) {
  let html = generateHTML(layout, title, 'desktop')
  if (minify) {
    html = html.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim()
  }
  return { content: html, filename: `${sanitize(title)}.html`, mimeType: 'text/html;charset=utf-8' }
}

function exportJSON(project) {
  const content = JSON.stringify(project, null, 2)
  return { content, filename: `${sanitize(project.title)}.json`, mimeType: 'application/json' }
}

function exportReact(layout, title) {
  const roots = getRootBlocks(layout).filter((b) => !b.content?.hidden)
  const components = roots.map((b) => {
    const gen = getBlockHTMLGenerator(b.type)
    const jsx = gen ? gen(b, '') : `<div>${b.type}</div>`
    return `function ${capitalize(b.type)}Block() {\n  return (\n    ${jsx}\n  )\n}`
  }).join('\n\n')

  const content = `import React from 'react'\n\n${components}\n\nexport default function ${sanitize(title)}Page() {\n  return (\n    <div>\n      ${roots.map((b) => `<${capitalize(b.type)}Block />`).join('\n      ')}\n    </div>\n  )\n}`
  return { content, filename: `${sanitize(title)}.jsx`, mimeType: 'text/javascript' }
}

async function exportZIP(project, options) {
  const html = await exportHTML(project.layout, project.title, options)
  const json = exportJSON(project)
  const manifest = JSON.stringify({ name: project.title, version: project.version, exportedAt: new Date().toISOString() }, null, 2)

  const content = JSON.stringify({
    type: 'templatecraft-package',
    manifest,
    html: html.content,
    project: json.content,
  }, null, 2)

  return { content, filename: `${sanitize(project.title)}.zip.json`, mimeType: 'application/json' }
}

function exportTemplatePackage(project) {
  const content = JSON.stringify({
    type: 'templatecraft-template',
    version: 1,
    name: project.title,
    layout: project.layout,
    metadata: project.metadata,
    exportedAt: new Date().toISOString(),
  }, null, 2)
  return { content, filename: `${sanitize(project.title)}-template.json`, mimeType: 'application/json' }
}

export function downloadExport(result) {
  const blob = new Blob([result.content], { type: result.mimeType || 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = result.filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 200)
}

function sanitize(str) {
  return (str || 'export').replace(/[^a-z0-9]/gi, '_').toLowerCase()
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
