import { memo } from 'react'
import Modal from '../components/common/Modal'
import useStore from '../store/useStore'
import Button from '../components/ui/Button'

function RecoveryDialog() {
  const show = useStore((s) => s.showRecoveryDialog)
  const pendingDraft = useStore((s) => s.pendingDraft)
  const restoreDraft = useStore((s) => s.restoreDraft)
  const discardDraft = useStore((s) => s.discardDraft)

  if (!show) return null

  return (
    <Modal isOpen={show} onClose={discardDraft} title="Recover Unsaved Changes" size="sm">
      <p className="text-sm text-fg-muted mb-2">
        A draft from {pendingDraft?.savedAt ? new Date(pendingDraft.savedAt).toLocaleString() : 'recent session'} was found.
      </p>
      <p className="text-sm text-fg-subtle mb-6">Would you like to restore your unsaved edits?</p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={discardDraft}>Discard</Button>
        <Button variant="primary" onClick={restoreDraft}>Restore</Button>
      </div>
    </Modal>
  )
}

export default memo(RecoveryDialog)
