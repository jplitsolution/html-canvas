import { memo } from 'react'

const variants = {
  primary: 'bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-white hover:-translate-y-[4px] hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50',
  secondary: 'bg-bg-subtle text-fg hover:-translate-y-[4px] border border-border hover:border-border-strong hover:shadow-md',
  ghost: 'text-fg-muted hover:text-fg hover:bg-bg-subtle hover:-translate-y-[2px]',
  danger: 'bg-danger text-danger-fg hover:-translate-y-[4px] hover:bg-danger-hover hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]',
  outline: 'border border-border text-fg hover:-translate-y-[4px] hover:bg-bg-subtle hover:border-border-strong hover:shadow-sm',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
}

function Button({
  children, variant = 'secondary', size = 'md', className = '',
  disabled, type = 'button', ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-220 ease-[cubic-bezier(0.2,0,0,1)] disabled:cursor-not-allowed rounded-lg ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default memo(Button)
