import type { Editor } from 'grapesjs'
import { DEFAULT_PAGES } from '../templates/starterTemplates'

export function setupPagesManager(editor: Editor) {
  const pages = editor.Pages

  if (pages.getAll().length <= 1) {
    const existing = pages.getAll()[0]
    if (existing) {
      existing.set('name', 'Home')
      existing.set('id', 'home')
    }

    DEFAULT_PAGES.slice(1).forEach((page) => {
      pages.add({
        id: page.id,
        name: page.name,
        component: `<section data-tc-type="section" style="padding:80px 32px;text-align:center;font-family:Inter,sans-serif;min-height:400px;"><h1 data-gjs-type="text" style="font-size:36px;font-weight:700;color:#0f172a;margin:0 0 12px;">${page.name}</h1><p data-gjs-type="text" style="color:#64748b;font-size:16px;">Start building your ${page.name.toLowerCase()} page.</p></section>`,
      })
    })
  }

  pages.select('home')
}

export function getPagesList(editor: Editor) {
  return pagesToArray(editor)
}

export function selectPage(editor: Editor, pageId: string) {
  editor.Pages.select(pageId)
}

export function addPage(editor: Editor, name: string) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `page-${Date.now()}`
  editor.Pages.add({
    id,
    name,
    component: `<section data-tc-type="section" style="padding:80px 32px;text-align:center;font-family:Inter,sans-serif;min-height:400px;"><h1 data-gjs-type="text" style="font-size:36px;font-weight:700;color:#0f172a;">${name}</h1></section>`,
  })
  editor.Pages.select(id)
  return id
}

function pagesToArray(editor: Editor) {
  return editor.Pages.getAll().map((p) => ({
    id: p.get('id') as string,
    name: p.get('name') as string,
  }))
}
