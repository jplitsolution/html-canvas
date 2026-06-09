import { memo } from 'react'
import Modal from '../components/common/Modal'

const SHORTCUTS = [
  { keys: 'Ctrl + S', action: 'Save project' },
  { keys: 'Ctrl + Z', action: 'Undo' },
  { keys: 'Ctrl + Shift + Z / Ctrl + Y', action: 'Redo' },
  { keys: 'Ctrl + D', action: 'Duplicate block' },
  { keys: 'Delete', action: 'Delete block' },
  { keys: 'Escape', action: 'Deselect' },
  { keys: 'Arrow Up / Down', action: 'Move block' },
  { keys: 'Shift + Click', action: 'Multi select' },
  { keys: '?', action: 'Show shortcuts' },
]

function ShortcutsModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="md">
      <div className="space-y-2">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm text-fg-muted">{s.action}</span>
            <kbd className="px-2 py-1 text-xs font-mono bg-bg-subtle border border-border rounded-md text-fg">{s.keys}</kbd>
          </div>
        ))}
      </div>
    </Modal>
  )
}

export default memo(ShortcutsModal)
