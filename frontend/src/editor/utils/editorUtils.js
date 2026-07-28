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
