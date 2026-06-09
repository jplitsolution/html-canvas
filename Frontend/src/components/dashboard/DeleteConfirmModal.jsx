import { memo } from 'react'
import Modal from '../common/Modal'
import Button from '../ui/Button'

function DeleteConfirmModal({ isOpen, onClose, onConfirm, projectTitle }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Project" size="sm">
      <p className="text-sm text-fg-muted mb-6 leading-relaxed">
        Are you sure you want to delete <strong className="text-fg">{projectTitle}</strong>? This action cannot be undone.
      </p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>Delete</Button>
      </div>
    </Modal>
  )
}

export default memo(DeleteConfirmModal)
