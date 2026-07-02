import { memo } from 'react'

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center">
      {Icon && (
        <div className="mb-4 p-4 rounded-xl bg-accent-muted text-accent">
          <Icon className="w-8 h-8" />
        </div>
      )}
      {title && <p className="text-sm font-semibold text-fg font-display">{title}</p>}
      {description && <p className="text-xs text-fg-muted mt-1.5 max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export default memo(EmptyState)
