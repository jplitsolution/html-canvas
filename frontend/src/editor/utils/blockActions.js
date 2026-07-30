import { transformReactComponentsInHtml, encodeNonAscii } from './styleUtils'

export function insertBlock(editor, blockId) {
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

export function applyStarterHtml(editor, html, css = '') {
  const safeHtml = encodeNonAscii(html)
  editor.setStyle(css)
  editor.setComponents(safeHtml)
  editor.UndoManager.clear()
}

export function getComponentKind(component) {
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

export function getStyleProp(component, prop) {
  if (!component || typeof component.getStyle !== 'function') return ''
  const style = component.getStyle() || {}
  const val = style[prop]
  if (typeof val === 'string') return val
  if (val !== null && val !== undefined && typeof val !== 'object') return String(val)
  return ''
}

export function setStyleProp(component, prop, value) {
  const style = { ...component.getStyle(), [prop]: value }
  component.setStyle(style)
}
