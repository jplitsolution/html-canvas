import { memo } from 'react'
import { getBlock } from '../registry/index'

function DragOverlayContent({ activeId, layout }) {
  let type = null
  let label = ''

  if (typeof activeId === 'string' && activeId.startsWith('toolbox-')) {
    type = activeId.replace('toolbox-', '')
    const info = getBlock(type)
    label = info?.label || type
  } else {
    const block = layout.find((b) => b.id === activeId)
    if (block) {
      type = block.type
      label = getBlock(type)?.label || type
    }
  }

  if (!type) return null

  const info = getBlock(type)
  const Icon = info?.icon

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-accent bg-bg-elevated shadow-xl">
      {Icon && (
        <div className="p-2 rounded-md bg-accent-muted text-accent">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <span className="text-sm font-medium text-fg">{label}</span>
    </div>
  )
}

export default memo(DragOverlayContent)
