import { memo } from 'react'
import { X } from 'lucide-react'
import IconButton from './IconButton'

function Panel({ title, children, className = '', headerAction, onClose }) {
  return (
    <aside className={`shrink-0 border-border bg-bg-elevated flex flex-col h-full min-h-0 ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 shrink-0">
          <h2 className="text-sm font-semibold text-fg font-display truncate">{title}</h2>
          <div className="flex items-center gap-1 shrink-0">
            {headerAction}
            {onClose && (
              <IconButton onClick={onClose} aria-label="Close panel" className="lg:hidden">
                <X className="w-4 h-4" />
              </IconButton>
            )}
          </div>
        </div>
      )}
      {children}
    </aside>
  )
}

export default memo(Panel)
