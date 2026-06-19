import { useEffect, useCallback } from 'react'
import useStore from '../store/useStore'

export function useKeyboardShortcuts() {
  const saveProject = useStore((s) => s.saveProject)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const duplicateBlock = useStore((s) => s.duplicateBlock)
  const duplicateMultiple = useStore((s) => s.duplicateMultiple)
  const removeBlock = useStore((s) => s.removeBlock)
  const deleteMultiple = useStore((s) => s.deleteMultiple)
  const deselectAll = useStore((s) => s.deselectAll)
  const moveMultiple = useStore((s) => s.moveMultiple)
  const setShowShortcutsModal = useStore((s) => s.setShowShortcutsModal)
  const selectedBlockId = useStore((s) => s.selectedBlockId)
  const selectedBlocks = useStore((s) => s.selectedBlocks)

  const handleKeyDown = useCallback((e) => {
    const target = e.target
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.tagName === 'SELECT' ||
                    target.isContentEditable ||
                    target.closest('[contenteditable="true"]')

    const isShortcut = (e.ctrlKey || e.metaKey) && ['z', 'y', 's'].includes(e.key.toLowerCase())

    if (e.key === '?' && !isInput) {
      e.preventDefault()
      setShowShortcutsModal(true)
      return
    }

    if (e.key === 'Escape') {
      if (isInput) {
        target.blur()
        return
      }
      deselectAll()
      return
    }

    if (isInput && !isShortcut) return

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      saveProject()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      redo()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault()
      if (selectedBlocks.length > 1) duplicateMultiple()
      else if (selectedBlockId) duplicateBlock(selectedBlockId)
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedBlocks.length > 1) deleteMultiple()
      else if (selectedBlockId) removeBlock(selectedBlockId)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveMultiple('up')
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveMultiple('down')
    }
  }, [saveProject, undo, redo, duplicateBlock, duplicateMultiple, removeBlock, deleteMultiple, deselectAll, moveMultiple, setShowShortcutsModal, selectedBlockId, selectedBlocks])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
