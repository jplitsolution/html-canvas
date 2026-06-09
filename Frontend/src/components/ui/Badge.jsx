import { memo } from 'react'

const variants = {
  default: 'bg-bg-subtle text-fg-muted border border-border',
  success: 'bg-success-muted text-success-fg border border-success/20',
  warning: 'bg-warning-muted text-warning-fg border border-warning/20',
  primary: 'bg-accent-muted text-accent border border-accent/20',
}

function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

export default memo(Badge)
