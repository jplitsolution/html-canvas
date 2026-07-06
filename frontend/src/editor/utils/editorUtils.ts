import type { Component, Editor } from 'grapesjs'

/** Safely read the wrapper — GrapesJS internals may be torn down after destroy(). */
export function safeGetWrapper(editor: Editor | null | undefined): Component | null {
  if (!editor || typeof editor.getWrapper !== 'function') return null
  try {
    return editor.getWrapper() ?? null
  } catch {
    return null
  }
}

export function isEditorAlive(editor: Editor | null | undefined): boolean {
  return safeGetWrapper(editor) != null
}
