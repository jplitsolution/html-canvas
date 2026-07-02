import type { Editor } from 'grapesjs'
import type { Component } from 'grapesjs'
import { transformReactComponentsInHtml } from './styleUtils'

export function insertBlock(editor: Editor, blockId: string) {
  const block = editor.BlockManager.get(blockId)
  if (!block) return

  const content = block.get('content')
  const wrapper = editor.getWrapper()
  const selected = editor.getSelected()
  const target = selected?.parent() || wrapper

  if (target && selected && selected.parent() === target) {
    target.append(content, { at: selected.index() + 1 })
  } else {
    wrapper?.append(content)
  }

  editor.select(wrapper?.components().at(-1) || undefined)
}

export function applyStarterHtml(editor: Editor, html: string, css = '') {
  if (css) editor.setStyle(css)
  const compiledHtml = transformReactComponentsInHtml(html)
  editor.setComponents(compiledHtml)
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

export function getStyleProp(component: Component, prop: string): string {
  const style = component.getStyle() as Record<string, string>
  return style[prop] || ''
}

export function setStyleProp(component: Component, prop: string, value: string) {
  const style = { ...(component.getStyle() as Record<string, string>), [prop]: value }
  component.setStyle(style)
}
