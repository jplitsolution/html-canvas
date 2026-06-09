import { memo } from 'react'

const variants = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50',
  secondary: 'bg-bg-subtle text-fg hover:bg-bg-muted border border-border',
  ghost: 'text-fg-muted hover:text-fg hover:bg-bg-subtle',
  danger: 'bg-danger text-danger-fg hover:bg-danger-hover',
  outline: 'border border-border text-fg hover:bg-bg-subtle',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-6 py-2.5 text-sm rounded-lg',
}

function Button({
  children, variant = 'secondary', size = 'md', className = '',
  disabled, type = 'button', ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default memo(Button)
