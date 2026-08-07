/**
 * Only heal a STUCK drag — never interrupt a live one.
 *
 * GrapesJS ends drags itself on mouseup. We only step in when, after the
 * user has released, the editor is still frozen (freezed / grabbing /
 * stopDefault without runDefault).
 */

const PRESERVE = { preserveSelected: 1 }

function walkUnfreeze(cmp, selectedId) {
  if (!cmp) return
  const status = cmp.get?.('status')
  if (status === 'freezed' || status === 'freezed-selected') {
    const id = cmp.getId?.()
    cmp.set('status', id && selectedId && id === selectedId ? 'selected' : '')
  }
  cmp.components?.()?.forEach?.((child) => walkUnfreeze(child, selectedId))
}

function isStuck(editor) {
  try {
    const ppfx = editor.getConfig?.()?.stylePrefix || 'gjs-'
    const body = editor.Canvas?.getBody?.()
    if (body?.classList?.contains(`${ppfx}is__grabbing`)) return true
    if (document.body.classList.contains(`${ppfx}is__grabbing`)) return true
    // Only leftover chrome (not an active pointer) — releaseDrag clears classes
    if (
      !editor.Commands?.isActive?.('core:component-drag') &&
      (document.body.classList.contains('tc-is-dragging') ||
        document.body.classList.contains('tc-canvas-drop-over'))
    ) {
      return true
    }
    if (editor.Commands?.isActive?.('core:component-drag')) return true
    const st = editor.getSelected?.()?.get?.('status')
    if (st === 'freezed' || st === 'freezed-selected') return true
  } catch (_) {
    /* noop */
  }
  return false
}

/** Heal stuck state only — safe to call after mouse is already up. */
export function releaseDrag(editor) {
  if (!editor) return
  const em = editor.getModel?.() || editor.em

  try {
    const cmd = editor.Commands?.get?.('core:component-drag')
    if (cmd?.dragger && editor.Commands?.isActive?.('core:component-drag')) {
      try {
        cmd.dragger.docs = []
        cmd.dragger.stop(new MouseEvent('mouseup', { bubbles: true }))
      } catch (_) {
        /* noop */
      }
      try {
        editor.stopCommand('core:component-drag', { force: true })
      } catch (_) {
        try {
          editor.stopCommand('core:component-drag')
        } catch (__) {
          /* noop */
        }
      }
    }
  } catch (_) {
    /* noop */
  }

  try {
    const move = editor.Commands?.get?.('move-comp')
    if (typeof move?.endDrag === 'function') move.endDrag()
  } catch (_) {
    /* noop */
  }

  try {
    const selected = editor.getSelected?.()
    const selectedId = selected?.getId?.()
    const wrapper = editor.getWrapper?.()
    if (wrapper) walkUnfreeze(wrapper, selectedId)
  } catch (_) {
    /* noop */
  }

  try {
    const ppfx = editor.getConfig?.()?.stylePrefix || 'gjs-'
    editor.Canvas?.getBody?.()?.classList?.remove(`${ppfx}is__grabbing`)
    document.body.classList.remove(`${ppfx}is__grabbing`)
    document.body.classList.remove('tc-is-dragging')
    document.body.classList.remove('tc-canvas-drop-over')
    document.querySelectorAll('.tc-drag-preview').forEach((el) => el.remove())
    document.querySelectorAll('.tc-blocks-mount .gjs-block.__dragging').forEach((el) => {
      el.classList.remove('__dragging')
    })
    editor.Canvas?.stopAutoscroll?.()
  } catch (_) {
    /* noop */
  }

  // Restore normal select/drag only if Grapes left stopDefault hanging
  try {
    if (em && em.defaultRunning === false && typeof em.runDefault === 'function') {
      em.runDefault(PRESERVE)
    }
  } catch (_) {
    /* noop */
  }
}

/**
 * After pointer is up, wait a tick. If still frozen, heal.
 * Does NOT touch the editor during an active drag.
 */
export function setupDragUnstick(editor) {
  let alive = true
  let healTimer = null
  let buttonsDown = false

  const scheduleHeal = () => {
    if (healTimer) clearTimeout(healTimer)
    // Wait long enough for Grapes' own mouseup/drag:end to finish first
    healTimer = setTimeout(() => {
      if (!alive) return
      if (buttonsDown) return
      if (!isStuck(editor)) return
      releaseDrag(editor)
    }, 120)
  }

  const onDown = () => {
    buttonsDown = true
    if (healTimer) {
      clearTimeout(healTimer)
      healTimer = null
    }
  }

  const onUp = () => {
    buttonsDown = false
    scheduleHeal()
  }

  // Parent document (release over sidebar / props)
  document.addEventListener('pointerdown', onDown, true)
  document.addEventListener('pointerup', onUp, true)
  document.addEventListener('pointercancel', onUp, true)
  document.addEventListener('mouseup', onUp, true)
  document.addEventListener('touchend', onUp, true)
  document.addEventListener('touchcancel', onUp, true)
  window.addEventListener('blur', onUp, true)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onUp()
  })

  // Canvas iframe — attach when frame is ready
  const bindFrame = () => {
    try {
      const frameDoc = editor.Canvas?.getFrameEl?.()?.contentDocument
      if (!frameDoc || frameDoc.__tcDragHeal) return
      frameDoc.__tcDragHeal = true
      frameDoc.addEventListener('pointerdown', onDown, true)
      frameDoc.addEventListener('pointerup', onUp, true)
      frameDoc.addEventListener('pointercancel', onUp, true)
      frameDoc.addEventListener('mouseup', onUp, true)
      frameDoc.addEventListener('touchend', onUp, true)
      frameDoc.addEventListener('touchcancel', onUp, true)
    } catch (_) {
      /* noop */
    }
  }

  editor.on('canvas:frame:load', bindFrame)
  editor.on('load', () => {
    setTimeout(bindFrame, 100)
    setTimeout(() => {
      if (alive && isStuck(editor)) releaseDrag(editor)
    }, 200)
  })
  setTimeout(bindFrame, 300)

  // Also heal when Grapes reports drag end but freezed/grabbing leaked
  const onGrapesDragEnd = () => scheduleHeal()
  editor.on('component:drag:end', onGrapesDragEnd)
  editor.on('block:drag:stop', onGrapesDragEnd)

  // Escape always frees a stuck cursor
  const onKey = (ev) => {
    if (!alive || ev.key !== 'Escape') return
    releaseDrag(editor)
  }
  window.addEventListener('keydown', onKey, true)

  return () => {
    alive = false
    if (healTimer) clearTimeout(healTimer)
    document.removeEventListener('pointerdown', onDown, true)
    document.removeEventListener('pointerup', onUp, true)
    document.removeEventListener('pointercancel', onUp, true)
    document.removeEventListener('mouseup', onUp, true)
    document.removeEventListener('touchend', onUp, true)
    document.removeEventListener('touchcancel', onUp, true)
    window.removeEventListener('blur', onUp, true)
    window.removeEventListener('keydown', onKey, true)
    try {
      editor.off('component:drag:end', onGrapesDragEnd)
      editor.off('block:drag:stop', onGrapesDragEnd)
    } catch (_) {
      /* noop */
    }
  }
}

export const forceEndComponentDrag = releaseDrag
export const unfreezeEditorComponents = releaseDrag
