import { memo } from 'react'

function Panel({ title, children, className = '', headerAction }) {
  return (
    <aside className={`shrink-0 border-border bg-bg-elevated flex flex-col h-full ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg font-display">{title}</h2>
          {headerAction}
        </div>
      )}
      {children}
    </aside>
  )
}

export default memo(Panel)
