/** Safely read the wrapper — GrapesJS internals may be torn down after destroy(). */
export function safeGetWrapper(editor) {
  if (!editor || typeof editor.getWrapper !== 'function') return null
  try {
    return editor.getWrapper() ?? null
  } catch {
    return null
  }
}

export function isEditorAlive(editor) {
  return safeGetWrapper(editor) != null
}

/** Safely extract a GrapesJS Component instance from a component or event payload object. */
export function getComp(component) {
  if (!component) return null
  if (typeof component.get === 'function') return component
  if (component.target && (typeof component.target.get === 'function' || typeof component.target.getAttributes === 'function')) return component.target
  if (component.model && (typeof component.model.get === 'function' || typeof component.model.getAttributes === 'function')) return component.model
  if (component.component && (typeof component.component.get === 'function' || typeof component.component.getAttributes === 'function')) return component.component
  if (typeof component.getAttributes === 'function' || typeof component.getStyle === 'function' || typeof component.getEl === 'function') return component
  return null
}

