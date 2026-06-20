import type { Editor } from 'grapesjs'
import type { Component } from 'grapesjs'

/** Mount GrapesJS StyleManager + TraitManager into React property panel hosts */
export function mountAdvancedPanels(editor: Editor, component: Component | null) {
  const styleHost = document.getElementById('tc-advanced-styles')
  const traitHost = document.getElementById('tc-advanced-traits')

  if (styleHost) {
    styleHost.innerHTML = ''
    const styleEl = editor.StyleManager.render()
    if (styleEl) styleHost.appendChild(styleEl)
  }

  if (traitHost) {
    traitHost.innerHTML = ''
    const traitEl = editor.TraitManager.render()
    if (traitEl) traitHost.appendChild(traitEl)
  }

  if (component && component.get('type') !== 'wrapper') {
    editor.StyleManager.select(component)
    editor.TraitManager.select(component)
  }
}

/** Ensure selected components expose all style properties in StyleManager */
export function ensureComponentStylable(component: Component) {
  if (component.get('type') === 'wrapper') return
  component.set({
    stylable: true,
    unstylable: [],
  })
}
