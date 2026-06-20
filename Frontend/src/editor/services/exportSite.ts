import type { Editor } from 'grapesjs'
import { createZipBlob } from '../../utils/zip'

export interface PageExport {
  id: string
  name: string
  filename: string
  html: string
  css: string
}

export function slugifyFilename(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'page'
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildHtmlDocument(title: string, bodyHtml: string, css: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>${bodyHtml}</body>
</html>`
}

const ANCHOR_SCROLL_SCRIPT = `(function(){
  function scrollToHash(hash){
    if(!hash||hash==='#')return;
    var id=decodeURIComponent(hash.replace(/^#/,''));
    var el=document.getElementById(id);
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  }
  document.documentElement.style.scrollBehavior='smooth';
  document.addEventListener('click',function(e){
    var a=e.target.closest('a[href^="#"]');
    if(!a)return;
    var href=a.getAttribute('href');
    if(!href||href==='#')return;
    if(document.getElementById(decodeURIComponent(href.slice(1)))){
      e.preventDefault();
      scrollToHash(href);
    }
  });
  if(location.hash)scrollToHash(location.hash);
})();`

/** Preview iframe document — same HTML/CSS as export plus in-page #anchor scrolling. */
export function buildPreviewDocument(title: string, bodyHtml: string, css: string): string {
  if (!bodyHtml?.trim()) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#64748b;"><p>No content yet. Add blocks in the editor.</p></body></html>`
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${css}
html { scroll-behavior: smooth; }
  </style>
</head>
<body>${bodyHtml}
<script>${ANCHOR_SCROLL_SCRIPT}</script>
</body>
</html>`
}

export function getActivePageSnapshot(editor: Editor): { html: string; css: string } {
  const selected = editor.Pages.getSelected()
  const main = selected?.getMainComponent() || editor.getWrapper()
  if (!main) return { html: '', css: '' }

  return {
    html: editor.getHtml({ component: main }),
    css: editor.getCss({ component: main, avoidProtected: true }) || '',
  }
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

    return {
      id: pageId,
      name: pageName,
      filename: pageExportFilename(pageName, pageId, isHome),
      html: editor.getHtml({ component: main }),
      css: editor.getCss({ component: main, avoidProtected: true }) || '',
    }
  })
}

export function exportCurrentPageFromEditor(editor: Editor, siteTitle: string) {
  const selected = editor.Pages.getSelected()
  const main = selected?.getMainComponent() || editor.getWrapper()
  if (!main) return

  const pageName = String(selected?.get('name') || 'page')
  const { html, css } = getActivePageSnapshot(editor)
  const doc = buildHtmlDocument(`${siteTitle} — ${pageName}`, html, css)
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
    downloadTextFile(`${base}.html`, buildHtmlDocument(siteTitle, page.html, page.css))
    return
  }

  const files = pages.map((page) => ({
    name: page.filename,
    content: buildHtmlDocument(`${siteTitle} — ${page.name}`, page.html, page.css),
  }))

  downloadBlob(`${base}-site.zip`, createZipBlob(files))
}
