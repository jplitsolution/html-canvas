import { memo } from 'react'
import { Copy, Trash2, Grid3x3 } from 'lucide-react'
import useStore from '../store/useStore'
import IconButton from '../components/ui/IconButton'

function BulkToolbar() {
  const selectedBlocks = useStore((s) => s.selectedBlocks)
  const duplicateMultiple = useStore((s) => s.duplicateMultiple)
  const deleteMultiple = useStore((s) => s.deleteMultiple)
  const wrapInContainer = useStore((s) => s.wrapInContainer)

  if (selectedBlocks.length < 2) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 glass rounded-xl shadow-lg animate-slide-up" role="toolbar" aria-label="Bulk actions">
      <span className="text-sm font-medium text-fg mr-2">{selectedBlocks.length} selected</span>
      <IconButton onClick={duplicateMultiple} title="Duplicate" aria-label="Duplicate selected">
        <Copy className="w-4 h-4" />
      </IconButton>
      <IconButton onClick={deleteMultiple} className="!text-danger hover:!bg-danger-muted" title="Delete" aria-label="Delete selected">
        <Trash2 className="w-4 h-4" />
      </IconButton>
      <IconButton onClick={wrapInContainer} title="Wrap in Container" aria-label="Wrap in container">
        <Grid3x3 className="w-4 h-4" />
      </IconButton>
    </div>
  )
}

export default memo(BulkToolbar)
