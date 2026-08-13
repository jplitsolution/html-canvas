import { encodeNonAscii } from './styleUtils'
import { applyTextSizeAlignment, healFlowButtonsInEditor } from './textSizeAlign'
import { ensureAllTextEditable } from './textContent'

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
  // Defer so component:add handlers finish first, then wire text/CTAs for editing
  setTimeout(() => {
    try {
      ensureAllTextEditable(editor)
      healFlowButtonsInEditor(editor)
      editor.Canvas?.refresh?.()
    } catch (_) {
      /* best-effort */
    }
  }, 80)
}

/** Apply a starter layout. Packs-on-Home also opts the campaign into Checks before Home. */
export async function applyStarterTemplate(
  editor,
  template,
  { campaignId, updateCampaign } = {},
) {
  if (!editor || !template) return
  applyStarterHtml(editor, template.html, template.css)
  if (
    template.id === 'home-packs' &&
    campaignId &&
    typeof updateCampaign === 'function'
  ) {
    try {
      await updateCampaign(campaignId, { funnelLayout: 'packs_on_home' })
    } catch {
      /* toast in campaign slice */
    }
  }
}

export function getComponentKind(component) {
  if (!component) return 'none'

  const tag = (component.get('tagName') || '').toLowerCase()
  const type = component.get('type') || ''
  const attrs = component.getAttributes?.() || {}
  const tcType = attrs['data-tc-type']
  const action = String(attrs['data-action'] || '').toUpperCase()

  // Explicit canvas types first (hotspot / button / image / section)
  if (tcType === 'hotspot') return 'hotspot'
  if (tcType === 'button') return 'button'
  if (tcType === 'image') return 'image'
  if (tcType === 'section') return 'section'
  if (tcType && tcType !== 'text') return tcType

  if (type === 'image' || tag === 'img') return 'image'

  // Flow CTAs often get Grapes type "text" for label editing — still treat as buttons
  // so the "When clicked" action dropdown stays available.
  if (
    tag === 'button' ||
    type === 'link' ||
    tag === 'a' ||
    action === 'SUBSCRIBE' ||
    action === 'SUBSCRIBE_ROUTE' ||
    action === 'CONFIRM' ||
    action === 'CHAIN' ||
    attrs['data-actions'] ||
    attrs['data-otp-action']
  ) {
    return 'button'
  }

  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span'].includes(tag) || type === 'text') return 'text'
  if (['section', 'header', 'footer', 'nav', 'main'].includes(tag)) return 'section'
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
  if (prop === 'width' || prop === 'height') {
    applyTextSizeAlignment(component)
  }
}
