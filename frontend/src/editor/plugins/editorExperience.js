function isTypingInFormField(target) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return !!target.closest('input, textarea, select, [contenteditable="true"]')
}

/** Check if editor is in editing mode safely */
function isKeyboardBlocked(editor, target) {
  const isEditing = typeof editor.isEditing === 'function' ? editor.isEditing() : false;
  
  const isInputFocused = typeof editor.Canvas?.isInputFocused === 'function' 
    ? editor.Canvas.isInputFocused() 
    : false;
  
  return isEditing || isInputFocused || isTypingInFormField(target);
}

export function setupEditorExperience(
  editor,
  handlers
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
    // Rely on GrapesJS default keymaps
  })

  const onKeyDown = (e) => {
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
