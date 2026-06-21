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

export function minifyCss(css: string): string {
  if (!css) return ''
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{\}:;])\s*/g, '$1')
    .trim()
}

export function optimizePageContent(
  html: string,
  css: string,
  pages: PageExport[],
  activePageFilename: string,
  isPreview = false
): { optimizedHtml: string; optimizedCss: string } {
  if (!html?.trim()) {
    return { optimizedHtml: '', optimizedCss: '' }
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const refMap = new Map<string, string>()
  pages.forEach((p) => {
    const pageId = String(p.id).toLowerCase()
    refMap.set(pageId, p.filename)
    refMap.set(`#${pageId}`, p.filename)
    refMap.set(`#page-${pageId}`, p.filename)

    const nameSlug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    refMap.set(nameSlug, p.filename)
    refMap.set(`#${nameSlug}`, p.filename)
    refMap.set(p.name.toLowerCase(), p.filename)
  })

  // Rewrite links
  const links = doc.querySelectorAll('a')
  links.forEach((link) => {
    const href = link.getAttribute('href')
    if (!href) return

    const cleanHref = href.trim()
    let pagePart = cleanHref
    let sectionPart = ''
    const hashIndex = cleanHref.indexOf('#')

    if (hashIndex > -1) {
      pagePart = cleanHref.substring(0, hashIndex)
      sectionPart = cleanHref.substring(hashIndex + 1)
    }

    const pagePartNoSlash = pagePart.replace(/^\/|\/$/g, '')
    const lowerPagePart = pagePartNoSlash.toLowerCase()
    const lowerSectionPart = sectionPart.toLowerCase()

    if (pagePartNoSlash && !sectionPart) {
      // e.g. href="/contact" or href="contact"
      if (doc.getElementById(pagePartNoSlash) || doc.querySelector(`[id="${pagePartNoSlash}" i]`)) {
        const foundEl = doc.getElementById(pagePartNoSlash) || doc.querySelector(`[id="${pagePartNoSlash}" i]`)
        const actualId = foundEl ? foundEl.getAttribute('id') || pagePartNoSlash : pagePartNoSlash
        link.setAttribute('href', `#${actualId}`)
      } else if (refMap.has(lowerPagePart)) {
        const targetFilename = refMap.get(lowerPagePart)!
        link.setAttribute('href', targetFilename)
      }
    } else if (pagePartNoSlash && sectionPart) {
      // e.g. href="/contact#section" or href="contact#section"
      if (refMap.has(lowerPagePart)) {
        const targetFilename = refMap.get(lowerPagePart)!
        link.setAttribute('href', `${targetFilename}#${sectionPart}`)
      }
    } else if (!pagePartNoSlash && sectionPart) {
      // e.g. href="#contact"
      if (doc.getElementById(sectionPart) || doc.querySelector(`[id="${sectionPart}" i]`)) {
        const foundEl = doc.getElementById(sectionPart) || doc.querySelector(`[id="${sectionPart}" i]`)
        const actualId = foundEl ? foundEl.getAttribute('id') || sectionPart : sectionPart
        link.setAttribute('href', `#${actualId}`)
      } else if (refMap.has(lowerSectionPart)) {
        const targetFilename = refMap.get(lowerSectionPart)!
        link.setAttribute('href', targetFilename)
      }
    }
  })

  // Validate images and lazy load
  const images = doc.querySelectorAll('img')
  images.forEach((img) => {
    img.setAttribute('loading', 'lazy')
    const src = img.getAttribute('src')
    if (!src || src.trim() === '' || src === '#') {
      img.setAttribute('src', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800')
    }
  })

  const optimizedCss = minifyCss(css)

  return {
    optimizedHtml: doc.body.innerHTML,
    optimizedCss,
  }
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
    var a=e.target.closest('a');
    if(!a)return;
    var href=a.getAttribute('href');
    if(!href)return;
    if(href.endsWith('.html')){
      if(window.self !== window.top){
        e.preventDefault();
        window.parent.postMessage({ type: 'NAVIGATE_TO_PAGE', filename: href }, '*');
        return;
      }
    }
    if(href.startsWith('#') && href !== '#'){
      if(document.getElementById(decodeURIComponent(href.slice(1)))){
        e.preventDefault();
        scrollToHash(href);
      }
    }
  });
  if(location.hash)scrollToHash(location.hash);
})();`

export const RESPONSIVE_STYLE_RULES = `
/* Responsive adjustments */
img {
  max-width: 100%;
  height: auto;
}
html, body {
  max-width: 100% !important;
  overflow-x: hidden !important;
  scroll-behavior: smooth;
}

/* Tablet adjustments */
@media (min-width: 768px) and (max-width: 1023px) {
  header, [data-tc-type="section"] > header {
    padding: 16px 20px !important;
  }
  header nav, [data-tc-type="section"] > header nav {
    gap: 16px !important;
  }
}

/* Navbar responsive CSS-checkbox hack */
@media (max-width: 767px) {
  .tc-nav-hamburger {
    display: block !important;
  }
  header {
    position: relative !important;
    flex-wrap: wrap !important;
  }
  header nav {
    display: none !important;
    flex-direction: column !important;
    width: 100% !important;
    position: absolute !important;
    top: 100% !important;
    left: 0 !important;
    background: #ffffff !important;
    padding: 16px 32px !important;
    border-bottom: 1px solid #e2e8f0 !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
    z-index: 9999 !important;
    gap: 16px !important;
    align-items: stretch !important;
  }
  header nav a {
    width: 100% !important;
    text-align: center !important;
  }
  .tc-nav-toggle:checked ~ nav {
    display: flex !important;
  }
  
  /* Reduce excessive paddings on mobile */
  [data-tc-type="section"],
  section,
  footer {
    padding: 32px 16px !important;
  }
}
`;

export function renderPageDocument(
  title: string,
  html: string,
  css: string,
  pages: PageExport[],
  activePageFilename: string,
  isPreview = false
): string {
  const { optimizedHtml, optimizedCss } = optimizePageContent(html, css, pages, activePageFilename, isPreview)
  const scrollBehavior = `html { scroll-behavior: smooth; }`
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${optimizedCss}
${scrollBehavior}
${RESPONSIVE_STYLE_RULES}</style>
</head>
<body>${optimizedHtml}
<script>${ANCHOR_SCROLL_SCRIPT}</script>
</body>
</html>`
}

export function buildHtmlDocument(
  title: string,
  bodyHtml: string,
  css: string,
  pages: PageExport[] = [],
  filename = 'index.html'
): string {
  return renderPageDocument(title, bodyHtml, css, pages, filename, false)
}

/** Preview iframe document — same HTML/CSS as export plus in-page #anchor scrolling. */
export function buildPreviewDocument(
  title: string,
  bodyHtml: string,
  css: string,
  pages: PageExport[] = []
): string {
  if (!bodyHtml?.trim()) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#64748b;"><p>No content yet. Add blocks in the editor.</p></body></html>`
  }
  return renderPageDocument(title, bodyHtml, css, pages, 'index.html', true)
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

  downloadBlob(`${base}-site.zip`, createZipBlob(files))
}
