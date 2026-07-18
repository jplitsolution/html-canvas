import type { Editor } from 'grapesjs'

interface PageExport {
  id: string
  name: string
  filename: string
  html: string
  css: string
}

function cleanLocalhostUrls(str: string): string {
  if (!str) return ''
  return str.replace(/http:\/\/localhost:\d+/g, '')
}

function stripWrapperIdFromCss(css: string): string {
  if (!css) return ''
  return css.replace(/#wrapper\s*{[^}]*}/g, '')
}

function slugifyFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getActivePageSnapshot(editor: Editor): { html: string; css: string } {
  const selected = editor.Pages.getSelected()
  const main = selected?.getMainComponent() || editor.getWrapper()
  if (!main) return { html: '', css: '' }

  const rawHtml = editor.getHtml({ component: main })
  const rawCss = editor.getCss({ component: main, avoidProtected: true }) || ''
  const css = stripWrapperIdFromCss(rawCss)

  const styleObj = (main.getStyle?.() || {}) as Record<string, string>
  const wrapperStyle = Object.entries(styleObj)
    .filter(([_, v]) => v !== null && v !== undefined && String(v).trim().length > 0)
    .map(([k, v]) => `${k}:${v}`)
    .join('; ')

  const inlinedHtml = `<div class="page-wrapper" style="min-height: 100vh; width: 100%; position: relative; ${wrapperStyle}">${rawHtml}</div>`

  return {
    html: cleanLocalhostUrls(inlinedHtml),
    css: cleanLocalhostUrls(css),
  }
}

export function pageExportFilename(name: string, id: string, isHome: boolean): string {
  if (isHome) return 'index.html'
  return `${slugifyFilename(name || id)}.html`
}

export function collectPageExports(editor: Editor): PageExport[] {
  const pages = editor.Pages.getAll()

  return pages.map((page, index) => {
    const main = page.getMainComponent()
    const pageId = String(page.getId())
    const pageName = String(page.get('name') || pageId)
    const isHome = index === 0 || pageId === 'home' || pageName.toLowerCase() === 'home'

    if (!main) {
      return { id: pageId, name: pageName, filename: pageExportFilename(pageName, pageId, isHome), html: '', css: '' }
    }

    const rawHtml = editor.getHtml({ component: main })
    const rawCss = editor.getCss({ component: main, avoidProtected: true }) || ''
    const css = stripWrapperIdFromCss(rawCss)

    const styleObj = (main.getStyle?.() || {}) as Record<string, string>
    const wrapperStyle = Object.entries(styleObj)
      .filter(([_, v]) => v !== null && v !== undefined && String(v).trim().length > 0)
      .map(([k, v]) => `${k}:${v}`)
      .join('; ')

    const inlinedHtml = `<div class="page-wrapper" style="min-height: 100vh; width: 100%; position: relative; ${wrapperStyle}">${rawHtml}</div>`

    return {
      id: pageId,
      name: pageName,
      filename: pageExportFilename(pageName, pageId, isHome),
      html: cleanLocalhostUrls(inlinedHtml),
      css: cleanLocalhostUrls(css),
    }
  })
}

function buildHtmlDocument(title: string, bodyHtml: string, css: string, allPages: PageExport[], currentFilename: string): string {
  // Simple link replacement if multiple pages (this part is kept minimal)
  let finalHtml = bodyHtml
  allPages.forEach((p) => {
    const rx = new RegExp(`href=["'](page:${p.id}|${p.id})["']`, 'g')
    finalHtml = finalHtml.replace(rx, `href="${p.filename}"`)
  })
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: sans-serif; }
    * { box-sizing: border-box; }
    ${css}
  </style>
</head>
<body>
  ${finalHtml}
</body>
</html>`
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadTextFile(filename: string, content: string, mime = 'text/html') {
  downloadBlob(filename, new Blob([content], { type: mime }))
}

// Basic JS Zip Implementation for exportAll
function createZipBlob(files: {name: string, content: string}[]): Blob {
  // In a real app we'd use jszip. This is a placeholder since the original didn't include jszip source.
  console.warn('Zip export requires jszip. Falling back to single file exports for now.')
  files.forEach(f => downloadTextFile(f.name, f.content))
  return new Blob(['Please include JSZip for proper zip export'], {type: 'text/plain'})
}

export function exportCurrentPageFromEditor(editor: Editor, siteTitle: string) {
  const selected = editor.Pages.getSelected()
  const main = selected?.getMainComponent() || editor.getWrapper()
  if (!main) return

  const pageName = String(selected?.get('name') || 'page')
  const { html, css } = getActivePageSnapshot(editor)
  const pages = collectPageExports(editor)
  const isHome = selected?.getId() === 'home' || pageName.toLowerCase() === 'home'
  const filename = pageExportFilename(pageName, String(selected?.getId()), isHome)

  const doc = buildHtmlDocument(`${siteTitle} — ${pageName}`, html, css, pages, filename)
  const base = slugifyFilename(siteTitle)
  const suffix = pageName.toLowerCase() === 'home' ? '' : `-${slugifyFilename(pageName)}`
  downloadTextFile(`${base}${suffix || ''}.html`, doc)
}

export function exportAllPagesFromEditor(editor: Editor, siteTitle: string) {
  const pages = collectPageExports(editor).filter((p) => p.html.trim())
  if (pages.length === 0) return

  const base = slugifyFilename(siteTitle)

  if (pages.length === 1) {
    const page = pages[0]
    downloadTextFile(`${base}.html`, buildHtmlDocument(siteTitle, page.html, page.css, pages, page.filename))
    return
  }

  const files = pages.map((page) => ({
    name: page.filename,
    content: buildHtmlDocument(`${siteTitle} — ${page.name}`, page.html, page.css, pages, page.filename),
  }))

  createZipBlob(files) // Fallback to multiple downloads if zip is not available
}
