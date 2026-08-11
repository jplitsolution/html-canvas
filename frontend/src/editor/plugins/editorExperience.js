function isTypingInFormField(target) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return !!target.closest('input, textarea, select, [contenteditable="true"]')
}

/** True when focus is in a host UI field (PropertyPanel, etc.) or canvas RTE. */
function isTypingAnywhere(editor, target) {
  if (isTypingInFormField(target)) return true
  if (isTypingInFormField(document.activeElement)) return true
  try {
    if (typeof editor?.Canvas?.isInputFocused === 'function' && editor.Canvas.isInputFocused()) {
      return true
    }
  } catch (_) {
    /* noop */
  }
  try {
    if (typeof editor?.isEditing === 'function' && editor.isEditing()) return true
  } catch (_) {
    /* noop */
  }
  return false
}

/**
 * GrapesJS Keymaps / canvas Space-to-pan only check Canvas.isInputFocused(),
 * which misses React inputs outside the iframe (PropertyPanel textarea).
 * Extend that check so Space / Delete / shortcuts never steal host form typing.
 */
function patchCanvasInputFocus(editor) {
  const canvas = editor?.Canvas
  if (!canvas || typeof canvas.isInputFocused !== 'function') return () => {}
  if (canvas._tcInputFocusPatched) return () => {}

  const original = canvas.isInputFocused.bind(canvas)
  canvas.isInputFocused = () => {
    try {
      if (original()) return true
    } catch (_) {
      /* noop */
    }
    return isTypingInFormField(document.activeElement)
  }
  canvas._tcInputFocusPatched = true

  return () => {
    try {
      canvas.isInputFocused = original
      delete canvas._tcInputFocusPatched
    } catch (_) {
      /* noop */
    }
  }
}

export function setupEditorExperience(
  editor,
  handlers
) {
  const cm = editor.Commands
  const unpatchFocus = patchCanvasInputFocus(editor)

  cm.add('tc-duplicate', {
    run: () => {
      const selected = editor.getSelected()
      if (!selected) return
      const parent = selected.parent()
      if (!parent) return
      const clone = selected.clone()
      parent.append(clone, { at: selected.index() + 1 })
      editor.select(clone)
    },
  })

  cm.add('tc-delete', {
    run: () => {
      const selected = editor.getSelected()
      if (!selected || selected.get('type') === 'wrapper') return
      selected.remove()
      editor.select(undefined)
    },
  })

  cm.add('tc-image-replace', {
    run: () => {
      editor.runCommand('open-assets', {
        target: editor.getSelected(),
      })
    },
  })

  editor.on('component:selected', (component) => {
    const tag = (component.get('tagName') || '').toLowerCase()
    if (tag === 'img') {
      component.set('editable', false)
      const toolbar = component.get('toolbar') || []
      const hasReplace = toolbar.some((t) => t.command === 'tc-image-replace')
      if (!hasReplace) {
        toolbar.unshift({
          attributes: { class: 'fa fa-image', title: 'Replace Image' },
          command: 'tc-image-replace',
        })
        component.set('toolbar', toolbar)
      }
    }
  })

  editor.on('component:dblclick', (component) => {
    const tag = (component.get('tagName') || '').toLowerCase()
    if (tag === 'img') {
      editor.runCommand('open-assets', { target: component })
    }
  })

  editor.on('load', () => {
    // Rely on GrapesJS default keymaps (guarded via patched isInputFocused)
  })

  const onKeyDown = (e) => {
    // Capture phase: stop editor/global shortcuts from eating keys while typing
    // in PropertyPanel / any host form field.
    if (isTypingAnywhere(editor, e.target)) {
      // Allow native typing; block Grapes / other window listeners from acting.
      if (
        e.key === ' ' ||
        e.key === 'Spacebar' ||
        e.key === 'Backspace' ||
        e.key === 'Delete' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.stopPropagation()
      }
      return
    }

    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key === 's') {
      e.preventDefault()
      handlers.onSave()
    }
    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      editor.UndoManager.undo()
    }
    if ((mod && e.key === 'y') || (mod && e.shiftKey && e.key === 'z')) {
      e.preventDefault()
      editor.UndoManager.redo()
    }
  }

  // Capture so we run before GrapesJS / other bubble listeners.
  window.addEventListener('keydown', onKeyDown, true)

  return () => {
    window.removeEventListener('keydown', onKeyDown, true)
    unpatchFocus()
  }
}
