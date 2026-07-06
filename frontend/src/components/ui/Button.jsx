import { memo } from 'react'

const variants = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50',
  secondary: 'bg-bg-muted text-fg hover:bg-bg-subtle border border-border',
  ghost: 'text-fg-muted hover:text-fg hover:bg-bg-muted',
  danger: 'bg-danger text-danger-fg hover:bg-danger-hover disabled:opacity-50',
  outline: 'border border-border text-fg hover:bg-bg-subtle hover:border-border-strong bg-bg-elevated',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

function Button({
  children, variant = 'secondary', size = 'md', className = '',
  disabled, type = 'button', ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors duration-150 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default memo(Button)
