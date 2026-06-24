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
/* ── Global overflow prevention ──────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box !important;
}
html, body {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
  scroll-behavior: smooth !important;
}
img, video, iframe, embed, object {
  max-width: 100% !important;
  height: auto !important;
}

/* ── Mobile breakpoint (≤ 767px) ─────────────────────────────── */
@media (max-width: 767px) {
  /* Overflow guard for every structural element */
  header, nav, section, footer, div, main, article, aside, figure {
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  /* Hamburger button — show on mobile */
  .tc-nav-hamburger {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    font-size: 24px !important;
    user-select: none !important;
    color: #0f172a !important;
    padding: 4px !important;
    z-index: 100 !important;
  }

  /* Header: flex-wrap so logo + hamburger sit on one row */
  header, [data-tc-type="section"] > header {
    position: relative !important;
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 12px 16px !important;
    gap: 0 !important;
  }

  /* Desktop nav — hidden until hamburger toggled.
     Use maximum specificity to override GrapesJS inline style="display:flex" */
  header nav,
  header > nav,
  header nav[style],
  header > nav[style] {
    display: none !important;
    flex-direction: column !important;
    width: 100% !important;
    order: 3 !important;
    background: #ffffff !important;
    padding: 12px 16px !important;
    border-top: 1px solid #e2e8f0 !important;
    gap: 8px !important;
    align-items: stretch !important;
  }
  header nav a,
  header > nav a {
    width: 100% !important;
    text-align: center !important;
    padding: 10px 16px !important;
    display: block !important;
    white-space: normal !important;
    word-break: break-word !important;
  }

  /* CSS-checkbox hamburger toggle — works with any unique id via class */
  .tc-nav-toggle:checked ~ nav,
  .tc-nav-toggle:checked ~ nav[style] {
    display: flex !important;
  }

  /* Sections — comfortable mobile padding, prevent side overflow */
  [data-tc-type="section"],
  section, footer {
    padding: 32px 16px !important;
    width: 100% !important;
  }

  /* Flex rows → vertical stacks on mobile */
  section > div[style*="display:flex"],
  section > div[style*="display: flex"],
  header + section > div[style*="flex"] {
    flex-direction: column !important;
    align-items: stretch !important;
  }

  /* Flex children: take full width */
  section > div > div[style*="flex:1"],
  section > div > div[style*="flex: 1"] {
    min-width: 0 !important;
    width: 100% !important;
  }

  /* Hero columns: stack image below text */
  section[style*="display:flex"],
  section[style*="display: flex"] {
    flex-direction: column !important;
    gap: 24px !important;
  }

  /* Pricing cards: full width */
  section div[style*="min-width:260px"],
  section div[style*="min-width: 260px"],
  section div[style*="min-width:240px"],
  section div[style*="min-width: 240px"] {
    min-width: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  /* CTA buttons: block + no overflow */
  a[data-tc-type="button"],
  a[style*="padding:14px"],
  a[style*="padding: 14px"] {
    display: block !important;
    width: 100% !important;
    text-align: center !important;
    box-sizing: border-box !important;
    white-space: normal !important;
    word-break: break-word !important;
  }

  /* Grid columns: single column on mobile */
  div[style*="grid-template-columns:repeat(auto-fit"],
  div[style*="grid-template-columns: repeat(auto-fit"] {
    grid-template-columns: 1fr !important;
  }

  /* Typography scale down */
  h1 { font-size: clamp(24px, 8vw, 32px) !important; }
  h2 { font-size: clamp(20px, 6vw, 26px) !important; }
}

/* ── Tablet breakpoint (768px – 1023px) ──────────────────────── */
@media (min-width: 768px) and (max-width: 1023px) {
  header, [data-tc-type="section"] > header {
    padding: 16px 20px !important;
  }
  header nav {
    gap: 16px !important;
  }
  section {
    padding: 48px 24px !important;
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
