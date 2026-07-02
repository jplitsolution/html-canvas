import type { Component, Editor } from 'grapesjs'
import { walkComponents } from './textContent'

const RANDOM_GJS_ID = /^i[a-z0-9]+$/i

export const ANCHOR_PRESETS = ['features', 'pricing', 'contact', 'faq', 'about', 'services'] as const

const SECTION_TAGS = new Set(['section', 'header', 'footer', 'nav', 'main', 'article'])

export function normalizeAnchorId(value: string): string {
  return value
    .trim()
    .replace(/^#/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
}

/** User-facing anchor id for nav links (#contact). Hides GrapesJS auto ids like i9ppd. */
export function getSectionAnchorId(component: Component): string {
  const attrId = component.getAttributes()?.id
  if (typeof attrId === 'string' && attrId.trim() && !RANDOM_GJS_ID.test(attrId)) {
    return attrId
  }
  return ''
}

function findPageRoot(editor: Editor, component: Component): Component | null {
  for (const page of editor.Pages.getAll()) {
    const root = page.getMainComponent()
    if (!root) continue
    let onPage = false
    walkComponents(root, (cmp) => {
      if (cmp === component) onPage = true
    })
    if (onPage) return root
  }
  return null
}

function findAnchorConflict(editor: Editor, anchorId: string, exclude: Component): Component | null {
  let conflict: Component | null = null
  for (const page of editor.Pages.getAll()) {
    const root = page.getMainComponent()
    if (!root) continue
    walkComponents(root, (cmp) => {
      if (cmp === exclude || conflict) return
      if (cmp.getAttributes()?.id === anchorId) conflict = cmp
    })
  }
  return conflict
}

export function setSectionAnchorId(
  editor: Editor,
  component: Component,
  rawValue: string
): { ok: boolean; error?: string } {
  const oldId = component.getAttributes()?.id || component.getId()
  const anchorId = normalizeAnchorId(rawValue)

  if (!anchorId) {
    component.removeAttributes('id')
    component.resetId()
    component.set('sectionId', '')
    return { ok: true }
  }

  const conflict = findAnchorConflict(editor, anchorId, component)
  if (conflict) {
    const samePage = findPageRoot(editor, component) === findPageRoot(editor, conflict)
    if (samePage) {
      return {
        ok: false,
        error: `Another section on this page already uses "${anchorId}". Pick a different name.`,
      }
    }
    conflict.removeAttributes('id')
    conflict.resetId()
    conflict.set('sectionId', '')
  }

  component.setId(anchorId)
  component.set('sectionId', anchorId)

  // Rename intersecting nav links pointing to the renamed section
  const root = editor.getWrapper()
  if (root && oldId && oldId !== anchorId) {
    const walk = (cmp: any) => {
      const href = cmp.getAttributes()?.href
      if (href === `#${oldId}`) {
        cmp.addAttributes({ href: `#${anchorId}` })
      }
      cmp.components().forEach(walk)
    }
    walk(root)
  }

  return { ok: true }
}

export function listSectionAnchorsOnPage(editor: Editor, component?: Component | null): string[] {
  const root = component ? findPageRoot(editor, component) : editor.getWrapper()
  if (!root) return []

  const ids: string[] = []
  walkComponents(root, (cmp) => {
    if (cmp === root) return
    const tag = (cmp.get('tagName') || '').toLowerCase()
    if (!SECTION_TAGS.has(tag)) return
    const id = getSectionAnchorId(cmp)
    if (id) ids.push(id)
  })

  return [...new Set(ids)]
}
