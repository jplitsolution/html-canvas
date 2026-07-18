import type { Editor } from 'grapesjs'
import type { Component } from 'grapesjs'
import { transformReactComponentsInHtml, encodeNonAscii } from './styleUtils'

export function insertBlock(editor: Editor, blockId: string) {
  const block = editor.BlockManager.get(blockId)
  if (!block) return

  const rawContent = block.get('content')
  const content = typeof rawContent === 'function' ? rawContent() : rawContent
  const wrapper = editor.getWrapper()
  const selected = editor.getSelected()
  const target = selected?.parent() || wrapper

  if (!content) return

  if (target && selected && selected.parent() === target) {
    target.append(content, { at: selected.index() + 1 })
  } else {
    wrapper?.append(content)
  }

  editor.select(wrapper?.components().at(-1) || undefined)
}

export function applyStarterHtml(editor: Editor, html: string, css = '') {
  // Encode non-ASCII characters (emoji ⚡ 🎨 ☰ etc.) to HTML numeric entities
  // BEFORE passing to GrapesJS. Even though we skip our own DOMParser, GrapesJS
  // internally re-parses the HTML string and can default to Latin-1, corrupting
  // multi-byte chars (showing âšœ â¡ etc.). Entity-encoding keeps them ASCII-safe
  // so they survive the internal parse and still render correctly in the canvas.
  const safeHtml = encodeNonAscii(html)
  editor.setStyle(css) // Always apply CSS to ensure old styles are cleared when starting from scratch
  editor.setComponents(safeHtml)
  editor.UndoManager.clear()
}



export function getComponentKind(component: Component | null): string {
  if (!component) return 'none'

  const tag = (component.get('tagName') || '').toLowerCase()
  const type = component.get('type') || ''
  const attrs = component.getAttributes?.() || {}
  const tcType = attrs['data-tc-type']

  if (tcType) return tcType
  if (type === 'image' || tag === 'img') return 'image'
  if (type === 'link' || tag === 'a') return 'button'
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span'].includes(tag) || type === 'text') return 'text'
  if (['section', 'header', 'footer', 'nav', 'main'].includes(tag)) return 'section'
  if (tag === 'button') return 'button'
  if (tag === 'form') return 'form'

  return 'generic'
}

export function getStyleProp(component: Component | null | undefined, prop: string): string {
  if (!component || typeof component.getStyle !== 'function') return ''
  const style = (component.getStyle() || {}) as Record<string, unknown>
  const val = style[prop]
  if (typeof val === 'string') return val
  if (val !== null && val !== undefined && typeof val !== 'object') return String(val)
  return ''
}

export function setStyleProp(component: Component, prop: string, value: string) {
  const style = { ...(component.getStyle() as Record<string, string>), [prop]: value }
  component.setStyle(style)
}
