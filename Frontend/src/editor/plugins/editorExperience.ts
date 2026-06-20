import type { Editor } from 'grapesjs'

function isTypingInFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return !!target.closest('input, textarea, select, [contenteditable="true"]')
}

/** Match GrapesJS keymap guard — skip shortcuts while inline text edit or panel inputs are active */
function isKeyboardBlocked(editor: Editor, target: EventTarget | null): boolean {
  return editor.isEditing() || editor.Canvas.isInputFocused() || isTypingInFormField(target)
}

export function setupEditorExperience(
  editor: Editor,
  handlers: {
    onSave: () => Promise<void>
    onDuplicate?: () => void
    onDelete?: () => void
  }
) {
  const cm = editor.Commands

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
    }
  })

  editor.on('component:dblclick', (component) => {
    const tag = (component.get('tagName') || '').toLowerCase()
    if (tag === 'img') {
      editor.runCommand('open-assets', { target: component })
    }
  })

  editor.on('load', () => {
    // Backspace is for editing text — only Delete removes the selected block
    editor.Keymaps.remove('core:component-delete')
    editor.Keymaps.add('core:component-delete', 'delete', 'core:component-delete', { prevent: true })
  })

  const onKeyDown = (e: KeyboardEvent) => {
    if (isKeyboardBlocked(editor, e.target)) return

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

  window.addEventListener('keydown', onKeyDown)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
  }
}
